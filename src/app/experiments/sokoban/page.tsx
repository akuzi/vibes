'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// Sokoban game types
type Cell = 'wall' | 'floor' | 'box' | 'goal' | 'player' | 'boxOnGoal' | 'playerOnGoal';
type Position = { x: number; y: number };

// Simple Sokoban level (walls around edges, boxes, goals, player)
const initialLevel: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'goal', 'floor', 'player', 'box', 'floor', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'box', 'box', 'floor', 'goal', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'goal', 'floor', 'box', 'box', 'box', 'goal', 'wall', 'wall', 'wall'],
  ['wall', 'wall', 'wall', 'floor', 'goal', 'floor', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

// Classic Sokoban Levels 1-5
const level2: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'box', 'floor', 'box', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'player', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'box', 'floor', 'box', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'goal', 'floor', 'goal', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

const level3: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'box', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'player', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'box', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'goal', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'goal', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

const level4: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'wall', 'wall'],
  ['wall', 'floor', 'box', 'goal', 'wall', 'wall'],
  ['wall', 'floor', 'player', 'goal', 'wall', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

// Level 5 - Complex: Multi-box corridor with strategic positioning
const level5: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'box', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'player', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'box', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'goal', 'floor', 'goal', 'floor', 'goal', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

// Level 6 - Advanced: Labyrinth with dead ends and strategic routing
const level6: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'wall', 'wall', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'player', 'floor', 'wall', 'wall', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'floor', 'floor', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'goal', 'floor', 'goal', 'floor', 'goal', 'floor', 'goal', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

// Level 7 - Expert: Complex maze with multiple paths and strategic box placement
const level7: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'wall', 'floor', 'wall', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'player', 'floor', 'floor', 'floor', 'floor', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'goal', 'floor', 'floor', 'floor', 'floor', 'floor', 'goal', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

// Level 8 - Master: Intricate puzzle with multiple interconnected areas
const level8: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'wall', 'floor', 'floor', 'wall', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'player', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'goal', 'floor', 'goal', 'floor', 'floor', 'goal', 'floor', 'goal', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

// Level 9 - Grandmaster: Extremely complex with multiple dead ends and strategic routing
const level9: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'player', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'goal', 'floor', 'goal', 'floor', 'floor', 'floor', 'goal', 'floor', 'goal', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

// Level 10 - Legendary: Ultimate challenge with maximum complexity
const level10: Cell[][] = [
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'wall', 'floor', 'floor', 'floor', 'floor', 'wall', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'player', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'box', 'floor', 'wall', 'floor', 'floor', 'floor', 'floor', 'wall', 'floor', 'box', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'floor', 'wall', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'floor', 'goal', 'floor', 'goal', 'floor', 'floor', 'floor', 'floor', 'goal', 'floor', 'goal', 'floor', 'wall'],
  ['wall', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'floor', 'wall'],
  ['wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
];

const levels = [
  { id: 1, name: "Level 1", data: initialLevel, playerPos: { x: 3, y: 2 } },
  { id: 2, name: "Level 2", data: level2, playerPos: { x: 4, y: 4 } },
  { id: 3, name: "Level 3", data: level3, playerPos: { x: 4, y: 4 } },
  { id: 4, name: "Level 4", data: level4, playerPos: { x: 2, y: 4 } },
  { id: 5, name: "Level 5", data: level5, playerPos: { x: 3, y: 3 } },
  { id: 6, name: "Level 6", data: level6, playerPos: { x: 1, y: 5 } },
  { id: 7, name: "Level 7", data: level7, playerPos: { x: 1, y: 5 } },
  { id: 8, name: "Level 8", data: level8, playerPos: { x: 1, y: 5 } },
  { id: 9, name: "Level 9", data: level9, playerPos: { x: 1, y: 5 } },
  { id: 10, name: "Level 10", data: level10, playerPos: { x: 1, y: 5 } },
];

export default function PortabanPage() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [level, setLevel] = useState<Cell[][]>(levels[0].data);
  const [playerPos, setPlayerPos] = useState<Position>(levels[0].playerPos);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [completedLevels, setCompletedLevels] = useState<boolean[]>(Array(levels.length).fill(false));
  const [isSolving, setIsSolving] = useState(false);
  const [showNoSolution, setShowNoSolution] = useState(false);

  // Check if level is complete
  const checkCompletion = useCallback((grid: Cell[][]): boolean => {
    let totalGoals = 0;
    let boxOnGoalCount = 0;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === 'goal' || grid[y][x] === 'boxOnGoal' || grid[y][x] === 'playerOnGoal') totalGoals++;
        if (grid[y][x] === 'boxOnGoal') boxOnGoalCount++;
      }
    }
    return boxOnGoalCount > 0 && boxOnGoalCount === totalGoals;
  }, []);

  // Move player
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (isComplete) return;

    const newLevel = level.map(row => [...row]);
    const newPlayerPos = { x: playerPos.x + dx, y: playerPos.y + dy };
    const targetCell = newLevel[newPlayerPos.y][newPlayerPos.x];

    // Check if move is valid
    if (targetCell === 'wall') return;

    let canMove = false;
    let newTargetCell: Cell = targetCell;

    if (targetCell === 'floor' || targetCell === 'goal') {
      canMove = true;
      newTargetCell = targetCell === 'goal' ? 'playerOnGoal' : 'player';
    } else if (targetCell === 'box' || targetCell === 'boxOnGoal') {
      // Try to push box
      const boxNewX = newPlayerPos.x + dx;
      const boxNewY = newPlayerPos.y + dy;
      const boxTargetCell = newLevel[boxNewY][boxNewX];

      if (boxTargetCell === 'floor' || boxTargetCell === 'goal') {
        canMove = true;
        // Move box
        newLevel[boxNewY][boxNewX] = boxTargetCell === 'goal' ? 'boxOnGoal' : 'box';
        // Move player
        newTargetCell = targetCell === 'boxOnGoal' ? 'playerOnGoal' : 'player';
      }
    }

    if (canMove) {
      // Update player position
      newLevel[playerPos.y][playerPos.x] = 
        newLevel[playerPos.y][playerPos.x] === 'playerOnGoal' ? 'goal' : 'floor';
      newLevel[newPlayerPos.y][newPlayerPos.x] = newTargetCell;

      setLevel(newLevel);
      setPlayerPos(newPlayerPos);
      setMoves(moves + 1);

      // Check completion
      if (checkCompletion(newLevel)) {
        setIsComplete(true);
        setCompletedLevels(prev => {
          const updated = [...prev];
          updated[currentLevelIndex] = true;
          return updated;
        });
      }
    }
  }, [level, playerPos, moves, isComplete, checkCompletion, currentLevelIndex]);

  // Reset level
  const resetLevel = useCallback(() => {
    const currentLevel = levels[currentLevelIndex];
    setLevel(currentLevel.data.map(row => [...row]));
    setPlayerPos(currentLevel.playerPos);
    setMoves(0);
    setIsComplete(false);
  }, [currentLevelIndex]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault();
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault();
          movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault();
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault();
          movePlayer(1, 0);
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          resetLevel();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer, resetLevel]);

  // Load level
  const loadLevel = (levelIndex: number) => {
    const newLevel = levels[levelIndex];
    setCurrentLevelIndex(levelIndex);
    setLevel(newLevel.data.map(row => [...row]));
    setPlayerPos(newLevel.playerPos);
    setMoves(0);
    setIsComplete(completedLevels[levelIndex]);
  };

  // Solve level using AI
  const solveLevel = async () => {
    if (isComplete) return;
    
    setIsSolving(true);
    setShowNoSolution(false);

    try {
      const response = await fetch('/api/sokoban-solver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameState: {
            level,
            playerPos,
            moves
          }
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('AI Response:', data);

      if (data.solution === null) {
        setShowNoSolution(true);
        setTimeout(() => setShowNoSolution(false), 3000);
      } else {
        // Execute the solution moves
        executeSolution(data.solution);
      }
    } catch (error) {
      console.error('Solve error:', error);
      setShowNoSolution(true);
      setTimeout(() => setShowNoSolution(false), 3000);
    } finally {
      setIsSolving(false);
    }
  };

  // Execute solution moves
  const executeSolution = (moves: string[]) => {
    console.log('Executing solution:', moves);
    let index = 0;
    
    // Start with current state
    let currentLevel = level.map(row => [...row]);
    let currentPlayerPos = { ...playerPos };
    
    const executeMove = () => {
      if (index >= moves.length || isComplete) {
        return;
      }

      const move = moves[index];
      console.log(`Executing move ${index + 1}/${moves.length}: ${move}`);
      
      // Create a simple move function that uses current state
      const simpleMove = (dx: number, dy: number) => {
        const newLevel = currentLevel.map(row => [...row]);
        const newPlayerPos = { x: currentPlayerPos.x + dx, y: currentPlayerPos.y + dy };
        const targetCell = newLevel[newPlayerPos.y][newPlayerPos.x];

        // Check if move is valid
        if (targetCell === 'wall') return false;

        let canMove = false;
        let newTargetCell: Cell = targetCell;

        if (targetCell === 'floor' || targetCell === 'goal') {
          canMove = true;
          newTargetCell = targetCell === 'goal' ? 'playerOnGoal' : 'player';
        } else if (targetCell === 'box' || targetCell === 'boxOnGoal') {
          // Try to push box
          const boxNewX = newPlayerPos.x + dx;
          const boxNewY = newPlayerPos.y + dy;
          const boxTargetCell = newLevel[boxNewY][boxNewX];

          if (boxTargetCell === 'floor' || boxTargetCell === 'goal') {
            canMove = true;
            // Move box
            newLevel[boxNewY][boxNewX] = boxTargetCell === 'goal' ? 'boxOnGoal' : 'box';
            // Move player
            newTargetCell = targetCell === 'boxOnGoal' ? 'playerOnGoal' : 'player';
          }
        }

        if (canMove) {
          // Update player position
          newLevel[currentPlayerPos.y][currentPlayerPos.x] = 
            newLevel[currentPlayerPos.y][currentPlayerPos.x] === 'playerOnGoal' ? 'goal' : 'floor';
          newLevel[newPlayerPos.y][newPlayerPos.x] = newTargetCell;

          // Update current state for next move
          currentLevel = newLevel;
          currentPlayerPos = newPlayerPos;

          // Update React state
          setLevel(newLevel);
          setPlayerPos(newPlayerPos);
          setMoves(prev => prev + 1);

          // Check completion
          if (checkCompletion(newLevel)) {
            setIsComplete(true);
            setCompletedLevels(prev => {
              const updated = [...prev];
              updated[currentLevelIndex] = true;
              return updated;
            });
          }
          return true;
        }
        return false;
      };

      let moveExecuted = false;
      switch (move) {
        case 'U':
          moveExecuted = simpleMove(0, -1);
          break;
        case 'D':
          moveExecuted = simpleMove(0, 1);
          break;
        case 'L':
          moveExecuted = simpleMove(-1, 0);
          break;
        case 'R':
          moveExecuted = simpleMove(1, 0);
          break;
      }

      if (!moveExecuted) {
        console.log(`Move ${move} was invalid, skipping`);
      }

      index++;
      
      if (index < moves.length && !isComplete) {
        setTimeout(executeMove, 500);
      }
    };

    executeMove();
  };

  // Get cell display
  const getCellDisplay = (cell: Cell) => {
    switch (cell) {
      case 'wall': return '';
      case 'floor': return '';
      case 'box': return 'box';
      case 'goal': return 'goal';
      case 'player': return 'player';
      case 'boxOnGoal': return 'boxOnGoal';
      case 'playerOnGoal': return 'playerOnGoal';
      default: return '';
    }
  };

  // Get cell sprite component
  const getCellSprite = (cellType: string) => {
    switch (cellType) {
      case 'box':
        return (
          <div className="w-6 h-6 bg-amber-600 border-2 border-amber-800 rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 bg-amber-400 rounded-sm"></div>
          </div>
        );
      case 'goal':
        return (
          <div className="w-6 h-6 border-2 border-yellow-400 border-dashed rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
          </div>
        );
      case 'player':
        return (
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
          </div>
        );
      case 'boxOnGoal':
        return (
          <div className="w-6 h-6 bg-green-600 border-2 border-green-800 rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
          </div>
        );
      case 'playerOnGoal':
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-green-300 rounded-full"></div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 flex items-center shadow-md flex-shrink-0">
        <Link href="/" className="text-gray-300 hover:text-white mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-white">Sokoban Solver</h1>
      </header>
      
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-6xl w-full">
          <div className="flex space-x-8">
            {/* Left Panel - Instructions and Controls */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-gray-800 p-6 rounded-lg h-fit">
                <h2 className="text-xl font-bold mb-4 text-green-400">How to Play</h2>
                <p className="text-sm mb-4 text-gray-300">
                  Push the boxes onto the storage spaces.
                </p>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
                    </div>
                    <span className="text-sm text-gray-300">Player</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-amber-600 border-2 border-amber-800 rounded-sm flex items-center justify-center">
                      <div className="w-3 h-3 bg-amber-400 rounded-sm"></div>
                    </div>
                    <span className="text-sm text-gray-300">Box</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-yellow-400 border-dashed rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    </div>
                    <span className="text-sm text-gray-300">Storage Space</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-600 border-2 border-green-800 rounded-sm flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                    </div>
                    <span className="text-sm text-gray-300">Box on Storage</span>
                  </div>
                </div>
                
                <button
                  onClick={resetLevel}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-semibold"
                >
                  Reset Level
                </button>
                
                <button
                  onClick={solveLevel}
                  disabled={isSolving || isComplete}
                  className="w-full px-6 py-3 mt-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-semibold"
                >
                  {isSolving ? 'Solving...' : 'Solve Level'}
                </button>
              </div>
            </div>

            {/* Center Panel - Game Board */}
            <div className="flex-1 flex justify-center">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="grid gap-1" style={{ 
                  gridTemplateColumns: `repeat(${level[0].length}, 1fr)` 
                }}>
                  {level.map((row, y) =>
                    row.map((cell, x) => (
                      <div
                        key={`${x}-${y}`}
                        className="w-8 h-8 flex items-center justify-center text-2xl border border-gray-600"
                        style={{ 
                          backgroundColor: cell === 'wall' ? '#8B4513' : '#1F2937' 
                        }}
                      >
                        {getCellSprite(getCellDisplay(cell))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Level List */}
            <div className="w-32 flex-shrink-0">
              <div className="bg-gray-800 p-2 rounded-lg h-fit">
                <div className="space-y-1">
                  {levels.map((level, index) => (
                    <button
                      key={level.id}
                      onClick={() => loadLevel(index)}
                      className={`w-full flex items-center justify-between text-xs p-2 rounded transition-colors font-mono border border-gray-700 ${
                        index === currentLevelIndex
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      <span>
                        {level.name}
                      </span>
                      {completedLevels[index] && (
                        <span className="ml-1">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* No Solution Modal */}
      {showNoSolution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg border border-red-500">
            <h3 className="text-2xl font-bold text-red-400 mb-4 text-center">No Solution!</h3>
            <p className="text-gray-300 text-center">This level cannot be solved from the current state.</p>
          </div>
        </div>
      )}
    </div>
  );
} 