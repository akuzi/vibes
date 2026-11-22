// Spoken commentary for the Openings trainer. Uses the OpenAI-backed /api/tts
// route when it works, and falls back to the browser's speechSynthesis.

const PIECE_NAMES: Record<string, string> = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight' };
const ANNOTATIONS: Record<string, string> = {
  '??': ', a blunder',
  '?': ', a mistake',
  '?!': ', dubious',
  '!?': ', interesting',
  '!': '',
  '!!': ', brilliant',
};

const SAN_RE =
  /(?:\.\.\.|…)?\b(O-O-O|O-O|([KQRBN])([a-h]?[1-8]?)(x?)([a-h][1-8])|([a-h])(x)([a-h][1-8])|([a-h][1-8]))(=[QRBN])?([+#])?([!?]{1,2})?/g;

/**
 * "Nxe5?" → "knight takes e5, a mistake". Annotations are only voiced for a
 * move that opens the text; inside a sentence they'd break up the prose.
 */
export function spokenSan(text: string): string {
  return text.replace(SAN_RE, (...g: string[]) => {
    const [, body, piece, from, pieceTakes, pieceTo, pawnFile, , pawnTo, pawnPush, promo, check, note] = g;
    const offset = g[g.length - 2] as unknown as number;
    let words: string;
    if (body === 'O-O') words = 'castles kingside';
    else if (body === 'O-O-O') words = 'castles queenside';
    else if (piece) words = `${PIECE_NAMES[piece]}${from ? ' ' + from : ''}${pieceTakes ? ' takes' : ''} ${pieceTo}`;
    else if (pawnFile) words = `${pawnFile} takes ${pawnTo}`;
    else words = pawnPush;
    if (promo) words += ` promotes to ${PIECE_NAMES[promo[1]]}`;
    if (check === '+') words += ', check';
    if (check === '#') words += ', checkmate';
    if (note && offset === 0) words += ANNOTATIONS[note] ?? '';
    return words;
  });
}

const toSpeech = (text: string) =>
  spokenSan(text)
    .replace(/\s+—\s+/g, '. ')
    .replace(/[✓★→↵]/g, '')
    .trim();

const VOICE = 'fable';

class Narrator {
  enabled = true;
  lastText = '';
  private queue: string[] = [];
  private current = '';
  private playing = false;
  private quietSince = 0;
  private generation = 0;
  private audio: HTMLAudioElement | null = null;
  private browserOnly = false;
  private cache = new Map<string, Promise<string | null>>();

  private fetchAudio(spoken: string): Promise<string | null> {
    let hit = this.cache.get(spoken);
    if (!hit) {
      hit = fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spoken, voice: VOICE }),
      })
        .then((r) => r.json())
        .then((data: { audioBase64?: string }) => {
          if (!data.audioBase64) throw new Error('no audio');
          const bytes = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
          return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
        })
        .catch(() => {
          // Don't keep hammering a route that isn't configured.
          this.browserOnly = true;
          this.cache.delete(spoken);
          return null;
        });
      this.cache.set(spoken, hit);
    }
    return hit;
  }

  /** Warm the cache for something likely to be said next. */
  prefetch(text: string) {
    if (this.enabled && !this.browserOnly && text) void this.fetchAudio(toSpeech(text));
  }

  /** Speak text. `interrupt` cuts off anything already playing or queued. */
  say(text: string, { interrupt = true }: { interrupt?: boolean } = {}) {
    if (!this.enabled || !text) return;
    const spoken = toSpeech(text);
    if (interrupt) this.stop();
    else if (spoken === this.current || this.queue.includes(spoken)) return;
    this.lastText = text;
    this.queue.push(spoken);
    if (!this.playing) void this.next();
  }

  /**
   * True while speaking and briefly after, so a listening microphone can
   * ignore the narrator's own voice.
   */
  isBusy() {
    return this.playing || Date.now() - this.quietSince < 900;
  }

  replay() {
    if (this.lastText) this.say(this.lastText);
  }

  stop() {
    this.generation++;
    this.queue = [];
    this.current = '';
    if (this.playing) this.quietSince = Date.now();
    this.playing = false;
    this.audio?.pause();
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  private async next() {
    const spoken = this.queue.shift();
    if (!spoken) {
      this.playing = false;
      this.current = '';
      this.quietSince = Date.now();
      return;
    }
    this.playing = true;
    this.current = spoken;
    const gen = this.generation;
    const url = this.browserOnly ? null : await this.fetchAudio(spoken);
    if (gen !== this.generation) return;
    await (url ? this.playUrl(url) : this.speakBrowser(spoken));
    if (gen !== this.generation) return;
    void this.next();
  }

  private playUrl(url: string) {
    return new Promise<void>((resolve) => {
      this.audio ??= new Audio();
      const audio = this.audio;
      const done = () => {
        audio.removeEventListener('ended', done);
        audio.removeEventListener('pause', done);
        audio.removeEventListener('error', done);
        resolve();
      };
      audio.addEventListener('ended', done);
      audio.addEventListener('pause', done);
      audio.addEventListener('error', done);
      audio.src = url;
      audio.play().catch(done);
    });
  }

  private speakBrowser(spoken: string) {
    return new Promise<void>((resolve) => {
      if (typeof speechSynthesis === 'undefined') return resolve();
      const u = new SpeechSynthesisUtterance(spoken);
      const voices = speechSynthesis.getVoices();
      u.voice =
        voices.find((v) => /en-GB/i.test(v.lang) && /Daniel|Google UK English Male|Serena/i.test(v.name)) ??
        voices.find((v) => v.lang.startsWith('en')) ??
        null;
      u.rate = 1.02;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }
}

export const narrator = new Narrator();
