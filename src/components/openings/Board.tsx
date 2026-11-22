'use client';

import React, { useMemo, useRef, useState } from 'react';
import { fileOf, legalMoves, rankOf, type Color, type Move, type Piece, type Position } from '@/lib/chess';

export interface Arrow {
  from: number;
  to: number;
  color: string;
}

interface BoardProps {
  position: Position;
  orientation: Color;
  /** Which colour the user may move, or null for a read-only board. */
  movable: Color | null;
  onMove?: (move: Move) => void;
  lastMove?: { from: number; to: number } | null;
  arrows?: Arrow[];
  flash?: { square: number; color: string } | null;
}

const GLYPHS: Record<Piece['type'], string> = {
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const LIGHT = '#eed9b6';
const DARK = '#b0805a';

function PieceGlyph({ piece }: { piece: Piece }) {
  const white = piece.color === 'w';
  return (
    <span
      className="select-none leading-none pointer-events-none"
      style={{
        fontSize: 'calc(100cqw / 8 * 0.8)',
        color: white ? '#fbf7ef' : '#231a14',
        WebkitTextStroke: white ? '1.5px #2a1f17' : '0.5px #000',
        textShadow: white ? '0 2px 2px rgba(0,0,0,0.35)' : '0 2px 2px rgba(0,0,0,0.25)',
        fontFamily: '"Segoe UI Symbol", "DejaVu Sans", "Apple Symbols", sans-serif',
      }}
    >
      {GLYPHS[piece.type]}
      {'︎'}
    </span>
  );
}

export default function Board({ position, orientation, movable, onMove, lastMove, arrows = [], flash }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ sq: number; x: number; y: number; moved: boolean } | null>(null);

  const moves = useMemo(() => legalMoves(position), [position]);
  const canMove = movable !== null && movable === position.turn;
  const targets = useMemo(
    () => (selected === null ? [] : moves.filter((m) => m.from === selected)),
    [moves, selected],
  );

  // Visual grid position (col, row from top-left) for a square.
  const toGrid = (sq: number) =>
    orientation === 'w' ? { col: fileOf(sq), row: 7 - rankOf(sq) } : { col: 7 - fileOf(sq), row: rankOf(sq) };

  const squareAt = (clientX: number, clientY: number): number | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor(((clientX - rect.left) / rect.width) * 8);
    const row = Math.floor(((clientY - rect.top) / rect.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return orientation === 'w' ? (7 - row) * 8 + col : row * 8 + (7 - col);
  };

  const tryMove = (from: number, to: number) => {
    const candidates = moves.filter((m) => m.from === from && m.to === to);
    if (!candidates.length) return false;
    const move = candidates.find((m) => !m.promotion || m.promotion === 'q') ?? candidates[0];
    onMove?.(move);
    return true;
  };

  const ownPiece = (sq: number) => {
    const p = position.board[sq];
    return !!p && p.color === position.turn;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!canMove) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (sq === null) return;
    if (selected !== null && targets.some((m) => m.to === sq)) {
      tryMove(selected, sq);
      setSelected(null);
      return;
    }
    if (ownPiece(sq)) {
      setSelected(sq);
      setDrag({ sq, x: e.clientX, y: e.clientY, moved: false });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } else setSelected(null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (drag.moved && sq !== null && sq !== drag.sq) {
      tryMove(drag.sq, sq);
      setSelected(null);
    } else if (drag.moved) setSelected(null);
    setDrag(null);
  };

  const rect = boardRef.current?.getBoundingClientRect();
  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = orientation === 'w' ? (7 - row) * 8 + col : row * 8 + (7 - col);
      const light = (fileOf(sq) + rankOf(sq)) % 2 === 1;
      const piece = position.board[sq];
      const isTarget = targets.some((m) => m.to === sq);
      const hidden = drag?.moved && drag.sq === sq;
      let overlay: string | null = null;
      if (lastMove && (lastMove.from === sq || lastMove.to === sq)) overlay = 'rgba(240, 210, 60, 0.45)';
      if (selected === sq) overlay = 'rgba(90, 170, 90, 0.55)';
      if (flash?.square === sq) overlay = flash.color;
      squares.push(
        <div
          key={sq}
          className="relative flex items-center justify-center"
          style={{ background: light ? LIGHT : DARK }}
        >
          {overlay && <div className="absolute inset-0 transition-colors" style={{ background: overlay }} />}
          {piece && !hidden && (
            <div className="relative" style={{ cursor: canMove && piece.color === position.turn ? 'grab' : 'default' }}>
              <PieceGlyph piece={piece} />
            </div>
          )}
          {isTarget &&
            (piece ? (
              <div className="absolute inset-[4%] rounded-full border-[5px] border-black/25" />
            ) : (
              <div className="absolute w-[30%] h-[30%] rounded-full bg-black/25" />
            ))}
          {col === 0 && (
            <span
              className="absolute top-0.5 left-1 text-[10px] font-semibold"
              style={{ color: light ? DARK : LIGHT }}
            >
              {rankOf(sq) + 1}
            </span>
          )}
          {row === 7 && (
            <span
              className="absolute bottom-0 right-1 text-[10px] font-semibold"
              style={{ color: light ? DARK : LIGHT }}
            >
              {'abcdefgh'[fileOf(sq)]}
            </span>
          )}
        </div>,
      );
    }
  }

  return (
    <div className="relative w-full aspect-square select-none touch-none" style={{ containerType: 'inline-size' }}>
      <div
        ref={boardRef}
        className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-md overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-black/40"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        {squares}
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 800">
        <defs>
          {arrows.map((a, i) => (
            <marker
              key={i}
              id={`arrowhead-${i}`}
              markerWidth="4"
              markerHeight="4"
              refX="2"
              refY="2"
              orient="auto"
            >
              <path d="M0,0 L4,2 L0,4 z" fill={a.color} />
            </marker>
          ))}
        </defs>
        {arrows.map((a, i) => {
          const f = toGrid(a.from);
          const t = toGrid(a.to);
          const x1 = f.col * 100 + 50;
          const y1 = f.row * 100 + 50;
          const x2 = t.col * 100 + 50;
          const y2 = t.row * 100 + 50;
          const len = Math.hypot(x2 - x1, y2 - y1);
          const shorten = 32;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2 - ((x2 - x1) / len) * shorten}
              y2={y2 - ((y2 - y1) / len) * shorten}
              stroke={a.color}
              strokeWidth="16"
              strokeLinecap="round"
              markerEnd={`url(#arrowhead-${i})`}
            />
          );
        })}
      </svg>

      {drag?.moved && rect && position.board[drag.sq] && (
        <div
          className="absolute pointer-events-none z-50 flex items-center justify-center"
          style={{
            left: drag.x - rect.left - rect.width / 16,
            top: drag.y - rect.top - rect.width / 16,
            width: rect.width / 8,
            height: rect.width / 8,
          }}
        >
          <span style={{ fontSize: rect.width / 8 * 0.85, lineHeight: 1 }}>
            <DragGlyph piece={position.board[drag.sq]!} />
          </span>
        </div>
      )}
    </div>
  );
}

function DragGlyph({ piece }: { piece: Piece }) {
  const white = piece.color === 'w';
  return (
    <span
      style={{
        color: white ? '#fbf7ef' : '#231a14',
        WebkitTextStroke: white ? '1.5px #2a1f17' : '0.5px #000',
        textShadow: '0 6px 8px rgba(0,0,0,0.4)',
        fontFamily: '"Segoe UI Symbol", "DejaVu Sans", "Apple Symbols", sans-serif',
      }}
    >
      {GLYPHS[piece.type]}
      {'︎'}
    </span>
  );
}
