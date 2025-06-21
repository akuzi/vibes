import React from 'react';
import { Pattern, PATTERNS } from '@/lib/patterns';
import { GlitchLevel, MelodyMode } from '@/lib/game-of-life';
import { InstrumentSet, INSTRUMENT_SETS } from '@/lib/audio';

interface ControlsProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onBpmChange: (speed: number) => void;
  bpm: number;
  onPatternChange: (pattern: Pattern) => void;
  selectedPattern: Pattern;
  glitchLevel: GlitchLevel;
  onGlitchLevelChange: (level: GlitchLevel) => void;
  isMusicEnabled: boolean;
  onToggleMusic: () => void;
  selectedInstrumentSet: InstrumentSet;
  onInstrumentSetChange: (instrumentSet: InstrumentSet) => void;
  melodyMode: MelodyMode;
  onMelodyModeChange: (mode: MelodyMode) => void;
}

const Controls: React.FC<ControlsProps> = ({
  isRunning,
  onTogglePlay,
  onReset,
  onBpmChange,
  bpm,
  onPatternChange,
  selectedPattern,
  glitchLevel,
  onGlitchLevelChange,
  isMusicEnabled,
  onToggleMusic,
  selectedInstrumentSet,
  onInstrumentSetChange,
  melodyMode,
  onMelodyModeChange,
}) => {
  if (!selectedPattern || !selectedInstrumentSet) {
    // This can happen briefly on hot-reload.
    // Return null or a loading state to prevent crashing.
    return null;
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 p-4 bg-gray-100 rounded-lg">
      <button
        onClick={onTogglePlay}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {isRunning ? 'Pause' : 'Play'}
      </button>
      <button
        onClick={onReset}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Reset
      </button>
      <div className="flex items-center space-x-2">
        <label htmlFor="speed">BPM:</label>
        <input
          type="range"
          id="speed"
          min="40"
          max="240"
          step="1"
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="w-24 md:w-48"
        />
        <span>{bpm}</span>
      </div>
      <div className="flex items-center space-x-2">
        <label htmlFor="pattern">Pattern:</label>
        <select
          id="pattern"
          value={selectedPattern ? selectedPattern.name : ''}
          onChange={(e) => {
            const newPattern = PATTERNS.find(p => p.name === e.target.value);
            if (newPattern) {
              onPatternChange(newPattern);
            }
          }}
          className="px-2 py-1 border rounded"
        >
          {PATTERNS.map(p => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <label htmlFor="glitches">Glitches:</label>
        <select
          id="glitches"
          value={glitchLevel}
          onChange={(e) => onGlitchLevelChange(e.target.value as GlitchLevel)}
          className="px-2 py-1 border rounded"
        >
          <option value="None">None</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <label htmlFor="music-toggle">Music:</label>
        <button
          onClick={onToggleMusic}
          className={`px-4 py-2 text-white rounded ${
            isMusicEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'
          }`}
        >
          {isMusicEnabled ? 'On' : 'Off'}
        </button>
      </div>
      {isMusicEnabled && (
        <>
          <div className="flex items-center space-x-2">
            <label htmlFor="instrument-set">Instruments:</label>
            <select
              id="instrument-set"
              value={selectedInstrumentSet.name}
              onChange={(e) => {
                const newSet = INSTRUMENT_SETS.find(s => s.name === e.target.value);
                if (newSet) {
                  onInstrumentSetChange(newSet);
                }
              }}
              className="px-2 py-1 border rounded"
            >
              {INSTRUMENT_SETS.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="melody-mode">Melody Mode:</label>
            <select
              id="melody-mode"
              value={melodyMode}
              onChange={(e) => onMelodyModeChange(e.target.value as MelodyMode)}
              className="px-2 py-1 border rounded"
            >
              <option value="Horizontal">Horizontal</option>
              <option value="Vertical">Vertical</option>
              <option value="Random">Random</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
};

export default Controls;
