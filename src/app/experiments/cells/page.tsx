'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Grid from '@/components/cells/Grid';
import Controls from '@/components/cells/Controls';
import {
  createRandomGrid,
  getNextGeneration,
  CELL_SIZE,
  createGridWithPattern,
  GlitchLevel,
  MelodyMode,
} from '@/lib/game-of-life';
import { PATTERNS, Pattern } from '@/lib/patterns';
import { COLOR_SCHEMES } from '@/lib/colors';
import { SCALES } from '@/lib/music';
import { AudioEngine, InstrumentName, InstrumentSet, INSTRUMENT_SETS } from '@/lib/audio';

const CellsPage = () => {
  const [grid, setGrid] = useState<number[][]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [selectedPattern, setSelectedPattern] = useState<Pattern>(
    PATTERNS.find(p => p.name === 'Gosper Glider Gun') || PATTERNS[0]
  );
  const [generation, setGeneration] = useState(0);
  const [glitchLevel, setGlitchLevel] = useState<GlitchLevel>('Low');
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [selectedInstrumentSet, setSelectedInstrumentSet] = useState<InstrumentSet>(
    INSTRUMENT_SETS.find(s => s.name === 'Minimal') || INSTRUMENT_SETS[0]
  );
  const [melodyMode, setMelodyMode] = useState<MelodyMode>('Random');

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);

  const runningRef = useRef(isRunning);
  runningRef.current = isRunning;

  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const glitchLevelRef = useRef(glitchLevel);
  glitchLevelRef.current = glitchLevel;
  
  const isMusicEnabledRef = useRef(isMusicEnabled);
  isMusicEnabledRef.current = isMusicEnabled;

  const selectedInstrumentSetRef = useRef(selectedInstrumentSet);
  selectedInstrumentSetRef.current = selectedInstrumentSet;

  const melodyModeRef = useRef(melodyMode);
  melodyModeRef.current = melodyMode;

  const runSimulation = useCallback(() => {
    if (!runningRef.current) {
      return;
    }

    setGrid((prevGrid) => {
      const newGrid = getNextGeneration(prevGrid, glitchLevelRef.current);

      if (isMusicEnabledRef.current && audioEngineRef.current) {
        const notesToPlay: { midiNote: number; instrument: InstrumentName }[] = [];
        const scaleNotes = SCALES.find(s => s.name === 'C Pentatonic Minor')?.notes || SCALES[0].notes;
        const numNotes = scaleNotes.length;
        const gridHeight = newGrid.length;
        const gridWidth = newGrid[0]?.length || 1;
        const instruments = selectedInstrumentSetRef.current.instruments;

        for (let y = 0; y < gridHeight; y++) {
          for (let x = 0; x < gridWidth; x++) {
            if (newGrid[y][x] === 2) {
              
              let instrument: InstrumentName;
              if (x < gridWidth / 2 && y < gridHeight / 2) {
                instrument = instruments.q1;
              } else if (x >= gridWidth / 2 && y < gridHeight / 2) {
                instrument = instruments.q2;
              } else if (x < gridWidth / 2 && y >= gridHeight / 2) {
                instrument = instruments.q3;
              } else {
                instrument = instruments.q4;
              }
              
              let midiNote: number | undefined;
              if (instrument === 'synth_drum') {
                const drumNotes = [36, 38, 42, 49];
                const drumIndex = (x - Math.floor(gridWidth / 2)) % drumNotes.length;
                midiNote = drumNotes[drumIndex];
              } else {
                switch (melodyModeRef.current) {
                  case 'Horizontal': {
                    const colsPerNote = Math.max(1, Math.floor(gridWidth / numNotes));
                    const noteIndex = Math.floor(x / colsPerNote) % numNotes;
                    midiNote = scaleNotes[noteIndex];
                    break;
                  }
                  case 'Vertical': {
                    const rowsPerNote = Math.max(1, Math.floor(gridHeight / numNotes));
                    const noteIndex = Math.floor(y / rowsPerNote) % numNotes;
                    midiNote = scaleNotes[noteIndex];
                    break;
                  }
                  case 'Random': {
                    midiNote = scaleNotes[Math.floor(Math.random() * numNotes)];
                    break;
                  }
                }
              }

              if (midiNote !== undefined) {
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
    const timeout = (60 * 1000) / bpmRef.current;
    setTimeout(runSimulation, timeout);
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
      const startEngine = async () => {
        if (isMusicEnabled && !audioEngineRef.current) {
          audioEngineRef.current = new AudioEngine();
        }
        await audioEngineRef.current?.start();
        runningRef.current = true;
        runSimulation();
      };
      startEngine();
    }
  }, [isRunning, runSimulation, isMusicEnabled]);

  const handleTogglePlay = () => {
    setIsRunning(!isRunning);
    if (isRunning) {
      audioEngineRef.current?.stopAllSounds();
    }
  };

  const handleReset = () => {
    resetGrid();
  };

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
  };

  const handlePatternChange = (pattern: Pattern) => {
    setSelectedPattern(pattern);
    setIsRunning(false);
  };

  useEffect(() => {
    resetGrid();
  }, [selectedPattern, resetGrid]);

  const handleGlitchLevelChange = (level: GlitchLevel) => {
    setGlitchLevel(level);
  };

  const handleToggleMusic = () => {
    setIsMusicEnabled(prev => !prev);
  }

  const handleInstrumentSetChange = (set: InstrumentSet) => {
    setSelectedInstrumentSet(set);
  }

  const handleMelodyModeChange = (mode: MelodyMode) => {
    setMelodyMode(mode);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-gray-100 p-4 flex items-center shadow-md flex-shrink-0">
        <Link href="/" className="text-gray-700 hover:text-black mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Musical Cells</h1>
      </header>
      <div
        ref={gridContainerRef}
        className="flex-grow w-full flex items-center justify-center overflow-hidden"
      >
        <Grid
          grid={grid}
          colorScheme={COLOR_SCHEMES.find(s => s.name === 'Ripple') || COLOR_SCHEMES[0]}
          generation={generation}
        />
      </div>
      <div className="flex justify-center p-4">
        <Controls
          isRunning={isRunning}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
          bpm={bpm}
          onBpmChange={handleBpmChange}
          selectedPattern={selectedPattern}
          onPatternChange={handlePatternChange}
          glitchLevel={glitchLevel}
          onGlitchLevelChange={handleGlitchLevelChange}
          isMusicEnabled={isMusicEnabled}
          onToggleMusic={handleToggleMusic}
          selectedInstrumentSet={selectedInstrumentSet}
          onInstrumentSetChange={handleInstrumentSetChange}
          melodyMode={melodyMode}
          onMelodyModeChange={handleMelodyModeChange}
        />
      </div>
    </div>
  );
};

export default CellsPage; 