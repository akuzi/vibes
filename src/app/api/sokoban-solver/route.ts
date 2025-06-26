import { NextRequest, NextResponse } from 'next/server';

type Cell = 'wall' | 'floor' | 'box' | 'goal' | 'player' | 'boxOnGoal' | 'playerOnGoal';
type Position = { x: number; y: number };

interface GameState {
  level: Cell[][];
  playerPos: Position;
  moves: number;
}

interface Node {
  state: Cell[][];
  playerPos: Position;
  g: number; // cost from start
  h: number; // heuristic estimate to goal
  f: number; // f = g + h
  parent: Node | null;
  move: string | null;
}

// Manhattan distance heuristic
const manhattanDistance = (pos1: Position, pos2: Position): number => {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
};

// Calculate heuristic for the entire state
const calculateHeuristic = (state: Cell[][], goals: Position[]): number => {
  let totalDistance = 0;
  const boxes: Position[] = [];
  
  // Find all boxes
  for (let y = 0; y < state.length; y++) {
    for (let x = 0; x < state[y].length; x++) {
      if (state[y][x] === 'box' || state[y][x] === 'boxOnGoal') {
        boxes.push({ x, y });
      }
    }
  }
  
  // Calculate minimum distance from each box to each goal
  for (const box of boxes) {
    let minDistance = Infinity;
    for (const goal of goals) {
      const distance = manhattanDistance(box, goal);
      minDistance = Math.min(minDistance, distance);
    }
    totalDistance += minDistance;
  }
  
  return totalDistance;
};

// Check if a position is a deadlock (box in corner)
const isDeadlock = (state: Cell[][], pos: Position): boolean => {
  if (state[pos.y][pos.x] !== 'box' && state[pos.y][pos.x] !== 'boxOnGoal') {
    return false;
  }
  
  // Check if box is in a corner
  const left = pos.x > 0 ? state[pos.y][pos.x - 1] : 'wall';
  const right = pos.x < state[pos.y].length - 1 ? state[pos.y][pos.x + 1] : 'wall';
  const up = pos.y > 0 ? state[pos.y - 1][pos.x] : 'wall';
  const down = pos.y < state.length - 1 ? state[pos.y + 1][pos.x] : 'wall';
  
  // Corner deadlock: box in corner with no goal
  if ((left === 'wall' && up === 'wall') || 
      (left === 'wall' && down === 'wall') ||
      (right === 'wall' && up === 'wall') ||
      (right === 'wall' && down === 'wall')) {
    return state[pos.y][pos.x] !== 'boxOnGoal';
  }
  
  return false;
};

// Check if state is goal state
const isGoalState = (state: Cell[][]): boolean => {
  for (let y = 0; y < state.length; y++) {
    for (let x = 0; x < state[y].length; x++) {
      // If there is any goal tile not covered by a box, return false
      if (state[y][x] === 'goal' || state[y][x] === 'playerOnGoal') {
        return false;
      }
    }
  }
  // All goals are covered by boxes
  return true;
};

// Get valid moves for a state
const getValidMoves = (state: Cell[][], playerPos: Position): { dx: number; dy: number; move: string }[] => {
  const moves: { dx: number; dy: number; move: string }[] = [];
  const directions = [
    { dx: 0, dy: -1, move: 'U' },
    { dx: 0, dy: 1, move: 'D' },
    { dx: -1, dy: 0, move: 'L' },
    { dx: 1, dy: 0, move: 'R' }
  ];
  
  for (const dir of directions) {
    const newX = playerPos.x + dir.dx;
    const newY = playerPos.y + dir.dy;
    
    console.log(`Checking direction ${dir.move}: player at (${playerPos.x}, ${playerPos.y}) -> (${newX}, ${newY})`);
    
    if (newY < 0 || newY >= state.length || newX < 0 || newX >= state[newY].length) {
      console.log(`  -> Out of bounds, skipping`);
      continue;
    }
    
    const targetCell = state[newY][newX];
    console.log(`  -> Target cell at (${newX}, ${newY}): ${targetCell}`);
    
    if (targetCell === 'wall') {
      console.log(`  -> Wall, skipping`);
      continue;
    }
    
    if (targetCell === 'floor' || targetCell === 'goal') {
      console.log(`  -> Valid move: ${dir.move}`);
      moves.push(dir);
    } else if (targetCell === 'box' || targetCell === 'boxOnGoal') {
      // Check if we can push the box
      const boxNewX = newX + dir.dx;
      const boxNewY = newY + dir.dy;
      
      console.log(`  -> Box detected, checking if can push to (${boxNewX}, ${boxNewY})`);
      
      if (boxNewY >= 0 && boxNewY < state.length && 
          boxNewX >= 0 && boxNewX < state[boxNewY].length) {
        const boxTargetCell = state[boxNewY][boxNewX];
        console.log(`  -> Box target cell at (${boxNewX}, ${boxNewY}): ${boxTargetCell}`);
        if (boxTargetCell === 'floor' || boxTargetCell === 'goal') {
          console.log(`  -> Valid box push: ${dir.move}`);
          moves.push(dir);
        } else {
          console.log(`  -> Box target is ${boxTargetCell}, cannot push`);
        }
      } else {
        console.log(`  -> Box target out of bounds, cannot push`);
      }
    } else {
      console.log(`  -> Unknown cell type: ${targetCell}, skipping`);
    }
  }
  
  // Debug: Print the current state and moves
  console.log(`Player at (${playerPos.x}, ${playerPos.y})`);
  console.log('Current state around player:');
  for (let y = Math.max(0, playerPos.y - 1); y <= Math.min(state.length - 1, playerPos.y + 1); y++) {
    let row = '';
    for (let x = Math.max(0, playerPos.x - 1); x <= Math.min(state[y].length - 1, playerPos.x + 1); x++) {
      if (x === playerPos.x && y === playerPos.y) {
        row += '@';
      } else {
        switch(state[y][x]) {
          case 'wall': row += '#'; break;
          case 'floor': row += ' '; break;
          case 'box': row += '$'; break;
          case 'goal': row += '.'; break;
          case 'player': row += '@'; break;
          case 'boxOnGoal': row += '*'; break;
          case 'playerOnGoal': row += '+'; break;
          default: row += '?'; break;
        }
      }
    }
    console.log(`  ${row}`);
  }
  console.log('Generated moves:', moves);
  
  return moves;
};

// Apply a move to a state
const applyMove = (state: Cell[][], playerPos: Position, dx: number, dy: number): { newState: Cell[][]; newPlayerPos: Position } => {
  const newState = state.map(row => [...row]);
  const newPlayerPos = { x: playerPos.x + dx, y: playerPos.y + dy };
  const targetCell = newState[newPlayerPos.y][newPlayerPos.x];
  
  if (targetCell === 'floor' || targetCell === 'goal') {
    // Simple move
    newState[playerPos.y][playerPos.x] = 
      newState[playerPos.y][playerPos.x] === 'playerOnGoal' ? 'goal' : 'floor';
    newState[newPlayerPos.y][newPlayerPos.x] = targetCell === 'goal' ? 'playerOnGoal' : 'player';
  } else if (targetCell === 'box' || targetCell === 'boxOnGoal') {
    // Push box
    const boxNewX = newPlayerPos.x + dx;
    const boxNewY = newPlayerPos.y + dy;
    const boxTargetCell = newState[boxNewY][boxNewX];
    
    newState[boxNewY][boxNewX] = boxTargetCell === 'goal' ? 'boxOnGoal' : 'box';
    newState[newPlayerPos.y][newPlayerPos.x] = targetCell === 'boxOnGoal' ? 'playerOnGoal' : 'player';
    newState[playerPos.y][playerPos.x] = 
      newState[playerPos.y][playerPos.x] === 'playerOnGoal' ? 'goal' : 'floor';
  }
  
  return { newState, newPlayerPos };
};

// State hash for visited set
const stateHash = (state: Cell[][], playerPos: Position): string => {
  let hash = `${playerPos.x},${playerPos.y}`;
  for (let y = 0; y < state.length; y++) {
    for (let x = 0; x < state[y].length; x++) {
      if (state[y][x] === 'box' || state[y][x] === 'boxOnGoal') {
        hash += `,${x},${y}`;
      }
    }
  }
  return hash;
};

// A* search algorithm
const aStarSearch = (initialState: Cell[][], initialPlayerPos: Position): string[] | null => {
  console.log('Starting A* search...');
  console.log('Initial player position:', initialPlayerPos);
  
  const goals: Position[] = [];
  
  // Find all goals
  for (let y = 0; y < initialState.length; y++) {
    for (let x = 0; x < initialState[y].length; x++) {
      if (initialState[y][x] === 'goal' || initialState[y][x] === 'boxOnGoal' || initialState[y][x] === 'playerOnGoal') {
        goals.push({ x, y });
      }
    }
  }
  
  console.log('Found goals:', goals);
  
  if (goals.length === 0) {
    return null; // No goals to solve
  }
  
  const startNode: Node = {
    state: initialState.map(row => [...row]),
    playerPos: initialPlayerPos,
    g: 0,
    h: calculateHeuristic(initialState, goals),
    f: calculateHeuristic(initialState, goals),
    parent: null,
    move: null
  };
  
  const openSet: Node[] = [startNode];
  const visited = new Set<string>();
  
  while (openSet.length > 0) {
    // Find node with lowest f value
    let currentIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[currentIndex].f) {
        currentIndex = i;
      }
    }
    
    const currentNode = openSet[currentIndex];
    
    // Check if we reached the goal
    if (isGoalState(currentNode.state)) {
      console.log('Goal state reached!');
      // Reconstruct path
      const path: string[] = [];
      let node: Node | null = currentNode;
      while (node && node.move) {
        path.unshift(node.move);
        node = node.parent;
      }
      console.log('Reconstructed path:', path);
      return path;
    }
    
    // Remove current node from open set
    openSet.splice(currentIndex, 1);
    
    const stateKey = stateHash(currentNode.state, currentNode.playerPos);
    if (visited.has(stateKey)) {
      continue;
    }
    visited.add(stateKey);
    
    // Check for deadlocks
    let hasDeadlock = false;
    for (let y = 0; y < currentNode.state.length; y++) {
      for (let x = 0; x < currentNode.state[y].length; x++) {
        if (isDeadlock(currentNode.state, { x, y })) {
          hasDeadlock = true;
          break;
        }
      }
      if (hasDeadlock) break;
    }
    
    if (hasDeadlock) {
      continue;
    }
    
    // Generate successor states
    const validMoves = getValidMoves(currentNode.state, currentNode.playerPos);
    console.log('Valid moves from current state:', validMoves);
    
    for (const move of validMoves) {
      const { newState, newPlayerPos } = applyMove(currentNode.state, currentNode.playerPos, move.dx, move.dy);
      
      const g = currentNode.g + 1;
      const h = calculateHeuristic(newState, goals);
      const f = g + h;
      
      const successorNode: Node = {
        state: newState,
        playerPos: newPlayerPos,
        g,
        h,
        f,
        parent: currentNode,
        move: move.move
      };
      
      openSet.push(successorNode);
    }
  }
  
  console.log('No solution found');
  return null; // No solution found
};

export async function POST(request: NextRequest) {
  try {
    const { gameState }: { gameState: GameState } = await request.json();

    console.log('Solving level with A* algorithm...');
    console.log('Received game state:');
    console.log('Player position:', gameState.playerPos);
    console.log('Moves:', gameState.moves);
    console.log('Initial state:');
    gameState.level.forEach((row, i) => {
      console.log(`Row ${i}:`, row.map(cell => {
        switch(cell) {
          case 'wall': return '#';
          case 'floor': return ' ';
          case 'box': return '$';
          case 'goal': return '.';
          case 'player': return '@';
          case 'boxOnGoal': return '*';
          case 'playerOnGoal': return '+';
          default: return '?';
        }
      }).join(''));
    });
    
    // Check if initial state is already a goal state
    console.log('Checking if initial state is already a goal state...');
    const initialIsGoal = isGoalState(gameState.level);
    console.log('Initial state is goal state:', initialIsGoal);
    
    const solution = aStarSearch(gameState.level, gameState.playerPos);

    if (solution === null) {
      console.log('No solution found');
      return NextResponse.json({ solution: null, message: 'No solution found' });
    }

    // Print the final state for debugging
    let finalState = gameState.level;
    let finalPlayerPos = gameState.playerPos;
    for (const move of solution) {
      const moveObj = { 'U': {dx:0,dy:-1}, 'D': {dx:0,dy:1}, 'L': {dx:-1,dy:0}, 'R': {dx:1,dy:0} }[move];
      if (!moveObj) continue; // skip invalid moves
      const { newState, newPlayerPos } = applyMove(finalState, finalPlayerPos, moveObj.dx, moveObj.dy);
      finalState = newState;
      finalPlayerPos = newPlayerPos;
    }
    console.log('Final state after solution:');
    finalState.forEach((row, i) => {
      console.log(`Row ${i}:`, row.map(cell => {
        switch(cell) {
          case 'wall': return '#';
          case 'floor': return ' ';
          case 'box': return '$';
          case 'goal': return '.';
          case 'player': return '@';
          case 'boxOnGoal': return '*';
          case 'playerOnGoal': return '+';
          default: return '?';
        }
      }).join(''));
    });

    console.log('Solution found:', solution);
    return NextResponse.json({ 
      solution,
      message: `Solution found with ${solution.length} moves`
    });

  } catch (error) {
    console.error('Sokoban solver error:', error);
    return NextResponse.json({ error: 'Failed to solve level' }, { status: 500 });
  }
} 