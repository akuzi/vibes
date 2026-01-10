'use client';

import React from 'react';
import { NiftiVolume } from '@/lib/nifti-viewer/parser';
import {
  VoxelCoords,
  WorldCoords,
  voxelToWorld,
  getVoxelValue,
} from '@/lib/nifti-viewer/transforms';

interface InfoPanelProps {
  volume: NiftiVolume | null;
  crosshairPosition: VoxelCoords | null;
}

export default function InfoPanel({
  volume,
  crosshairPosition,
}: InfoPanelProps) {
  if (!volume) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <h3 className="text-sm font-medium text-gray-200 mb-2">Info</h3>
        <p className="text-xs text-gray-300">Load a NIfTI file to see info</p>
      </div>
    );
  }

  let worldCoords: WorldCoords | null = null;
  let intensity: number | null = null;

  if (crosshairPosition) {
    worldCoords = voxelToWorld(crosshairPosition, volume.affine);
    intensity = getVoxelValue(volume, crosshairPosition);
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4 border border-gray-700">
      <div>
        <h3 className="text-sm font-medium text-gray-200 mb-2">Crosshair</h3>
        {crosshairPosition ? (
          <div className="space-y-1 text-xs">
            <p className="text-white">
              <span className="text-gray-400">Voxel:</span>{' '}
              ({crosshairPosition.i}, {crosshairPosition.j}, {crosshairPosition.k})
            </p>
            {worldCoords && (
              <p className="text-white">
                <span className="text-gray-400">World:</span>{' '}
                ({worldCoords.x.toFixed(1)}, {worldCoords.y.toFixed(1)},{' '}
                {worldCoords.z.toFixed(1)}) mm
              </p>
            )}
            <p className="text-white">
              <span className="text-gray-400">Intensity:</span>{' '}
              {intensity !== null ? intensity.toFixed(1) : 'N/A'}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-300">
            Hover over image to see coordinates
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-200 mb-2">Volume Info</h3>
        <div className="space-y-1 text-xs">
          <p className="text-white">
            <span className="text-gray-400">Dimensions:</span>{' '}
            {volume.dims[0]} x {volume.dims[1]} x {volume.dims[2]}
          </p>
          <p className="text-white">
            <span className="text-gray-400">Voxel Size:</span>{' '}
            {volume.pixDims[0].toFixed(2)} x {volume.pixDims[1].toFixed(2)} x{' '}
            {volume.pixDims[2].toFixed(2)} mm
          </p>
          <p className="text-white">
            <span className="text-gray-400">Data Type:</span> {volume.dataType}
          </p>
          <p className="text-white">
            <span className="text-gray-400">Range:</span>{' '}
            {volume.minValue.toFixed(1)} to {volume.maxValue.toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
}
