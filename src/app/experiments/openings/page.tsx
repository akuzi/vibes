'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Board, { type Arrow } from '@/components/openings/Board';
import { speechInputSupported, useSpeechInput } from '@/components/openings/useSpeechInput';
import {
  applyMove,
  initialPosition,
  moveFromSan,
  playLine,
  sameSan,
  squareName,
  type Move,
  type Position,
} from '@/lib/chess';
import { narrator } from '@/lib/narrator';
import { OPENINGS, openingById, type Opening, type OpeningLine } from '@/lib/openings';
import { matchSpokenName, parseCommand, parseSpokenMove, type VoiceCommand } from '@/lib/voice-moves';

type Mode = 'learn' | 'drill' | 'punish' | 'quiz';

interface LineStats {
  runs: number;
  clean: number;
}
type Progress = Record<string, LineStats>;

const PROGRESS_KEY = 'openings-progress-v1';
const MASTERED_AT = 3;

const statKey = (o: Opening, l: OpeningLine) => `${o.id}:${l.id}`;

function loadProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------------------------------------------ sound */

let audioCtx: AudioContext | null = null;
function playTone(kind: 'move' | 'capture' | 'wrong' | 'done') {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const notes: Record<typeof kind, [number, number][]> = {
      move: [[520, 0]],
      capture: [[380, 0]],
      wrong: [[200, 0], [150, 0.09]],
      done: [[523, 0], [659, 0.09], [784, 0.18]],
    };
    for (const [freq, at] of notes[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === 'wrong' ? 'sawtooth' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.18, now + at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.16);
    }
  } catch {
    /* audio unavailable */
  }
}

/* ---------------------------------------------------------------- helpers */

function positionsFor(moves: Move[]): Position[] {
  const out = [initialPosition()];
  for (const m of moves) out.push(applyMove(out[out.length - 1], m));
  return out;
}

function MoveList({
  moves,
  cursor,
  onJump,
  mistakes,
}: {
  moves: string[];
  cursor: number;
  onJump?: (ply: number) => void;
  mistakes?: Set<number>;
}) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    const cell = (ply: number) =>
      ply < moves.length ? (
        <button
          onClick={() => onJump?.(ply + 1)}
          disabled={!onJump}
          className={`text-left px-2 py-0.5 rounded font-mono ${
            ply === cursor - 1
              ? 'bg-amber-500/25 text-amber-200'
              : ply < cursor
                ? 'text-stone-200'
                : 'text-stone-600'
          } ${onJump ? 'hover:bg-stone-700' : ''} ${mistakes?.has(ply) ? 'underline decoration-rose-400 decoration-2' : ''}`}
        >
          {moves[ply]}
        </button>
      ) : (
        <span />
      );
    rows.push(
      <React.Fragment key={i}>
        <span className="text-stone-500 font-mono text-right pr-1">{i / 2 + 1}.</span>
        {cell(i)}
        {cell(i + 1)}
      </React.Fragment>,
    );
  }
  return <div className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-0.5 text-sm">{rows}</div>;
}

const shuffle = <T,>(xs: T[]) => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ------------------------------------------------------------------- page */

export default function OpeningsPage() {
  const [openingId, setOpeningId] = useState(OPENINGS[0].id);
  const [lineId, setLineId] = useState<string>(OPENINGS[0].lines[0].id);
  const [mode, setMode] = useState<Mode>('learn');
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState<Progress>({});

  const [voiceOn, setVoiceOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [micSupported, setMicSupported] = useState(false);

  useEffect(() => setMicSupported(speechInputSupported()), []);

  useEffect(() => setProgress(loadProgress()), []);
  useEffect(() => {
    try {
      setVoiceOn(localStorage.getItem('openings-voice') !== 'off');
    } catch {
      /* storage unavailable */
    }
  }, []);
  useEffect(() => {
    narrator.enabled = voiceOn;
    if (!voiceOn) narrator.stop();
  }, [voiceOn]);
  useEffect(() => () => narrator.stop(), []);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    try {
      localStorage.setItem('openings-voice', next ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
  };

  const opening = openingById(openingId)!;
  const line = opening.lines.find((l) => l.id === lineId) ?? opening.lines[0];
  const mixAll = lineId === 'all';

  const recordRun = useCallback((o: Opening, l: OpeningLine, clean: boolean) => {
    setProgress((prev) => {
      const key = statKey(o, l);
      const cur = prev[key] ?? { runs: 0, clean: 0 };
      const next = { ...prev, [key]: { runs: cur.runs + 1, clean: cur.clean + (clean ? 1 : 0) } };
      saveProgress(next);
      return next;
    });
  }, []);

  const selectOpening = (o: Opening) => {
    setOpeningId(o.id);
    setLineId(o.lines[0].id);
    setFlipped(false);
    if (mode === 'quiz' || mode === 'punish') setMode('learn');
  };

  const masteredCount = OPENINGS.reduce(
    (n, o) => n + o.lines.filter((l) => (progress[statKey(o, l)]?.clean ?? 0) >= MASTERED_AT).length,
    0,
  );
  const totalLines = OPENINGS.reduce((n, o) => n + o.lines.length, 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#2b2118,_#120e0b_70%)] text-stone-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-800/80">
        <div className="flex items-baseline gap-4">
          <Link href="/" className="text-stone-500 hover:text-stone-300 text-sm font-mono">
            ← vibes
          </Link>
          <h1 className="text-2xl font-serif tracking-wide text-amber-100">
            Openings
          </h1>
          <span className="hidden sm:inline text-stone-500 text-sm italic">learn the first moves that matter</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-stone-400">
          <span>
            <span className="text-amber-300 font-semibold">{masteredCount}</span> / {totalLines} lines mastered
          </span>
          <button
            onClick={toggleVoice}
            title={voiceOn ? 'Mute the commentary' : 'Speak the commentary'}
            className={`px-3 py-1 rounded-full ring-1 transition ${
              voiceOn ? 'ring-amber-700/70 text-amber-200 bg-amber-900/30' : 'ring-stone-700 text-stone-500'
            }`}
          >
            {voiceOn ? '🔊 Voice on' : '🔇 Voice off'}
          </button>
          <button
            onClick={() => setMicOn(!micOn)}
            disabled={!micSupported}
            title={
              micSupported
                ? 'Play by voice: say moves like "knight f3" or "castles"'
                : 'Speech recognition is not supported in this browser (try Chrome or Edge)'
            }
            className={`px-3 py-1 rounded-full ring-1 transition disabled:opacity-40 disabled:cursor-not-allowed ${
              micOn ? 'ring-rose-600/80 text-rose-100 bg-rose-900/40' : 'ring-stone-700 text-stone-500 hover:text-stone-300'
            }`}
          >
            {micOn ? '🎙 Speaking moves' : '🎙 Speak moves'}
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1400px] mx-auto">
        {/* Opening picker */}
        <aside className="lg:w-64 shrink-0 space-y-5">
          <div className="flex rounded-lg bg-stone-900/80 p-1 ring-1 ring-stone-800">
            {(['learn', 'drill', 'punish', 'quiz'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  if (m !== 'drill' && lineId === 'all') setLineId(opening.lines[0].id);
                }}
                className={`flex-1 py-1.5 rounded-md text-[13px] capitalize transition ${
                  mode === m ? 'bg-amber-600 text-stone-950 font-semibold' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {m === 'quiz' ? 'Name it' : m}
              </button>
            ))}
          </div>

          {(['w', 'b'] as const).map((side) => (
            <div key={side}>
              <h2 className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">
                Play as {side === 'w' ? 'White' : 'Black'}
              </h2>
              <ul className="space-y-1">
                {OPENINGS.filter((o) => o.side === side).map((o) => {
                  const active = o.id === openingId && (mode === 'learn' || mode === 'drill');
                  return (
                    <li key={o.id}>
                      <button
                        onClick={() => selectOpening(o)}
                        className={`w-full text-left px-3 py-2 rounded-md transition flex items-center justify-between gap-2 ${
                          active ? 'bg-stone-800 ring-1 ring-amber-700/60' : 'hover:bg-stone-900'
                        }`}
                      >
                        <span className={active ? 'text-amber-100' : 'text-stone-300'}>{o.name}</span>
                        <span className="flex gap-1">
                          {o.lines.map((l) => {
                            const clean = progress[statKey(o, l)]?.clean ?? 0;
                            return (
                              <span
                                key={l.id}
                                title={`${l.name}: ${clean} clean run${clean === 1 ? '' : 's'}`}
                                className={`w-1.5 h-1.5 ${l.deviation !== undefined ? 'rotate-45' : 'rounded-full'} ${
                                  clean >= MASTERED_AT ? 'bg-amber-400' : clean > 0 ? 'bg-amber-700' : 'bg-stone-700'
                                }`}
                              />
                            );
                          })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </aside>

        {mode === 'quiz' ? (
          <Quiz micOn={micOn} />
        ) : mode === 'punish' ? (
          <Punish progress={progress} recordRun={recordRun} micOn={micOn} />
        ) : lineId === 'offbook' ? (
          <OffBookSet
            key={`${mode}:${openingId}`}
            practice={mode === 'learn'}
            opening={opening}
            setLineId={setLineId}
            flipped={flipped}
            setFlipped={setFlipped}
            progress={progress}
            recordRun={recordRun}
            micOn={micOn}
            onSwitchMode={() => setMode(mode === 'learn' ? 'drill' : 'learn')}
          />
        ) : (
          <Trainer
            key={`${mode}:${openingId}:${lineId}`}
            mode={mode}
            opening={opening}
            line={line}
            mixAll={mixAll}
            lineId={lineId}
            setLineId={setLineId}
            flipped={flipped}
            setFlipped={setFlipped}
            progress={progress}
            recordRun={recordRun}
            micOn={micOn}
          />
        )}
      </div>
    </main>
  );
}

/* ---------------------------------------------------------- learn / drill */

interface TrainerProps {
  mode: 'learn' | 'drill';
  opening: Opening;
  line: OpeningLine;
  mixAll: boolean;
  lineId: string;
  setLineId: (id: string) => void;
  flipped: boolean;
  setFlipped: (f: boolean) => void;
  progress: Progress;
  recordRun: (o: Opening, l: OpeningLine, clean: boolean) => void;
  /** Puzzle mode: start the drill just after the opponent's off-book move. */
  puzzle?: PuzzleOptions;
  micOn: boolean;
}

interface PuzzleOptions {
  onNext: () => void;
  nextLabel?: string;
  /** Shown above the opening summary, e.g. "Off-book test · 2 of 4". */
  label?: string;
  /** Practice: the arrow appears after one miss and nothing is scored. */
  practice?: boolean;
  /** Keep the opening's line list visible (so you can leave the set). */
  showLines?: boolean;
  onFinish?: (clean: boolean) => void;
}

type Feedback = { kind: 'good' | 'bad' | 'warn' | 'info' | 'done'; text: string } | null;

const offBookText = (l: OpeningLine) =>
  `${l.moves[l.deviation!]} — off book! ${l.notes[l.deviation!] ?? ''} How do you punish it?`;

function Trainer({
  mode,
  opening,
  line,
  mixAll,
  lineId,
  setLineId,
  flipped,
  setFlipped,
  progress,
  recordRun,
  puzzle,
  micOn,
}: TrainerProps) {
  const side = opening.side;
  const orientation = flipped ? (side === 'w' ? 'b' : 'w') : side;

  // Learn mode works on the full line; drill builds up the game as it's played.
  const full = useMemo(() => playLine(line.moves), [line]);
  const [cursor, setCursor] = useState(0);
  const startMoves = useMemo(
    () => (puzzle && line.deviation !== undefined ? playLine(line.moves.slice(0, line.deviation + 1)).moves : []),
    [puzzle, line],
  );
  const startFeedback: Feedback = puzzle && line.deviation !== undefined ? { kind: 'warn', text: offBookText(line) } : null;
  const [played, setPlayed] = useState<Move[]>(startMoves);
  const [wrongTries, setWrongTries] = useState(0);
  const [mistakePlies, setMistakePlies] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(startFeedback);
  const [flash, setFlash] = useState<{ square: number; color: string } | null>(null);
  const [finished, setFinished] = useState<OpeningLine | null>(null);
  const [runId, setRunId] = useState(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drillPositions = useMemo(() => positionsFor(played), [played]);
  const position = mode === 'learn' ? full.positions[cursor] : drillPositions[drillPositions.length - 1];
  const history = mode === 'learn' ? full.moves.slice(0, cursor) : played;
  const lastMove = history.length ? history[history.length - 1] : null;

  // Lines still consistent with what's been played in the drill.
  const candidates = useMemo(() => {
    const pool = mixAll ? opening.lines : [line];
    return pool.filter(
      (l) => l.moves.length >= played.length && played.every((m, i) => sameSan(m.san, l.moves[i])),
    );
  }, [mixAll, opening, line, played]);

  const flashSquare = (square: number, color: string) => {
    setFlash({ square, color });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 450);
  };
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const notesFor = (l: OpeningLine, ply: number) => l.notes[ply];

  /* ----- drill: opponent replies ----- */
  useEffect(() => {
    if (mode !== 'drill' || finished) return;
    const ended = candidates.find((l) => l.moves.length === played.length);
    if (ended) {
      const clean = mistakePlies.size === 0;
      setFinished(ended);
      if (!puzzle?.practice) recordRun(opening, ended, clean);
      puzzle?.onFinish?.(clean);
      playTone('done');
      setFeedback({
        kind: 'done',
        text: puzzle?.practice
          ? `That's how to meet ${ended.moves[ended.deviation!]} in the ${opening.name}.`
          : puzzle
          ? clean
            ? `Punished! That's the ${ended.name} in the ${opening.name}.`
            : `Solved with ${mistakePlies.size} slip${mistakePlies.size === 1 ? '' : 's'} — ${ended.name}, ${opening.name}.`
          : clean
          ? `Flawless! You played the ${ended.name} from memory.`
          : `Line complete with ${mistakePlies.size} slip${mistakePlies.size === 1 ? '' : 's'}. Go again for a clean run.`,
      });
      return;
    }
    if (position.turn === side || !candidates.length) return;
    const t = setTimeout(() => {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      const move = moveFromSan(position, pick.moves[played.length]);
      if (!move) return;
      playTone(move.captured ? 'capture' : 'move');
      if (pick.deviation === played.length) setFeedback({ kind: 'warn', text: offBookText(pick) });
      else narrator.say(move.san, { interrupt: false });
      setPlayed((p) => [...p, move]);
    }, 550);
    return () => clearTimeout(t);
  }, [mode, finished, candidates, played, position, side, opening, recordRun, mistakePlies, puzzle]);

  useEffect(() => {
    if (mode === 'learn') setFeedback(null);
  }, [mode, cursor]);

  /* ----- narration ----- */
  useEffect(() => {
    if (mode !== 'learn') return;
    const spoken = (c: number) =>
      c > 0 && c <= line.moves.length
        ? line.moves[c - 1] + (line.notes[c - 1] ? ` — ${line.notes[c - 1]}` : '')
        : '';
    if (cursor > 0) narrator.say(spoken(cursor));
    else narrator.stop();
    narrator.prefetch(spoken(cursor + 1));
  }, [mode, cursor, line]);

  useEffect(() => {
    if (!feedback) return;
    // Reactions to the player's own move cut in; everything else waits its turn.
    narrator.say(feedback.text, { interrupt: feedback.kind === 'good' || feedback.kind === 'bad' });
  }, [feedback]);

  /* ----- learn: keyboard stepping ----- */
  useEffect(() => {
    if (mode !== 'learn') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setCursor((c) => Math.min(c + 1, full.moves.length));
      if (e.key === 'ArrowLeft') setCursor((c) => Math.max(c - 1, 0));
      if (e.key === 'Home') setCursor(0);
      if (e.key === 'End') setCursor(full.moves.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, full.moves.length]);

  const expectedSans = useMemo(
    () => [...new Set(candidates.map((l) => l.moves[played.length]).filter(Boolean))],
    [candidates, played.length],
  );

  useEffect(() => {
    if (mode !== 'drill' || position.turn !== side) return;
    for (const l of candidates) {
      const note = l.notes[played.length];
      const m = l.moves[played.length] && moveFromSan(position, l.moves[played.length]);
      if (m) narrator.prefetch(note ? `${m.san} — ${note}` : `${m.san} ✓`);
    }
  }, [mode, position, side, candidates, played.length]);

  const onUserMove = (move: Move) => {
    if (mode === 'learn') {
      const next = full.moves[cursor];
      if (next && sameSan(next.san, move.san)) {
        playTone(move.captured ? 'capture' : 'move');
        setCursor(cursor + 1);
        setFeedback(null);
      } else {
        playTone('wrong');
        flashSquare(move.to, 'rgba(220, 60, 60, 0.6)');
        setFeedback({ kind: 'bad', text: next ? `The line continues ${next.san}.` : 'End of the line.' });
      }
      return;
    }

    if (finished || position.turn !== side) return;
    if (expectedSans.some((s) => sameSan(s, move.san))) {
      playTone(move.captured ? 'capture' : 'move');
      const note = candidates.map((l) => notesFor(l, played.length)).find(Boolean);
      setFeedback({ kind: 'good', text: note ? `${move.san} — ${note}` : `${move.san} ✓` });
      setPlayed([...played, move]);
      setWrongTries(0);
      setShowHint(false);
    } else {
      playTone('wrong');
      flashSquare(move.to, 'rgba(220, 60, 60, 0.6)');
      const tries = wrongTries + 1;
      setWrongTries(tries);
      setMistakePlies((s) => new Set(s).add(played.length));
      const revealAt = puzzle?.practice ? 1 : 2;
      if (tries >= revealAt) setShowHint(true);
      setFeedback({
        kind: 'bad',
        text: tries >= revealAt ? `Not quite — follow the arrow: ${expectedSans[0]}.` : `${move.san} isn't in the repertoire. Try again.`,
      });
    }
  };

  const restart = () => {
    setPlayed(startMoves);
    setWrongTries(0);
    setMistakePlies(new Set());
    setShowHint(false);
    setFeedback(startFeedback);
    setFinished(null);
    setRunId((r) => r + 1);
  };

  const askHint = () => {
    setShowHint(true);
    setMistakePlies((s) => new Set(s).add(played.length));
  };

  /* ----- playing by voice ----- */
  const [heard, setHeard] = useState<{ said: string; result: string } | null>(null);

  const runCommand = (cmd: VoiceCommand) => {
    if (cmd === 'repeat') narrator.replay();
    if (cmd === 'flip') setFlipped(!flipped);
    if (mode === 'learn') {
      if (cmd === 'next') setCursor((c) => Math.min(c + 1, full.moves.length));
      if (cmd === 'back') setCursor((c) => Math.max(c - 1, 0));
      if (cmd === 'restart') setCursor(0);
      return;
    }
    if (cmd === 'hint' && !finished && position.turn === side && !showHint) askHint();
    if (cmd === 'restart') restart();
    if (cmd === 'next' && finished) {
      if (puzzle) puzzle.onNext();
      else restart();
    }
  };

  const mic = useSpeechInput(micOn, (alternatives) => {
    // Don't let the microphone pick up the narrator reading out moves.
    if (narrator.isBusy() || !alternatives.length) return;
    const said = alternatives[0];
    const cmd = alternatives.map(parseCommand).find(Boolean);
    if (cmd) {
      setHeard({ said, result: cmd });
      runCommand(cmd);
      return;
    }
    const canMoveNow = mode === 'learn' ? cursor < full.moves.length : !finished && position.turn === side;
    if (!canMoveNow) {
      setHeard({ said, result: 'not your move' });
      return;
    }
    let ambiguous: Move[] | null = null;
    for (const alt of alternatives) {
      const r = parseSpokenMove(alt, position);
      if (r.kind === 'move') {
        setHeard({ said: alt, result: r.move.san });
        onUserMove(r.move);
        return;
      }
      if (r.kind === 'ambiguous') ambiguous ??= r.moves;
    }
    if (ambiguous) {
      const froms = ambiguous.map((m) => squareName(m.from));
      setHeard({ said, result: 'which one?' });
      narrator.say(`Which one? From ${froms.join(' or ')}?`);
      return;
    }
    setHeard({ said, result: '?' });
  });

  const arrows: Arrow[] = [];
  if (mode === 'learn' && cursor < full.moves.length) {
    const m = full.moves[cursor];
    const yours = full.positions[cursor].turn === side;
    const color = yours
      ? 'rgba(60, 160, 90, 0.8)'
      : cursor === line.deviation
        ? 'rgba(235, 120, 40, 0.85)'
        : 'rgba(80, 130, 220, 0.75)';
    arrows.push({ from: m.from, to: m.to, color });
  }
  if (mode === 'drill' && showHint && !finished) {
    for (const san of expectedSans) {
      const m = moveFromSan(position, san);
      if (m) arrows.push({ from: m.from, to: m.to, color: 'rgba(60, 160, 90, 0.8)' });
    }
  }

  const userToMove = position.turn === side;
  const movable = mode === 'learn' ? (cursor < full.moves.length ? position.turn : null) : finished ? null : side;

  const learnNote = cursor > 0 ? line.notes[cursor - 1] : null;
  const upcoming = cursor < full.moves.length ? full.moves[cursor] : null;
  const moveNo = (ply: number) => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? '.' : '…'}`;

  let status: string;
  if (mode === 'learn') {
    status = !upcoming
      ? 'End of line — try it in Drill mode.'
      : cursor === line.deviation
        ? `They go off book: ${moveNo(cursor)} ${line.moves[cursor]}`
        : `${full.positions[cursor].turn === side ? 'You play' : 'They play'} ${moveNo(cursor)} ${line.moves[cursor]}`;
  } else if (finished) status = 'Line complete';
  else status = userToMove ? 'Your move' : 'Opponent is thinking…';

  return (
    <>
      <section className="flex-1 flex flex-col items-center min-w-0">
        <div className="w-full max-w-[min(640px,calc(100vh-170px))]">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-mono text-stone-400">
              {status}
            </span>
            <span className="text-stone-500">
              You are {side === 'w' ? 'White' : 'Black'}
            </span>
          </div>
          <Board
            key={runId}
            position={position}
            orientation={orientation}
            movable={movable}
            onMove={onUserMove}
            lastMove={lastMove}
            arrows={arrows}
            flash={flash}
          />
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {mode === 'learn' ? (
              <>
                <CtlButton onClick={() => setCursor(0)} disabled={cursor === 0}>⏮</CtlButton>
                <CtlButton onClick={() => setCursor(Math.max(0, cursor - 1))} disabled={cursor === 0}>◀ Back</CtlButton>
                <CtlButton
                  primary
                  onClick={() => setCursor(Math.min(full.moves.length, cursor + 1))}
                  disabled={cursor === full.moves.length}
                >
                  Next ▶
                </CtlButton>
                <CtlButton onClick={() => setCursor(full.moves.length)} disabled={cursor === full.moves.length}>⏭</CtlButton>
              </>
            ) : (
              <>
                <CtlButton onClick={restart}>↺ Restart</CtlButton>
                <CtlButton onClick={askHint} disabled={!!finished || !userToMove || showHint}>
                  💡 Hint
                </CtlButton>
              </>
            )}
            <CtlButton onClick={() => setFlipped(!flipped)}>⇅ Flip</CtlButton>
          </div>
          {micOn && <MicStatus listening={mic.listening} error={mic.error} heard={heard} />}
        </div>
      </section>

      <aside className="lg:w-80 shrink-0 space-y-4">
        <div className="rounded-xl bg-stone-900/70 ring-1 ring-stone-800 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-serif text-amber-100">{opening.name}</h2>
            <span className="text-xs font-mono text-stone-500">{opening.eco}</span>
          </div>
          <p className="text-sm text-stone-400 mt-2 leading-relaxed">{opening.summary}</p>

          {puzzle?.label && (
            <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-orange-400/90">{puzzle.label}</p>
          )}

          {(!puzzle || puzzle.showLines) && (
          <div className="mt-4 space-y-1">
            {opening.lines.map((l, i) => {
              const s = progress[statKey(opening, l)];
              const firstSideline = l.deviation !== undefined && opening.lines.findIndex((x) => x.deviation !== undefined) === i;
              return (
                <React.Fragment key={l.id}>
                {firstSideline && (
                  <h3 className="pt-3 pb-1 px-1 text-[10px] uppercase tracking-[0.2em] text-orange-400/80">
                    Off book — punish it
                  </h3>
                )}
                <button
                  onClick={() => setLineId(l.id)}
                  className={`w-full flex justify-between items-center px-3 py-1.5 rounded-md text-sm transition ${
                    lineId === l.id ? 'bg-amber-600/20 text-amber-100 ring-1 ring-amber-700/50' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <span className="text-left">{l.name}</span>
                  <span className="text-xs text-stone-500 shrink-0 ml-2">
                    {s ? `${Math.min(s.clean, MASTERED_AT)}/${MASTERED_AT}` : '—'}
                    {(s?.clean ?? 0) >= MASTERED_AT && <span className="ml-1 text-amber-400">★</span>}
                  </span>
                </button>
                </React.Fragment>
              );
            })}
            {opening.lines.some((l) => l.deviation !== undefined) && (
              <button
                onClick={() => setLineId('offbook')}
                className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition ${
                  lineId === 'offbook'
                    ? 'bg-orange-600/20 text-orange-100 ring-1 ring-orange-700/50'
                    : 'text-orange-300/80 hover:bg-stone-800'
                }`}
              >
                🎯 {mode === 'learn' ? 'Practise' : 'Test'} all off-book replies (
                {opening.lines.filter((l) => l.deviation !== undefined).length})
              </button>
            )}
            {mode === 'drill' && opening.lines.length > 1 && (
              <button
                onClick={() => setLineId('all')}
                className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition ${
                  mixAll ? 'bg-amber-600/20 text-amber-100 ring-1 ring-amber-700/50' : 'text-stone-400 hover:bg-stone-800'
                }`}
              >
                🎲 Mixed — opponent picks a line, sometimes off book
              </button>
            )}
          </div>
          )}
        </div>

        {(feedback || (mode === 'learn' && (learnNote || upcoming))) && (
          <div
            className={`relative rounded-xl p-4 pr-11 text-sm leading-relaxed ring-1 ${
              feedback?.kind === 'bad'
                ? 'bg-rose-950/50 ring-rose-800/60 text-rose-100'
                : feedback?.kind === 'warn'
                  ? 'bg-orange-950/50 ring-orange-700/60 text-orange-100'
                : feedback?.kind === 'done'
                  ? 'bg-amber-900/40 ring-amber-600/60 text-amber-100'
                  : feedback?.kind === 'good'
                    ? 'bg-emerald-950/50 ring-emerald-800/60 text-emerald-100'
                    : 'bg-stone-900/70 ring-stone-800 text-stone-300'
            }`}
          >
            <ReplayButton />
            {feedback ? (
              <>
                <p>{feedback.text}</p>
                {feedback.kind === 'done' && (
                  <div className="mt-3 flex gap-2">
                    {puzzle && (
                      <button
                        onClick={puzzle.onNext}
                        className="px-3 py-1.5 rounded-md bg-amber-500 text-stone-950 font-semibold text-sm hover:bg-amber-400"
                      >
                        {puzzle.nextLabel ?? 'Next puzzle →'}
                      </button>
                    )}
                    <button
                      onClick={restart}
                      className={`px-3 py-1.5 rounded-md text-sm ${
                        puzzle
                          ? 'bg-stone-800 text-stone-200 ring-1 ring-stone-700 hover:bg-stone-700'
                          : 'bg-amber-500 text-stone-950 font-semibold hover:bg-amber-400'
                      }`}
                    >
                      {puzzle ? 'Try again' : 'Play again'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {learnNote && (
                  <p>
                    <span className="font-mono text-amber-300">
                      {moveNo(cursor - 1)} {full.moves[cursor - 1].san}
                    </span>{' '}
                    — {learnNote}
                  </p>
                )}
                {!learnNote && upcoming && (
                  <p className="text-stone-400">
                    Play the move on the board or press <kbd className="font-mono text-stone-200">→</kbd>.{' '}
                    <span className="text-emerald-400">Green</span> arrows are your moves,{' '}
                    <span className="text-sky-400">blue</span> are your opponent&apos;s.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="rounded-xl bg-stone-900/70 ring-1 ring-stone-800 p-4 max-h-80 overflow-y-auto">
          <h3 className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Moves</h3>
          {history.length === 0 && mode === 'drill' ? (
            <p className="text-sm text-stone-500">
              {side === 'w' ? 'You start. Play the first move of the line.' : 'Wait for White, then respond.'}
            </p>
          ) : (
            <MoveList
              moves={mode === 'learn' ? line.moves : played.map((m, i) => annotated(candidates, i, m.san))}
              cursor={mode === 'learn' ? cursor : played.length}
              onJump={mode === 'learn' ? setCursor : undefined}
              mistakes={mode === 'drill' ? mistakePlies : undefined}
            />
          )}
        </div>
      </aside>
    </>
  );
}

function MicStatus({
  listening,
  error,
  heard,
  example = 'say a move like “knight f3” or “castles”',
}: {
  listening: boolean;
  error: string | null;
  heard: { said: string; result: string } | null;
  example?: string;
}) {
  return (
    <div className="mt-3 rounded-lg bg-stone-900/70 ring-1 ring-stone-800 px-4 py-2 text-sm flex items-center gap-3">
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${error ? 'bg-stone-600' : listening ? 'bg-rose-500 animate-pulse' : 'bg-stone-500'}`} />
      {error ? (
        <span className="text-rose-300">{error}</span>
      ) : heard ? (
        <span className="text-stone-400 truncate">
          Heard “<span className="text-stone-200">{heard.said}</span>”
          <span className="mx-2 text-stone-600">→</span>
          <span className={`font-mono ${heard.result === '?' ? 'text-rose-300' : 'text-amber-200'}`}>
            {heard.result === '?' ? 'no legal move' : heard.result}
          </span>
        </span>
      ) : (
        <span className="text-stone-400">
          Listening — {example}. Commands: next, back, hint, restart, flip, repeat.
        </span>
      )}
    </div>
  );
}

function ReplayButton() {
  return (
    <button
      onClick={() => narrator.replay()}
      title="Say it again"
      className="absolute top-3 right-3 w-7 h-7 rounded-full text-xs bg-black/20 hover:bg-black/40 ring-1 ring-white/10"
    >
      🔊
    </button>
  );
}

function CtlButton({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-md text-sm transition disabled:opacity-30 disabled:cursor-not-allowed ${
        primary
          ? 'bg-amber-600 text-stone-950 font-semibold hover:bg-amber-500'
          : 'bg-stone-800 text-stone-200 hover:bg-stone-700 ring-1 ring-stone-700'
      }`}
    >
      {children}
    </button>
  );
}

/** The book's spelling of a played move, keeping `?!`-style annotations. */
function annotated(lines: OpeningLine[], ply: number, san: string) {
  const book = lines.find((l) => l.moves[ply] && sameSan(l.moves[ply], san));
  return book ? book.moves[ply] : san;
}

/* -------------------------------------------------------- off-book sets */

/**
 * Works through every off-book sideline of one opening in turn. In Learn it's
 * practice (free hints, unscored); in Drill it's a scored test.
 */
function OffBookSet({
  practice,
  opening,
  setLineId,
  flipped,
  setFlipped,
  progress,
  recordRun,
  micOn,
  onSwitchMode,
}: {
  practice: boolean;
  opening: Opening;
  setLineId: (id: string) => void;
  flipped: boolean;
  setFlipped: (f: boolean) => void;
  progress: Progress;
  recordRun: (o: Opening, l: OpeningLine, clean: boolean) => void;
  micOn: boolean;
  onSwitchMode: () => void;
}) {
  const sidelines = useMemo(() => opening.lines.filter((l) => l.deviation !== undefined), [opening]);
  // Practice goes in book order; the test shuffles so you can't lean on the sequence.
  const [order, setOrder] = useState(() => (practice ? sidelines : shuffle(sidelines)));
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<(boolean | undefined)[]>([]);

  const again = () => {
    setOrder(practice ? sidelines : shuffle(sidelines));
    setIndex(0);
    setResults([]);
    setRound((r) => r + 1);
  };

  useEffect(() => {
    if (index < order.length) return;
    const cleanCount = results.filter(Boolean).length;
    narrator.say(
      practice
        ? `That's all ${order.length} off-book replies. Now test yourself in Drill.`
        : `You punished ${cleanCount} of ${order.length} cleanly.`,
    );
  }, [index, order.length, results, practice]);

  if (index >= order.length) {
    const cleanCount = results.filter(Boolean).length;
    return (
      <section className="flex-1 flex justify-center items-start">
        <div className="w-full max-w-lg rounded-xl bg-stone-900/70 ring-1 ring-stone-800 p-6 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-orange-400/90">
              {practice ? 'Off-book practice complete' : 'Off-book test results'}
            </p>
            <h2 className="text-2xl font-serif text-amber-100 mt-1">{opening.name}</h2>
            {!practice && (
              <p className="text-stone-300 mt-2">
                <span className="text-3xl font-serif text-amber-200">{cleanCount}</span>
                <span className="text-stone-500"> / {order.length} punished cleanly</span>
              </p>
            )}
          </div>
          <ul className="space-y-2">
            {order.map((l, i) => (
              <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-300">
                  <span className="font-mono text-orange-300 mr-2">{l.moves[l.deviation!]}</span>
                  {l.name}
                </span>
                <span className={practice ? 'text-stone-500' : results[i] ? 'text-emerald-400' : 'text-rose-400'}>
                  {practice ? 'seen' : results[i] ? '✓ clean' : '✗ slipped'}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSwitchMode}
              className="px-3 py-1.5 rounded-md bg-amber-600 text-stone-950 font-semibold text-sm hover:bg-amber-500"
            >
              {practice ? 'Test yourself in Drill →' : 'Practise again in Learn'}
            </button>
            <CtlButton onClick={again}>↺ Go again</CtlButton>
            <CtlButton onClick={() => setLineId(opening.lines[0].id)}>Back to lines</CtlButton>
          </div>
        </div>
      </section>
    );
  }

  const line = order[index];
  const last = index === order.length - 1;
  return (
    <Trainer
      key={`${round}:${index}`}
      mode="drill"
      opening={opening}
      line={line}
      mixAll={false}
      lineId="offbook"
      setLineId={setLineId}
      flipped={flipped}
      setFlipped={setFlipped}
      progress={progress}
      recordRun={recordRun}
      micOn={micOn}
      puzzle={{
        practice,
        showLines: true,
        label: `${practice ? 'Off-book practice' : 'Off-book test'} · ${index + 1} of ${order.length}`,
        nextLabel: last ? 'See results →' : 'Next reply →',
        onNext: () => setIndex((i) => i + 1),
        onFinish: (clean) =>
          setResults((r) => {
            const next = r.slice();
            next[index] = clean;
            return next;
          }),
      }}
    />
  );
}

/* ----------------------------------------------------------------- punish */

const SIDELINES = OPENINGS.flatMap((opening) =>
  opening.lines.filter((l) => l.deviation !== undefined).map((line) => ({ opening, line })),
);

function Punish({
  progress,
  recordRun,
  micOn,
}: {
  progress: Progress;
  recordRun: (o: Opening, l: OpeningLine, clean: boolean) => void;
  micOn: boolean;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Favour puzzles you haven't solved cleanly yet, and never repeat the last one.
  const pick = useCallback(
    (exclude: number | null) => {
      const weights = SIDELINES.map(({ opening, line }, i) =>
        i === exclude ? 0 : 1 / (1 + (progress[statKey(opening, line)]?.clean ?? 0)),
      );
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      const i = weights.findIndex((w) => (r -= w) <= 0);
      return i < 0 ? 0 : i;
    },
    [progress],
  );

  useEffect(() => setIndex((cur) => cur ?? pick(null)), [pick]);

  if (index === null) return <section className="flex-1" />;
  const { opening, line } = SIDELINES[index];

  return (
    <Trainer
      key={`${index}:${round}`}
      mode="drill"
      opening={opening}
      line={line}
      mixAll={false}
      lineId={line.id}
      setLineId={() => {}}
      flipped={flipped}
      setFlipped={setFlipped}
      progress={progress}
      recordRun={recordRun}
      micOn={micOn}
      puzzle={{
        onNext: () => {
          setIndex(pick(index));
          setRound((r) => r + 1);
          setFlipped(false);
        },
      }}
    />
  );
}

/* ------------------------------------------------------------------- quiz */

interface Question {
  opening: Opening;
  line: OpeningLine;
  plies: number;
  position: Position;
  lastMove: Move;
  choices: Opening[];
}

function makeQuestion(): Question {
  const opening = OPENINGS[Math.floor(Math.random() * OPENINGS.length)];
  const line = opening.lines[Math.floor(Math.random() * opening.lines.length)];
  // Start just past the point where this line parts ways with every other opening.
  let shared = 0;
  for (const o of OPENINGS) {
    if (o.id === opening.id) continue;
    for (const l of o.lines) {
      let n = 0;
      while (n < l.moves.length && n < line.moves.length && sameSan(l.moves[n], line.moves[n])) n++;
      shared = Math.max(shared, n);
    }
  }
  const min = Math.min(Math.max(6, shared + 1), line.moves.length);
  const plies = min + Math.floor(Math.random() * (line.moves.length - min + 1));
  const { positions, moves } = playLine(line.moves.slice(0, plies));
  const others = shuffle(OPENINGS.filter((o) => o.id !== opening.id)).slice(0, 3);
  return {
    opening,
    line,
    plies,
    position: positions[positions.length - 1],
    lastMove: moves[moves.length - 1],
    choices: shuffle([opening, ...others]),
  };
}

function Quiz({ micOn }: { micOn: boolean }) {
  const [q, setQ] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [score, setScore] = useState({ right: 0, total: 0 });

  useEffect(() => {
    setQ(makeQuestion());
    try {
      setBest(Number(localStorage.getItem('openings-quiz-best') ?? 0));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const choose = (id: string) => {
    if (!q || answer) return;
    setAnswer(id);
    const right = id === q.opening.id;
    playTone(right ? 'done' : 'wrong');
    narrator.say(`${right ? 'Correct!' : 'Not this time.'} It's the ${q.opening.name}, ${q.line.name}.`);
    setScore((s) => ({ right: s.right + (right ? 1 : 0), total: s.total + 1 }));
    const nextStreak = right ? streak + 1 : 0;
    setStreak(nextStreak);
    if (nextStreak > best) {
      setBest(nextStreak);
      try {
        localStorage.setItem('openings-quiz-best', String(nextStreak));
      } catch {
        /* storage unavailable */
      }
    }
  };

  const next = useCallback(() => {
    setQ(makeQuestion());
    setAnswer(null);
  }, []);

  useEffect(() => {
    if (!answer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, next]);

  const [heard, setHeard] = useState<{ said: string; result: string } | null>(null);
  const mic = useSpeechInput(micOn, (alternatives) => {
    if (narrator.isBusy() || !q || !alternatives.length) return;
    const said = alternatives[0];
    const cmd = alternatives.map(parseCommand).find(Boolean);
    if (answer) {
      if (cmd === 'next') {
        setHeard({ said, result: 'next' });
        next();
      } else if (cmd === 'repeat') narrator.replay();
      return;
    }
    for (const alt of alternatives) {
      const o = matchSpokenName(alt, q.choices, (c) => c.name);
      if (o) {
        setHeard({ said: alt, result: o.name });
        choose(o.id);
        return;
      }
    }
    setHeard({ said, result: '?' });
  });

  if (!q) return <section className="flex-1" />;

  const moveText = q.line.moves
    .slice(0, q.plies)
    .map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m}` : m))
    .join(' ');

  return (
    <>
      <section className="flex-1 flex flex-col items-center min-w-0">
        <div className="w-full max-w-[min(640px,calc(100vh-170px))]">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-mono text-stone-400">Which opening is this?</span>
            <span className="text-stone-500">{q.position.turn === 'w' ? 'White' : 'Black'} to move</span>
          </div>
          <Board position={q.position} orientation="w" movable={null} lastMove={q.lastMove} />
          {micOn && (
            <MicStatus
              listening={mic.listening}
              error={mic.error}
              heard={heard}
              example="say the opening’s name, then “next”"
            />
          )}
        </div>
      </section>

      <aside className="lg:w-80 shrink-0 space-y-4">
        <div className="rounded-xl bg-stone-900/70 ring-1 ring-stone-800 p-4 grid grid-cols-3 text-center">
          <Stat label="Streak" value={streak} />
          <Stat label="Best" value={best} />
          <Stat label="Score" value={`${score.right}/${score.total}`} />
        </div>

        <div className="space-y-2">
          {q.choices.map((o) => {
            const isRight = o.id === q.opening.id;
            const picked = answer === o.id;
            let cls = 'bg-stone-900/70 ring-stone-800 hover:bg-stone-800 hover:ring-amber-700/60 text-stone-200';
            if (answer && isRight) cls = 'bg-emerald-900/60 ring-emerald-600 text-emerald-100';
            else if (picked) cls = 'bg-rose-900/60 ring-rose-600 text-rose-100';
            else if (answer) cls = 'bg-stone-900/40 ring-stone-800 text-stone-500';
            return (
              <button
                key={o.id}
                onClick={() => choose(o.id)}
                disabled={!!answer}
                className={`w-full text-left px-4 py-3 rounded-xl ring-1 transition ${cls}`}
              >
                <span className="font-serif text-lg">{o.name}</span>
                <span className="ml-2 text-xs font-mono opacity-60">{o.eco}</span>
              </button>
            );
          })}
        </div>

        {answer && (
          <div className="rounded-xl bg-stone-900/70 ring-1 ring-stone-800 p-4 text-sm space-y-2">
            <p className={answer === q.opening.id ? 'text-emerald-300' : 'text-rose-300'}>
              {answer === q.opening.id ? 'Correct!' : 'Not this time.'} It&apos;s the{' '}
              <span className="font-semibold">{q.opening.name}</span>, {q.line.name}.
            </p>
            <p className="font-mono text-stone-400 text-xs leading-relaxed">{moveText}</p>
            <button
              onClick={next}
              className="mt-1 px-3 py-1.5 rounded-md bg-amber-600 text-stone-950 font-semibold hover:bg-amber-500"
            >
              Next position ↵
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xl font-serif text-amber-200">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">{label}</div>
    </div>
  );
}
