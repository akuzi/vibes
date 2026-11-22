// Turns a speech-recognition transcript ("knight to f three", "castle short")
// into a legal move in the current position, or a trainer command.

import { fileOf, legalMoves, rankOf, squareName, type Move, type PieceType, type Position } from './chess';

export type VoiceCommand = 'next' | 'back' | 'hint' | 'restart' | 'flip' | 'repeat';

export type SpokenMove =
  | { kind: 'move'; move: Move }
  | { kind: 'ambiguous'; moves: Move[] }
  | { kind: 'none' };

const PIECE_WORDS: Record<string, PieceType> = {
  king: 'k', queen: 'q', rook: 'r', castle: 'r', bishop: 'b', knight: 'n', night: 'n', nite: 'n', horse: 'n',
  pawn: 'p', porn: 'p', pond: 'p',
};

// Words recognisers commonly produce for single letters and digits.
const LETTER_WORDS: Record<string, string> = {
  a: 'a', ay: 'a', alpha: 'a',
  b: 'b', be: 'b', bee: 'b', bravo: 'b',
  c: 'c', see: 'c', sea: 'c', charlie: 'c',
  d: 'd', dee: 'd', delta: 'd',
  e: 'e', ee: 'e', echo: 'e',
  f: 'f', eff: 'f', ef: 'f', foxtrot: 'f',
  g: 'g', gee: 'g', golf: 'g',
  h: 'h', aitch: 'h', age: 'h', each: 'h', hotel: 'h',
};
const NUMBER_WORDS: Record<string, string> = {
  one: '1', won: '1', two: '2', too: '2', three: '3', tree: '3', four: '4', for: '4', fore: '4',
  five: '5', six: '6', sicks: '6', seven: '7', eight: '8', ate: '8',
};

function normalise(transcript: string): string[] {
  const words = transcript
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    // "e4" -> "e 4", "f3" -> "f 3"; also splits "84"-style glitches harmlessly.
    .replace(/\b([a-h])([1-8])\b/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.map((w) => NUMBER_WORDS[w] ?? w);
}

export function parseCommand(transcript: string): VoiceCommand | null {
  const t = ` ${normalise(transcript).join(' ')} `;
  if (/ (repeat|say (it |that )?again|pardon|what) /.test(t)) return 'repeat';
  if (/ (hint|help|clue) /.test(t)) return 'hint';
  if (/ (restart|start over|reset|try again|again) /.test(t)) return 'restart';
  if (/ (flip|turn (the )?board|rotate) /.test(t)) return 'flip';
  if (/ (next|forward|continue|go on) /.test(t)) return 'next';
  if (/ (back|previous|undo|go back) /.test(t)) return 'back';
  return null;
}

export function parseSpokenMove(transcript: string, pos: Position): SpokenMove {
  const words = normalise(transcript);
  const joined = ` ${words.join(' ')} `;
  const moves = legalMoves(pos);

  // Castling.
  if (/ (castle|castles|castling|o o)/.test(joined) && !/ (rook|castle) [a-h] /.test(joined)) {
    const long = / (queen ?side|long|o o o) /.test(joined);
    const short = / (king ?side|short) /.test(joined);
    const castles = moves.filter((m) => m.castle && (long ? m.castle === 'Q' : short ? m.castle === 'K' : true));
    if (castles.length === 1) return { kind: 'move', move: castles[0] };
    if (castles.length > 1) return { kind: 'ambiguous', moves: castles };
  }

  // Squares: a letter word followed by a digit.
  const squares: string[] = [];
  const files: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const letter = LETTER_WORDS[words[i]];
    if (!letter) continue;
    if (/^[1-8]$/.test(words[i + 1] ?? '')) {
      squares.push(letter + words[i + 1]);
      i++;
    } else if (words[i] === letter) files.push(letter); // bare file, e.g. "e takes d5" or "knight b d7"
  }
  if (!squares.length) return { kind: 'none' };
  const to = squares[squares.length - 1];
  const from = squares.length > 1 ? squares[squares.length - 2] : null;

  const pieceWord = words.find((w) => PIECE_WORDS[w] && !(w === 'castle' && squares.length));
  const piece = pieceWord ? PIECE_WORDS[pieceWord] : null;
  const capture = / (takes|take|captures|capture|x) /.test(joined);
  const promo = words.slice(words.indexOf(to[0]) + 1).map((w) => PIECE_WORDS[w]).find((p) => p && p !== 'p' && p !== 'k');

  let candidates = moves.filter((m) => squareName(m.to) === to);
  if (from) candidates = candidates.filter((m) => squareName(m.from) === from);
  if (piece) candidates = candidates.filter((m) => m.piece.type === piece);
  if (capture) candidates = candidates.filter((m) => m.captured);
  if (files.length && candidates.length > 1)
    candidates = candidates.filter((m) => files.includes('abcdefgh'[fileOf(m.from)]) || files.includes(String(rankOf(m.from) + 1)));
  // Bare "e4" means the pawn unless only a piece can get there.
  if (!piece && candidates.length > 1 && candidates.some((m) => m.piece.type === 'p'))
    candidates = candidates.filter((m) => m.piece.type === 'p');
  if (candidates.length > 1 && candidates.every((m) => m.promotion))
    candidates = candidates.filter((m) => m.promotion === (promo ?? 'q'));

  if (candidates.length === 1) return { kind: 'move', move: candidates[0] };
  if (candidates.length > 1) return { kind: 'ambiguous', moves: candidates };
  return { kind: 'none' };
}

/** Scores each name by how many of its distinctive words were spoken. */
export function matchSpokenName<T>(transcript: string, options: T[], name: (o: T) => string): T | null {
  const spoken = new Set(normalise(transcript));
  const stop = new Set(['the', 'defence', 'defense', 'game', 'opening', 'system', 'variation']);
  const scored = options.map((o) => ({
    o,
    score: normalise(name(o)).filter((w) => !stop.has(w) && spoken.has(w)).length,
  }));
  const best = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === best);
  return best > 0 && top.length === 1 ? top[0].o : null;
}
