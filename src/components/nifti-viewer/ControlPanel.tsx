'use client';

import React from 'react';
import {
  WindowLevel,
  ColorMap,
  WINDOW_PRESETS,
  COLOR_MAP_OPTIONS,
} from '@/lib/nifti-viewer/colorMaps';
import { ImageVolume } from '@/lib/nifti-viewer/types';

interface ControlPanelProps {
  volume: ImageVolume | null;
  windowLevel: WindowLevel;
  onWindowLevelChange: (wl: WindowLevel) => void;
  overlayOpacity: number;
  onOverlayOpacityChange: (opacity: number) => void;
  overlayColorMap: ColorMap;
  onOverlayColorMapChange: (colorMap: ColorMap) => void;
  overlayFlipHorizontal: boolean;
  onOverlayFlipHorizontalChange: (value: boolean) => void;
  overlayFlipVertical: boolean;
  onOverlayFlipVerticalChange: (value: boolean) => void;
  overlayFlipDepth: boolean;
  onOverlayFlipDepthChange: (value: boolean) => void;
  primaryColorMap: ColorMap;
  onPrimaryColorMapChange: (colorMap: ColorMap) => void;
  show3D: boolean;
  onShow3DChange: (show: boolean) => void;
  renderMode: 'mip' | 'isosurface';
  onRenderModeChange: (mode: 'mip' | 'isosurface') => void;
}

export default function ControlPanel({
  volume,
  windowLevel,
  onWindowLevelChange,
  overlayOpacity,
  onOverlayOpacityChange,
  overlayColorMap,
  onOverlayColorMapChange,
  overlayFlipHorizontal,
  onOverlayFlipHorizontalChange,
  overlayFlipVertical,
  onOverlayFlipVerticalChange,
  overlayFlipDepth,
  onOverlayFlipDepthChange,
  primaryColorMap,
  onPrimaryColorMapChange,
  show3D,
  onShow3DChange,
  renderMode,
  onRenderModeChange,
}: ControlPanelProps) {
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = WINDOW_PRESETS.find((p) => p.name === e.target.value);
    if (preset) {
      if (preset.name === 'Auto' && volume) {
        onWindowLevelChange({
          center: (volume.minValue + volume.maxValue) / 2,
          width: volume.maxValue - volume.minValue,
        });
      } else {
        onWindowLevelChange({ center: preset.center, width: preset.width });
      }
    }
  };

  const minRange = volume?.minValue ?? -1000;
  const maxRange = volume?.maxValue ?? 3000;

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4 border border-gray-700">
      <div>
        <h3 className="text-sm font-medium text-gray-200 mb-3">Window/Level</h3>
        <div className="space-y-3">
          <div>
            <label className="flex items-center justify-between text-xs text-gray-300 mb-1">
              <span>Preset</span>
            </label>
            <select
              onChange={handlePresetChange}
              className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-400"
            >
              {WINDOW_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center justify-between text-xs text-gray-300 mb-1">
              <span>Center</span>
              <span className="text-white">{windowLevel.center.toFixed(0)}</span>
            </label>
            <input
              type="range"
              min={minRange}
              max={maxRange}
              value={windowLevel.center}
              onChange={(e) =>
                onWindowLevelChange({
                  ...windowLevel,
                  center: parseFloat(e.target.value),
                })
              }
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-xs text-gray-300 mb-1">
              <span>Width</span>
              <span className="text-white">{windowLevel.width.toFixed(0)}</span>
            </label>
            <input
              type="range"
              min={1}
              max={maxRange - minRange}
              value={windowLevel.width}
              onChange={(e) =>
                onWindowLevelChange({
                  ...windowLevel,
                  width: parseFloat(e.target.value),
                })
              }
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-600 pt-4">
        <h3 className="text-sm font-medium text-gray-200 mb-3">Overlay</h3>
        <div className="space-y-3">
          <div>
            <label className="flex items-center justify-between text-xs text-gray-300 mb-1">
              <span>Opacity</span>
              <span className="text-white">{Math.round(overlayOpacity * 100)}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={overlayOpacity}
              onChange={(e) => onOverlayOpacityChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-xs text-gray-300 mb-1">
              <span>Color Map</span>
            </label>
            <select
              value={overlayColorMap}
              onChange={(e) => onOverlayColorMapChange(e.target.value as ColorMap)}
              className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-400"
            >
              {COLOR_MAP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-gray-300">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={overlayFlipHorizontal}
                onChange={(e) => onOverlayFlipHorizontalChange(e.target.checked)}
                className="w-3.5 h-3.5 bg-gray-800 rounded border-gray-600 text-blue-400 focus:ring-blue-400 focus:ring-offset-gray-900"
              />
              <span>Flip horizontal</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={overlayFlipVertical}
                onChange={(e) => onOverlayFlipVerticalChange(e.target.checked)}
                className="w-3.5 h-3.5 bg-gray-800 rounded border-gray-600 text-blue-400 focus:ring-blue-400 focus:ring-offset-gray-900"
              />
              <span>Flip vertical</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={overlayFlipDepth}
                onChange={(e) => onOverlayFlipDepthChange(e.target.checked)}
                className="w-3.5 h-3.5 bg-gray-800 rounded border-gray-600 text-blue-400 focus:ring-blue-400 focus:ring-offset-gray-900"
              />
              <span>Flip depth (3D Z)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-600 pt-4">
        <h3 className="text-sm font-medium text-gray-200 mb-3">3D View</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={show3D}
              onChange={(e) => onShow3DChange(e.target.checked)}
              className="w-4 h-4 bg-gray-800 rounded border-gray-600 text-blue-400 focus:ring-blue-400 focus:ring-offset-gray-900"
            />
            <span className="text-xs text-white">Enable 3D View</span>
          </label>

          {show3D && (
            <>
              <div>
                <label className="flex items-center justify-between text-xs text-gray-300 mb-1">
                  <span>Color Map</span>
                </label>
                <select
                  value={primaryColorMap}
                  onChange={(e) => onPrimaryColorMapChange(e.target.value as ColorMap)}
                  className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-400"
                >
                  {COLOR_MAP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center justify-between text-xs text-gray-300 mb-1">
                  <span>Render Mode</span>
                </label>
                <select
                  value={renderMode}
                  onChange={(e) =>
                    onRenderModeChange(e.target.value as 'mip' | 'isosurface')
                  }
                  className="w-full bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-600 focus:outline-none focus:border-blue-400"
                >
                  <option value="mip">Maximum Intensity Projection</option>
                  <option value="isosurface">Isosurface</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
