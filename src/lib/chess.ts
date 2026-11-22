// Minimal chess rules engine: legal move generation, SAN in/out.
// Squares are 0..63, index = rank * 8 + file, a1 = 0, h8 = 63.

export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Position {
  board: (Piece | null)[];
  turn: Color;
  castling: { K: boolean; Q: boolean; k: boolean; q: boolean };
  ep: number | null;
}

export interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured: Piece | null;
  promotion?: PieceType;
  castle?: 'K' | 'Q';
  enPassant?: boolean;
  san: string;
}

const FILES = 'abcdefgh';

export const fileOf = (sq: number) => sq & 7;
export const rankOf = (sq: number) => sq >> 3;
export const squareName = (sq: number) => FILES[fileOf(sq)] + (rankOf(sq) + 1);
export const parseSquare = (name: string) =>
  (Number(name[1]) - 1) * 8 + FILES.indexOf(name[0]);

const opposite = (c: Color): Color => (c === 'w' ? 'b' : 'w');

export function initialPosition(): Position {
  const board: (Piece | null)[] = new Array(64).fill(null);
  const back: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let f = 0; f < 8; f++) {
    board[f] = { type: back[f], color: 'w' };
    board[8 + f] = { type: 'p', color: 'w' };
    board[48 + f] = { type: 'p', color: 'b' };
    board[56 + f] = { type: back[f], color: 'b' };
  }
  return { board, turn: 'w', castling: { K: true, Q: true, k: true, q: true }, ep: null };
}

const KNIGHT_STEPS = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_STEPS = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function offset(sq: number, df: number, dr: number): number | null {
  const f = fileOf(sq) + df;
  const r = rankOf(sq) + dr;
  if (f < 0 || f > 7 || r < 0 || r > 7) return null;
  return r * 8 + f;
}

export function isAttacked(pos: Position, sq: number, by: Color): boolean {
  const b = pos.board;
  const is = (s: number | null, types: PieceType[]) => {
    if (s === null) return false;
    const p = b[s];
    return !!p && p.color === by && types.includes(p.type);
  };
  const pawnDir = by === 'w' ? -1 : 1;
  if (is(offset(sq, -1, pawnDir), ['p']) || is(offset(sq, 1, pawnDir), ['p'])) return true;
  for (const [df, dr] of KNIGHT_STEPS) if (is(offset(sq, df, dr), ['n'])) return true;
  for (const [df, dr] of KING_STEPS) if (is(offset(sq, df, dr), ['k'])) return true;
  const slide = (dirs: number[][], types: PieceType[]) => {
    for (const [df, dr] of dirs) {
      let s = offset(sq, df, dr);
      while (s !== null) {
        if (b[s]) {
          if (is(s, types)) return true;
          break;
        }
        s = offset(s, df, dr);
      }
    }
    return false;
  };
  return slide(BISHOP_DIRS, ['b', 'q']) || slide(ROOK_DIRS, ['r', 'q']);
}

const kingSquare = (pos: Position, color: Color) =>
  pos.board.findIndex((p) => p?.type === 'k' && p.color === color);

export const inCheck = (pos: Position) =>
  isAttacked(pos, kingSquare(pos, pos.turn), opposite(pos.turn));

type RawMove = Omit<Move, 'san'>;

function pseudoMoves(pos: Position): RawMove[] {
  const moves: RawMove[] = [];
  const { board, turn } = pos;
  const push = (from: number, to: number, extra: Partial<RawMove> = {}) =>
    moves.push({ from, to, piece: board[from]!, captured: board[to], ...extra });

  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (!p || p.color !== turn) continue;
    if (p.type === 'p') {
      const dir = turn === 'w' ? 1 : -1;
      const startRank = turn === 'w' ? 1 : 6;
      const lastRank = turn === 'w' ? 7 : 0;
      const addPawn = (to: number, extra: Partial<RawMove> = {}) => {
        if (rankOf(to) === lastRank) {
          for (const promo of ['q', 'r', 'b', 'n'] as PieceType[]) push(sq, to, { ...extra, promotion: promo });
        } else push(sq, to, extra);
      };
      const one = offset(sq, 0, dir);
      if (one !== null && !board[one]) {
        addPawn(one);
        const two = offset(sq, 0, 2 * dir);
        if (rankOf(sq) === startRank && two !== null && !board[two]) push(sq, two);
      }
      for (const df of [-1, 1]) {
        const t = offset(sq, df, dir);
        if (t === null) continue;
        if (board[t] && board[t]!.color !== turn) addPawn(t);
        else if (t === pos.ep)
          push(sq, t, { enPassant: true, captured: { type: 'p', color: opposite(turn) } });
      }
      continue;
    }
    const steps = (list: number[][]) => {
      for (const [df, dr] of list) {
        const t = offset(sq, df, dr);
        if (t !== null && board[t]?.color !== turn) push(sq, t);
      }
    };
    const slides = (dirs: number[][]) => {
      for (const [df, dr] of dirs) {
        let t = offset(sq, df, dr);
        while (t !== null) {
          if (board[t]) {
            if (board[t]!.color !== turn) push(sq, t);
            break;
          }
          push(sq, t);
          t = offset(t, df, dr);
        }
      }
    };
    if (p.type === 'n') steps(KNIGHT_STEPS);
    if (p.type === 'b') slides(BISHOP_DIRS);
    if (p.type === 'r') slides(ROOK_DIRS);
    if (p.type === 'q') slides([...BISHOP_DIRS, ...ROOK_DIRS]);
    if (p.type === 'k') {
      steps(KING_STEPS);
      const home = turn === 'w' ? 4 : 60;
      const them = opposite(turn);
      if (sq === home && !isAttacked(pos, home, them)) {
        const kSide = turn === 'w' ? pos.castling.K : pos.castling.k;
        const qSide = turn === 'w' ? pos.castling.Q : pos.castling.q;
        if (kSide && !board[home + 1] && !board[home + 2] && !isAttacked(pos, home + 1, them))
          push(sq, home + 2, { castle: 'K' });
        if (qSide && !board[home - 1] && !board[home - 2] && !board[home - 3] && !isAttacked(pos, home - 1, them))
          push(sq, home - 2, { castle: 'Q' });
      }
    }
  }
  return moves;
}

export function applyMove(pos: Position, m: Pick<Move, 'from' | 'to' | 'promotion' | 'castle' | 'enPassant'>): Position {
  const board = pos.board.slice();
  const piece = board[m.from]!;
  board[m.to] = m.promotion ? { type: m.promotion, color: piece.color } : piece;
  board[m.from] = null;
  if (m.enPassant) board[m.to + (piece.color === 'w' ? -8 : 8)] = null;
  if (m.castle) {
    const home = piece.color === 'w' ? 4 : 60;
    const [rFrom, rTo] = m.castle === 'K' ? [home + 3, home + 1] : [home - 4, home - 1];
    board[rTo] = board[rFrom];
    board[rFrom] = null;
  }
  const castling = { ...pos.castling };
  const touch = (sq: number) => {
    if (sq === 4) castling.K = castling.Q = false;
    if (sq === 60) castling.k = castling.q = false;
    if (sq === 0) castling.Q = false;
    if (sq === 7) castling.K = false;
    if (sq === 56) castling.q = false;
    if (sq === 63) castling.k = false;
  };
  touch(m.from);
  touch(m.to);
  const ep =
    piece.type === 'p' && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : null;
  return { board, turn: opposite(pos.turn), castling, ep };
}

function legalRaw(pos: Position): RawMove[] {
  return pseudoMoves(pos).filter((m) => {
    const next = applyMove(pos, m);
    return !isAttacked(next, kingSquare(next, pos.turn), next.turn);
  });
}

function sanFor(pos: Position, m: RawMove, all: RawMove[]): string {
  let san: string;
  if (m.castle) san = m.castle === 'K' ? 'O-O' : 'O-O-O';
  else {
    const capture = !!m.captured;
    if (m.piece.type === 'p') {
      san = (capture ? FILES[fileOf(m.from)] + 'x' : '') + squareName(m.to);
      if (m.promotion) san += '=' + m.promotion.toUpperCase();
    } else {
      const rivals = all.filter(
        (o) => o !== m && o.to === m.to && o.piece.type === m.piece.type && o.from !== m.from,
      );
      let dis = '';
      if (rivals.length) {
        const sameFile = rivals.some((o) => fileOf(o.from) === fileOf(m.from));
        const sameRank = rivals.some((o) => rankOf(o.from) === rankOf(m.from));
        if (!sameFile) dis = FILES[fileOf(m.from)];
        else if (!sameRank) dis = String(rankOf(m.from) + 1);
        else dis = squareName(m.from);
      }
      san = m.piece.type.toUpperCase() + dis + (capture ? 'x' : '') + squareName(m.to);
    }
  }
  const next = applyMove(pos, m);
  if (inCheck(next)) san += legalRaw(next).length === 0 ? '#' : '+';
  return san;
}

export function legalMoves(pos: Position): Move[] {
  const raw = legalRaw(pos);
  return raw.map((m) => ({ ...m, san: sanFor(pos, m, raw) }));
}

const cleanSan = (san: string) => san.replace(/[+#!?]/g, '').replace(/0/g, 'O');

export function moveFromSan(pos: Position, san: string): Move | null {
  const target = cleanSan(san);
  return legalMoves(pos).find((m) => cleanSan(m.san) === target) ?? null;
}

export const sameSan = (a: string, b: string) => cleanSan(a) === cleanSan(b);

/** Plays a SAN line from the start position; throws on an illegal move. */
export function playLine(sans: string[]): { positions: Position[]; moves: Move[] } {
  const positions = [initialPosition()];
  const moves: Move[] = [];
  for (const san of sans) {
    const pos = positions[positions.length - 1];
    const m = moveFromSan(pos, san);
    if (!m) throw new Error(`Illegal move ${san} after ${moves.map((x) => x.san).join(' ')}`);
    moves.push(m);
    positions.push(applyMove(pos, m));
  }
  return { positions, moves };
}
