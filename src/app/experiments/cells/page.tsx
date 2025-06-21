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
import { SCALES, Scale } from '@/lib/music';
import { AudioEngine, InstrumentName } from '@/lib/audio';

const CellsPage = () => {
  const [grid, setGrid] = useState<number[][]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(300); // ms
  const [selectedPattern, setSelectedPattern] = useState<Pattern>(PATTERNS.find(p => p.name === 'Diehard') || PATTERNS[0]);
  const [selectedColorScheme, setSelectedColorScheme] = useState<ColorScheme>(
    COLOR_SCHEMES.find(s => s.name === 'Ripple') || COLOR_SCHEMES[0]
  );
  const [generation, setGeneration] = useState(0);
  const [glitchLevel, setGlitchLevel] = useState<GlitchLevel>('Low');
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [selectedScale, setSelectedScale] = useState<Scale>(SCALES.find(s => s.name === 'C Pentatonic Minor') || SCALES[0]);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  const runningRef = useRef(isRunning);
  runningRef.current = isRunning;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const glitchLevelRef = useRef(glitchLevel);
  glitchLevelRef.current = glitchLevel;
  
  const isMusicEnabledRef = useRef(isMusicEnabled);
  isMusicEnabledRef.current = isMusicEnabled;

  const selectedScaleRef = useRef(selectedScale);
  selectedScaleRef.current = selectedScale;

  const runSimulation = useCallback(() => {
    if (!runningRef.current) {
      return;
    }

    setGrid((prevGrid) => {
      const newGrid = getNextGeneration(prevGrid, glitchLevelRef.current);

      if (isMusicEnabledRef.current && audioEngineRef.current) {
        const notesToPlay: { midiNote: number; instrument: InstrumentName }[] = [];
        const scaleNotes = selectedScaleRef.current.notes;
        const numNotes = scaleNotes.length;
        const gridHeight = newGrid.length;
        const gridWidth = newGrid[0]?.length || 1;
        const colsPerNote = Math.max(1, Math.floor(gridWidth / numNotes));

        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            if (newGrid[y][x] === 2) {
              const noteIndex = Math.floor(x / colsPerNote) % numNotes;
              const midiNote = scaleNotes[noteIndex];
              
              if (midiNote !== undefined) {
                let instrument: InstrumentName = 'acoustic_grand_piano';
                if (x < gridWidth / 2 && y < gridHeight / 2) {
                  instrument = 'violin'; // Top-left
                } else if (x >= gridWidth / 2 && y < gridHeight / 2) {
                  instrument = 'viola'; // Top-right
                } else if (x < gridWidth / 2 && y >= gridHeight / 2) {
                  instrument = 'acoustic_guitar_nylon'; // Bottom-left
                }

                // Avoid playing same note with same instrument
                if (!notesToPlay.some(n => n.midiNote === midiNote && n.instrument === instrument)) {
                  notesToPlay.push({ midiNote, instrument });
                }
              }
            }
          }
        }

        // Limit the number of notes playing at once for clarity
        const maxNotes = 8;
        if (notesToPlay.length > maxNotes) {
          // Shuffle and pick a few notes to play
          for (let i = notesToPlay.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [notesToPlay[i], notesToPlay[j]] = [notesToPlay[j], notesToPlay[i]];
          }
          notesToPlay.length = maxNotes;
        }

        notesToPlay.forEach(({midiNote, instrument}) => {
          audioEngineRef.current?.playNote(midiNote, instrument);
        })
      }

      return newGrid;
    });

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
      if (isMusicEnabled && !audioEngineRef.current) {
        audioEngineRef.current = new AudioEngine();
      }
      audioEngineRef.current?.start();
      runningRef.current = true;
      runSimulation();
    }
  }, [isRunning, runSimulation, isMusicEnabled]);

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

  const handleToggleMusic = () => {
    setIsMusicEnabled(prev => !prev);
  }

  const handleScaleChange = (scale: Scale) => {
    setSelectedScale(scale);
  }

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
          isMusicEnabled={isMusicEnabled}
          onToggleMusic={handleToggleMusic}
          selectedScale={selectedScale}
          onScaleChange={handleScaleChange}
        />
      </div>
    </div>
  );
};

export default CellsPage; 