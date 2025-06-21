'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Grid from '@/components/cells/Grid';
import Controls from '@/components/cells/Controls';
import {
  createRandomGrid,
  getNextGeneration,
  CELL_SIZE,
  createGridWithPattern,
  GlitchLevel,
} from '@/lib/game-of-life';
import { PATTERNS, Pattern } from '@/lib/patterns';
import { COLOR_SCHEMES, ColorScheme } from '@/lib/colors';

const CellsPage = () => {
  const [grid, setGrid] = useState<number[][]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(100); // ms
  const [selectedPattern, setSelectedPattern] = useState<Pattern>(PATTERNS[0]);
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme>(
    COLOR_SCHEMES[0]
  );
  const [generation, setGeneration] = useState(0);
  const [glitchLevel, setGlitchLevel] = useState<GlitchLevel>('None');

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const runningRef = useRef(isRunning);
  runningRef.current = isRunning;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const glitchLevelRef = useRef(glitchLevel);
  glitchLevelRef.current = glitchLevel;

  const runSimulation = useCallback(() => {
    if (!runningRef.current) {
      return;
    }
    setGrid((g) => getNextGeneration(g, glitchLevelRef.current));
    setGeneration((g) => g + 1);
    setTimeout(runSimulation, speedRef.current);
  }, []);

  const resetGrid = useCallback(() => {
    if (gridContainerRef.current) {
      const { width, height } =
        gridContainerRef.current.getBoundingClientRect();
      const newWidth = Math.floor(width / CELL_SIZE);
      const newHeight = Math.floor(height / CELL_SIZE);

      let newGrid;
      if (selectedPattern.name === 'Random') {
        newGrid = createRandomGrid(newWidth, newHeight);
      } else {
        newGrid = createGridWithPattern(
          newWidth,
          newHeight,
          selectedPattern.pattern
        );
      }
      setGrid(newGrid);
      setIsRunning(false);
      setGeneration(0);
    }
  }, [selectedPattern]);

  useEffect(() => {
    resetGrid();
    window.addEventListener('resize', resetGrid);
    return () => window.removeEventListener('resize', resetGrid);
  }, [resetGrid]);

  useEffect(() => {
    if (isRunning) {
      runningRef.current = true;
      runSimulation();
    }
  }, [isRunning, runSimulation]);

  const handleTogglePlay = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    resetGrid();
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const handlePatternChange = (pattern: Pattern) => {
    setSelectedPattern(pattern);
    setIsRunning(false);
  };

  useEffect(() => {
    resetGrid();
  }, [selectedPattern, resetGrid]);

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setSelectedColorScheme(scheme);
  };

  const handleGlitchLevelChange = (level: GlitchLevel) => {
    setGlitchLevel(level);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div
        ref={gridContainerRef}
        className="flex-grow w-full flex items-center justify-center overflow-hidden"
      >
        <Grid
          grid={grid}
          colorScheme={selectedColorScheme}
          generation={generation}
        />
      </div>
      <div className="flex justify-center p-4">
        <Controls
          isRunning={isRunning}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
          speed={speed}
          onSpeedChange={handleSpeedChange}
          selectedPattern={selectedPattern}
          onPatternChange={handlePatternChange}
          selectedColorScheme={selectedColorScheme}
          onColorSchemeChange={handleColorSchemeChange}
          glitchLevel={glitchLevel}
          onGlitchLevelChange={handleGlitchLevelChange}
        />
      </div>
    </div>
  );
};

export default CellsPage; 