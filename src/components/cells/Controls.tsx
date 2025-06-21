import React from 'react';
import { Pattern, PATTERNS } from '@/lib/patterns';
import { ColorScheme, COLOR_SCHEMES } from '@/lib/colors';
import { GlitchLevel } from '@/lib/game-of-life';

interface ControlsProps {
  isRunning: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  speed: number;
  onPatternChange: (pattern: Pattern) => void;
  selectedPattern: Pattern;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  selectedColorScheme: ColorScheme;
  glitchLevel: GlitchLevel;
  onGlitchLevelChange: (level: GlitchLevel) => void;
}

const Controls: React.FC<ControlsProps> = ({
  isRunning,
  onTogglePlay,
  onReset,
  onSpeedChange,
  speed,
  onPatternChange,
  selectedPattern,
  onColorSchemeChange,
  selectedColorScheme,
  glitchLevel,
  onGlitchLevelChange,
}) => {
  if (!selectedColorScheme) {
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
        <label htmlFor="speed">Speed:</label>
        <input
          type="range"
          id="speed"
          min="50"
          max="1000"
          step="50"
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-24 md:w-48"
        />
        <span>{speed}ms</span>
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
        <label htmlFor="color-scheme">Color Scheme:</label>
        <select
          id="color-scheme"
          value={selectedColorScheme.name}
          onChange={(e) => {
            const newScheme = COLOR_SCHEMES.find(s => s.name === e.target.value);
            if (newScheme) {
              onColorSchemeChange(newScheme);
            }
          }}
          className="px-2 py-1 border rounded"
        >
          {COLOR_SCHEMES.map(s => (
            <option key={s.name} value={s.name}>
              {s.name}
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
    </div>
  );
};

export default Controls;
