'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { ImageVolume } from '@/lib/nifti-viewer/types';
import {
  extractSlice,
  SlicePlane,
  getSliceCount,
  getSliceDimensions,
} from '@/lib/nifti-viewer/slicing';
import {
  applyWindowLevel,
  applyColorMap,
  ColorMap,
  WindowLevel,
} from '@/lib/nifti-viewer/colorMaps';
import {
  canvasToVoxel,
  VoxelCoords,
  voxelToSliceCoords,
} from '@/lib/nifti-viewer/transforms';

interface SliceViewerProps {
  volume: ImageVolume;
  overlay?: ImageVolume;
  plane: SlicePlane;
  sliceIndex: number;
  windowLevel: WindowLevel;
  overlayColorMap: ColorMap;
  overlayOpacity: number;
  crosshairPosition: VoxelCoords | null;
  onCrosshairMove: (voxel: VoxelCoords) => void;
  onSliceChange: (index: number) => void;
}

const PLANE_LABELS: Record<SlicePlane, string> = {
  axial: 'Axial',
  coronal: 'Coronal',
  sagittal: 'Sagittal',
};

export default function SliceViewer({
  volume,
  overlay,
  plane,
  sliceIndex,
  windowLevel,
  overlayColorMap,
  overlayOpacity,
  crosshairPosition,
  onCrosshairMove,
  onSliceChange,
}: SliceViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sliceCount = getSliceCount(volume, plane);
  const sliceDims = getSliceDimensions(volume, plane);

  // Render slice to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match slice dimensions
    canvas.width = sliceDims.width;
    canvas.height = sliceDims.height;

    // Extract slice data
    const sliceData = extractSlice(volume, plane, sliceIndex);
    const imageData = ctx.createImageData(sliceData.width, sliceData.height);

    // Compute effective window level
    const effectiveWindowLevel: WindowLevel =
      windowLevel.center === 0 && windowLevel.width === 0
        ? {
            center: (volume.minValue + volume.maxValue) / 2,
            width: volume.maxValue - volume.minValue,
          }
        : windowLevel;

    // Render primary volume
    for (let i = 0; i < sliceData.data.length; i++) {
      const normalized = applyWindowLevel(
        sliceData.data[i],
        effectiveWindowLevel
      );
      const [r, g, b, a] = applyColorMap(normalized, 'grayscale');
      const idx = i * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = a;
    }

    ctx.putImageData(imageData, 0, 0);

    // Render overlay if present
    if (overlay && overlayOpacity > 0) {
      const overlaySlice = extractSlice(overlay, plane, sliceIndex);
      const overlayWindowLevel: WindowLevel = {
        center: (overlay.minValue + overlay.maxValue) / 2,
        width: overlay.maxValue - overlay.minValue,
      };

      const overlayImageData = ctx.createImageData(
        overlaySlice.width,
        overlaySlice.height
      );

      for (let i = 0; i < overlaySlice.data.length; i++) {
        const value = overlaySlice.data[i];
        // Only show overlay where value is non-zero
        if (value > overlay.minValue) {
          const normalized = applyWindowLevel(value, overlayWindowLevel);
          const [r, g, b] = applyColorMap(normalized, overlayColorMap);
          const idx = i * 4;
          overlayImageData.data[idx] = r;
          overlayImageData.data[idx + 1] = g;
          overlayImageData.data[idx + 2] = b;
          overlayImageData.data[idx + 3] = Math.round(255 * overlayOpacity);
        }
      }

      // Composite overlay using a temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = overlaySlice.width;
      tempCanvas.height = overlaySlice.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(overlayImageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }

    // Draw crosshair if present and in this slice
    if (crosshairPosition) {
      const sliceCoords = voxelToSliceCoords(crosshairPosition, plane, volume);

      ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
      ctx.lineWidth = 1;

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, sliceCoords.y);
      ctx.lineTo(sliceDims.width, sliceCoords.y);
      ctx.stroke();

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(sliceCoords.x, 0);
      ctx.lineTo(sliceCoords.x, sliceDims.height);
      ctx.stroke();
    }
  }, [
    volume,
    overlay,
    plane,
    sliceIndex,
    windowLevel,
    overlayColorMap,
    overlayOpacity,
    crosshairPosition,
    sliceDims,
  ]);

  // Handle mouse movement for crosshair
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const voxel = canvasToVoxel(
        canvasX,
        canvasY,
        rect.width,
        rect.height,
        sliceDims.width,
        sliceDims.height,
        plane,
        sliceIndex,
        volume
      );

      onCrosshairMove(voxel);
    },
    [plane, sliceIndex, volume, sliceDims, onCrosshairMove]
  );

  // Handle scroll for slice navigation
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      const newIndex = Math.max(0, Math.min(sliceCount - 1, sliceIndex + delta));
      onSliceChange(newIndex);
    },
    [sliceIndex, sliceCount, onSliceChange]
  );

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm text-gray-200 font-medium">
          {PLANE_LABELS[plane]}
        </span>
        <span className="text-xs text-gray-300">
          {sliceIndex + 1} / {sliceCount}
        </span>
      </div>

      <div className="flex-1 relative bg-black rounded overflow-hidden border border-gray-700">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain cursor-crosshair"
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={sliceCount - 1}
        value={sliceIndex}
        onChange={(e) => onSliceChange(parseInt(e.target.value))}
        className="mt-2 w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
      />
    </div>
  );
}
