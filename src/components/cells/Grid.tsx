import React from 'react';
import { CELL_SIZE, CELL_STATE } from '@/lib/game-of-life';
import { ColorScheme } from '@/lib/colors';

interface GridProps {
  grid: number[][];
  colorScheme: ColorScheme;
  generation: number;
}

const Grid: React.FC<GridProps> = ({ grid, colorScheme, generation }) => {
  const height = grid.length;
  const width = grid[0]?.length || 0;

  const getColor = (cellState: number, row: number, col: number) => {
    if (colorScheme.name === 'Rainbow') {
      const hue = (generation * 2) % 360;
      switch (cellState) {
        case CELL_STATE.SURVIVED:
          return `hsl(${hue}, 100%, 50%)`;
        case CELL_STATE.NEW:
          return `hsl(${(hue + 60) % 360}, 100%, 70%)`;
        case CELL_STATE.DIED:
          return `hsl(${(hue + 120) % 360}, 100%, 30%)`;
        default:
          return colorScheme.dead;
      }
    }

    if (colorScheme.name === 'Ripple') {
      const centerX = width / 2;
      const centerY = height / 2;
      const dx = col - centerX;
      const dy = row - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const hue = (distance - generation) * 3 % 360;
      switch (cellState) {
        case CELL_STATE.SURVIVED:
          return `hsl(${hue}, 100%, 50%)`;
        case CELL_STATE.NEW:
          return `hsl(${(hue + 60) % 360}, 100%, 70%)`;
        case CELL_STATE.DIED:
          return `hsl(${(hue + 120) % 360}, 100%, 30%)`;
        default:
          return colorScheme.dead;
      }
    }

    switch (cellState) {
      case CELL_STATE.SURVIVED:
        return colorScheme.survived;
      case CELL_STATE.NEW:
        return colorScheme.new;
      case CELL_STATE.DIED:
        return colorScheme.died;
      default:
        return colorScheme.dead;
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${height}, ${CELL_SIZE}px)`,
        border: '1px solid #333',
      }}
    >
      {grid.map((rows, i) =>
        rows.map((_, k) => (
          <div
            key={`${i}-${k}`}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: getColor(grid[i][k], i, k),
              border: 'solid 1px #eee',
            }}
          />
        ))
      )}
    </div>
  );
};

export default Grid;
