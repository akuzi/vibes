export const CELL_SIZE = 10; // px

export enum CellState {
  DEAD,
  SURVIVED,
  NEW,
  DIED,
}

export const createEmptyGrid = (width: number, height: number): number[][] => {
  const rows = [];
  for (let i = 0; i < height; i++) {
    rows.push(Array.from(Array(width), () => CellState.DEAD));
  }
  return rows;
};

export const createRandomGrid = (width: number, height: number): number[][] => {
  const rows = [];
  for (let i = 0; i < height; i++) {
    rows.push(
      Array.from(Array(width), () =>
        Math.random() > 0.7 ? CellState.NEW : CellState.DEAD
      )
    );
  }
  return rows;
};

export const createGridWithPattern = (
  width: number,
  height: number,
  pattern: number[][]
): number[][] => {
  const grid = createEmptyGrid(width, height);
  const patternHeight = pattern.length;
  const patternWidth = pattern[0]?.length || 0;

  if (patternHeight === 0 || patternWidth === 0) {
    return grid;
  }

  const startX = Math.floor((width - patternWidth) / 2);
  const startY = Math.floor((height - patternHeight) / 2);

  for (let i = 0; i < patternHeight; i++) {
    for (let j = 0; j < patternWidth; j++) {
      if (pattern[i][j]) {
        const gridX = startX + j;
        const gridY = startY + i;
        if (gridX >= 0 && gridX < width && gridY >= 0 && gridY < height) {
          grid[gridY][gridX] = pattern[i][j];
        }
      }
    }
  }
  return grid;
};

export type GlitchLevel = 'None' | 'Low' | 'Medium' | 'High';

const GLITCH_EVENT_PROBABILITIES: Record<GlitchLevel, number> = {
  None: 0,
  Low: 0.01,
  Medium: 0.05,
  High: 0.1,
};

const countNeighbors = (grid: number[][], x: number, y: number): number => {
  const height = grid.length;
  const width = grid[0].length;
  let sum = 0;
  for (let i = -1; i < 2; i++) {
    for (let j = -1; j < 2; j++) {
      if (i === 0 && j === 0) {
        continue;
      }
      const row = (x + i + height) % height;
      const col = (y + j + width) % width;
      const cellState = grid[row][col];
      if (cellState === CellState.SURVIVED || cellState === CellState.NEW) {
        sum += 1;
      }
    }
  }
  return sum;
};

export const getNextGeneration = (
  grid: number[][],
  glitchLevel: GlitchLevel = 'None'
): number[][] => {
  const height = grid.length;
  if (height === 0) return [];
  const width = grid[0].length;
  if (width === 0) return [[]];

  const newGrid = createEmptyGrid(width, height);
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const neighbors = countNeighbors(grid, i, j);
      const cellState = grid[i][j];
      const wasAlive =
        cellState === CellState.SURVIVED || cellState === CellState.NEW;

      if (wasAlive) {
        if (neighbors < 2 || neighbors > 3) {
          newGrid[i][j] = CellState.DIED;
        } else {
          newGrid[i][j] = CellState.SURVIVED;
        }
      } else {
        if (neighbors === 3) {
          newGrid[i][j] = CellState.NEW;
        } else {
          newGrid[i][j] = CellState.DEAD;
        }
      }
    }
  }

  const glitchProbability = GLITCH_EVENT_PROBABILITIES[glitchLevel];
  if (glitchProbability > 0 && Math.random() < glitchProbability) {
    for (let k = 0; k < 10; k++) {
      const glitchX = Math.floor(Math.random() * width);
      const glitchY = Math.floor(Math.random() * height);
      const glitchSize = 3;

      for (let i = 0; i < glitchSize; i++) {
        for (let j = 0; j < glitchSize; j++) {
          const x = glitchX + i;
          const y = glitchY + j;
          if (x < width && y < height) {
            newGrid[y][x] =
              Math.random() > 0.5 ? CellState.NEW : CellState.DEAD;
          }
        }
      }
    }
  }

  return newGrid;
};
