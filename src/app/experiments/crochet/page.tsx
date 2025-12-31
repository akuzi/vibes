'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { CROCHET_PATTERNS, CrochetPattern } from '@/lib/crochet-patterns';
import { Stitch, getStitchTypeName } from '@/lib/crochet-stitches';
import {
  buildStitchesFromPattern,
  renderStitches,
  getTotalStitchCount,
  getPositionFromStitchIndex,
  getCurrentInstruction,
} from '@/lib/crochet-renderer';

const CrochetPage = () => {
  const [selectedPattern, setSelectedPattern] = useState<CrochetPattern>(CROCHET_PATTERNS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // stitches per second
  const [currentStitchIndex, setCurrentStitchIndex] = useState(0);
  const [stitchProgress, setStitchProgress] = useState(0); // 0-1 for current stitch animation
  const [filterCategory, setFilterCategory] = useState<'all' | 'simple' | 'amigurumi'>('all');
  const [renderMode, setRenderMode] = useState<'chart' | 'realistic'>('chart');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const stitchesRef = useRef<Stitch[]>([]);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const currentStitchIndexRef = useRef(currentStitchIndex);
  currentStitchIndexRef.current = currentStitchIndex;

  const stitchProgressRef = useRef(stitchProgress);
  stitchProgressRef.current = stitchProgress;

  // Build stitches when pattern or canvas changes
  const rebuildPattern = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const stitches = buildStitchesFromPattern(
      selectedPattern,
      canvas.width,
      canvas.height
    );
    stitchesRef.current = stitches;

    setCurrentStitchIndex(0);
    setStitchProgress(0);
    setIsPlaying(false);
  }, [selectedPattern]);

  // Initialize canvas and build pattern
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    rebuildPattern();

    // Handle resize
    const handleResize = () => {
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        rebuildPattern();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [rebuildPattern]);

  // Animation loop
  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = lastTimeRef.current === 0 ? 0 : currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      if (isPlayingRef.current && stitchesRef.current.length > 0) {
        const totalStitches = stitchesRef.current.length;
        const currentIndex = currentStitchIndexRef.current;
        const progress = stitchProgressRef.current;

        // Calculate progress increment based on speed
        const progressPerMs = speedRef.current / 1000; // stitches per ms
        const progressIncrement = progressPerMs * deltaTime;

        let newProgress = progress + progressIncrement;
        let newIndex = currentIndex;

        // Move to next stitch if current is complete
        while (newProgress >= 1 && newIndex < totalStitches - 1) {
          newProgress -= 1;
          newIndex++;
        }

        // Clamp progress
        if (newIndex >= totalStitches - 1) {
          newProgress = Math.min(newProgress, 1);
          if (newProgress >= 1) {
            setIsPlaying(false);
          }
        }

        // Update stitch animation progress
        if (newIndex < stitchesRef.current.length) {
          stitchesRef.current[newIndex].animationProgress = Math.min(newProgress, 1);
        }

        setStitchProgress(newProgress);
        setCurrentStitchIndex(newIndex);
      }

      // Render
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          renderStitches(ctx, stitchesRef.current, currentStitchIndexRef.current, renderMode);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderMode]);

  const handlePlayPause = () => {
    if (!isPlaying && currentStitchIndex >= stitchesRef.current.length - 1 && stitchProgress >= 1) {
      // Reset if at end
      handleReset();
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setCurrentStitchIndex(0);
    setStitchProgress(0);
    setIsPlaying(false);
    lastTimeRef.current = 0;

    // Reset all stitch animations
    stitchesRef.current.forEach(stitch => {
      stitch.animationProgress = 0;
    });
  };

  const handleStepForward = () => {
    if (currentStitchIndex < stitchesRef.current.length - 1) {
      stitchesRef.current[currentStitchIndex].animationProgress = 1;
      setCurrentStitchIndex(currentStitchIndex + 1);
      setStitchProgress(0);
    } else if (stitchProgress < 1) {
      setStitchProgress(1);
      stitchesRef.current[currentStitchIndex].animationProgress = 1;
    }
  };

  const handleStepBackward = () => {
    if (stitchProgress > 0) {
      setStitchProgress(0);
      stitchesRef.current[currentStitchIndex].animationProgress = 0;
    } else if (currentStitchIndex > 0) {
      const prevIndex = currentStitchIndex - 1;
      stitchesRef.current[prevIndex].animationProgress = 0;
      setCurrentStitchIndex(prevIndex);
      setStitchProgress(0);
    }
  };

  const handlePatternChange = (pattern: CrochetPattern) => {
    setSelectedPattern(pattern);
    setIsPlaying(false);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const totalStitches = getTotalStitchCount(selectedPattern);
  const { rowIndex, stitchInRow } = getPositionFromStitchIndex(selectedPattern, currentStitchIndex);
  const currentInstruction = getCurrentInstruction(selectedPattern, currentStitchIndex);

  const filteredPatterns = CROCHET_PATTERNS.filter(p =>
    filterCategory === 'all' || p.category === filterCategory
  );

  // Format row instructions as readable crochet notation
  const formatRowInstructions = (row: typeof selectedPattern.rows[0]): string => {
    const parts: string[] = [];

    row.forEach((instruction, idx) => {
      const abbrev = instruction.type;
      const count = instruction.count;

      if (count === 1) {
        parts.push(abbrev);
      } else {
        // Group repeated stitches
        parts.push(`${count} ${abbrev}`);
      }
    });

    return parts.join(', ');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-gray-100 p-4 flex items-center shadow-md flex-shrink-0">
        <Link href="/" className="text-gray-700 hover:text-black mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Crochet Simulator</h1>
      </header>

      <div className="flex-grow w-full flex overflow-hidden">
        {/* Canvas - Left Side */}
        <div className="flex-1 flex items-center justify-center bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
        </div>

        {/* Instructions Panel - Right Side */}
        <div className="w-96 bg-gray-50 border-l border-gray-200 overflow-y-auto p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Pattern Instructions</h2>

          {/* Stitch Guide */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">Crochet Chart Symbols</h3>
            <div className="text-xs text-blue-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">○</span>
                <span><strong>ch</strong> = Chain</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">+</span>
                <span><strong>sc</strong> = Single Crochet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">T</span>
                <span><strong>hdc</strong> = Half Double Crochet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">┬</span>
                <span><strong>dc</strong> = Double Crochet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">╬</span>
                <span><strong>tc</strong> = Treble Crochet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">•</span>
                <span><strong>sl st</strong> = Slip Stitch</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">⊙</span>
                <span><strong>mr</strong> = Magic Ring</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">++</span>
                <span><strong>inc</strong> = Increase</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg">∧</span>
                <span><strong>dec</strong> = Decrease</span>
              </div>
            </div>
          </div>

          {/* Pattern Rows */}
          <div className="space-y-2">
            {selectedPattern.rows.map((row, rowIdx) => {
              const isCurrentRow = rowIdx === rowIndex;
              const isPastRow = rowIdx < rowIndex;

              return (
                <div
                  key={rowIdx}
                  className={`p-3 rounded border-l-4 transition-all ${
                    isCurrentRow
                      ? 'bg-yellow-50 border-yellow-500 shadow-md scale-105'
                      : isPastRow
                      ? 'bg-green-50 border-green-400 opacity-70'
                      : 'bg-white border-gray-200 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`font-bold text-sm ${
                      isCurrentRow ? 'text-yellow-700' : isPastRow ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {selectedPattern.workInRound ? 'Round' : 'Row'} {rowIdx + 1}:
                    </span>
                    <div className="flex-1">
                      <div className={`text-sm font-mono ${
                        isCurrentRow ? 'text-gray-900 font-semibold' : 'text-gray-600'
                      }`}>
                        {formatRowInstructions(row)}
                      </div>
                      {isCurrentRow && (
                        <div className="mt-1 text-xs text-yellow-700">
                          → Stitch {stitchInRow + 1} of {row.reduce((sum, inst) => sum + inst.count, 0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Current row</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded"></div>
              <span>Upcoming</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col p-4 bg-gray-100 border-t border-gray-200">
        {/* Pattern Info */}
        <div className="mb-4 p-3 bg-white rounded shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-gray-800">{selectedPattern.name}</h3>
              <p className="text-sm text-gray-600">{selectedPattern.description}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>Type: {selectedPattern.workInRound ? 'In-the-round' : 'Flat work'}</span>
                <span>Difficulty: {selectedPattern.difficulty}</span>
                <span>Total stitches: {totalStitches}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Row {rowIndex + 1} / {selectedPattern.rows.length}
              </div>
              <div className="text-sm text-gray-600">
                Stitch {currentStitchIndex + 1} / {totalStitches}
              </div>
              {currentInstruction && (
                <div className="text-xs text-blue-600 mt-1">
                  {getStitchTypeName(currentInstruction.type)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Animation Controls */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset
          </button>
          <button
            onClick={handleStepBackward}
            disabled={currentStitchIndex === 0 && stitchProgress === 0}
            className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Step
          </button>
          <button
            onClick={handleStepForward}
            disabled={currentStitchIndex >= totalStitches - 1 && stitchProgress >= 1}
            className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Step →
          </button>

          {/* Speed Control */}
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-700">Speed:</label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-32"
            />
            <span className="text-sm text-gray-600 w-12">{speed}x</span>
          </div>

          {/* Render Mode Toggle */}
          <div className="flex items-center gap-2 ml-4">
            <label className="text-sm text-gray-700">View:</label>
            <div className="flex gap-1 bg-gray-200 rounded p-1">
              <button
                onClick={() => setRenderMode('chart')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  renderMode === 'chart'
                    ? 'bg-white text-gray-900 font-medium shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Chart
              </button>
              <button
                onClick={() => setRenderMode('realistic')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  renderMode === 'realistic'
                    ? 'bg-white text-gray-900 font-medium shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                3D Realistic
              </button>
            </div>
          </div>
        </div>

        {/* Pattern Selection */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-gray-700">Pattern:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1 text-xs rounded ${
                  filterCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCategory('simple')}
                className={`px-3 py-1 text-xs rounded ${
                  filterCategory === 'simple'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => setFilterCategory('amigurumi')}
                className={`px-3 py-1 text-xs rounded ${
                  filterCategory === 'amigurumi'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Amigurumi
              </button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {filteredPatterns.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => handlePatternChange(pattern)}
                className={`px-3 py-2 rounded text-sm ${
                  selectedPattern.id === pattern.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {pattern.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrochetPage;
