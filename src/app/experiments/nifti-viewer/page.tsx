'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { NiftiVolume } from '@/lib/nifti-viewer/parser';
import { WindowLevel, ColorMap } from '@/lib/nifti-viewer/colorMaps';
import { VoxelCoords } from '@/lib/nifti-viewer/transforms';
import { getSliceCount } from '@/lib/nifti-viewer/slicing';
import FileUploader from '@/components/nifti-viewer/FileUploader';
import SliceViewer from '@/components/nifti-viewer/SliceViewer';
import ControlPanel from '@/components/nifti-viewer/ControlPanel';
import InfoPanel from '@/components/nifti-viewer/InfoPanel';
import VolumeRenderer from '@/components/nifti-viewer/VolumeRenderer';

interface SliceIndices {
  axial: number;
  coronal: number;
  sagittal: number;
}

export default function NiftiViewerPage() {
  // Volume state
  const [primaryVolume, setPrimaryVolume] = useState<NiftiVolume | null>(null);
  const [overlayVolume, setOverlayVolume] = useState<NiftiVolume | null>(null);

  // Slice navigation state
  const [sliceIndices, setSliceIndices] = useState<SliceIndices>({
    axial: 0,
    coronal: 0,
    sagittal: 0,
  });

  // Viewing parameters
  const [windowLevel, setWindowLevel] = useState<WindowLevel>({
    center: 0,
    width: 0,
  });
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [overlayColorMap, setOverlayColorMap] = useState<ColorMap>('jet');
  const [primaryColorMap, setPrimaryColorMap] = useState<ColorMap>('grayscale');

  // 3D view state
  const [show3D, setShow3D] = useState(true);
  const [renderMode, setRenderMode] = useState<'mip' | 'isosurface'>('mip');

  // Crosshair state
  const [crosshairPosition, setCrosshairPosition] = useState<VoxelCoords | null>(
    null
  );

  // Initialize slice indices when volume is loaded
  useEffect(() => {
    if (primaryVolume) {
      setSliceIndices({
        axial: Math.floor(getSliceCount(primaryVolume, 'axial') / 2),
        coronal: Math.floor(getSliceCount(primaryVolume, 'coronal') / 2),
        sagittal: Math.floor(getSliceCount(primaryVolume, 'sagittal') / 2),
      });
    }
  }, [primaryVolume]);

  // Handle volume loading
  const handlePrimaryLoad = useCallback((volume: NiftiVolume) => {
    setPrimaryVolume(volume);
    setWindowLevel({
      center: (volume.minValue + volume.maxValue) / 2,
      width: volume.maxValue - volume.minValue,
    });
  }, []);

  const handleOverlayLoad = useCallback((volume: NiftiVolume) => {
    setOverlayVolume(volume);
  }, []);

  // Handle crosshair movement
  const handleCrosshairMove = useCallback(
    (voxel: VoxelCoords) => {
      setCrosshairPosition(voxel);
      if (primaryVolume) {
        // Update slice indices to follow crosshair
        setSliceIndices({
          axial: Math.max(
            0,
            Math.min(voxel.k, primaryVolume.dims[2] - 1)
          ),
          coronal: Math.max(
            0,
            Math.min(voxel.j, primaryVolume.dims[1] - 1)
          ),
          sagittal: Math.max(
            0,
            Math.min(voxel.i, primaryVolume.dims[0] - 1)
          ),
        });
      }
    },
    [primaryVolume]
  );

  // Handle slice changes
  const handleAxialChange = useCallback((index: number) => {
    setSliceIndices((prev) => ({ ...prev, axial: index }));
  }, []);

  const handleCoronalChange = useCallback((index: number) => {
    setSliceIndices((prev) => ({ ...prev, coronal: index }));
  }, []);

  const handleSagittalChange = useCallback((index: number) => {
    setSliceIndices((prev) => ({ ...prev, sagittal: index }));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!primaryVolume) return;

      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSliceIndices((prev) => ({
            ...prev,
            axial: Math.min(prev.axial + step, primaryVolume.dims[2] - 1),
          }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSliceIndices((prev) => ({
            ...prev,
            axial: Math.max(prev.axial - step, 0),
          }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [primaryVolume]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-600 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-gray-200 hover:text-white transition-colors"
            >
              &larr; Back
            </Link>
            <h1 className="text-lg font-medium text-white">Neuroimaging Viewer</h1>
          </div>
          <div className="text-xs text-gray-300">
            Use arrow keys to navigate slices (Shift for 10x)
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 max-w-7xl mx-auto">
        {!primaryVolume ? (
          // Upload view
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-semibold mb-2 text-white">
                Upload NIfTI File
              </h2>
              <p className="text-gray-200 text-sm">
                Supports .nii and .nii.gz formats
              </p>
            </div>
            <div className="w-full max-w-md">
              <FileUploader
                onFileLoad={handlePrimaryLoad}
                label="Drop your NIfTI file here"
              />
            </div>
          </div>
        ) : (
          // Viewer
          <div className="space-y-4">
            {/* File uploaders row */}
            <div className="grid grid-cols-2 gap-4">
              <FileUploader
                onFileLoad={handlePrimaryLoad}
                label="Replace primary volume"
              />
              <FileUploader
                onFileLoad={handleOverlayLoad}
                label="Load overlay (segmentation)"
              />
            </div>

            {/* Main viewer layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* 2D views - 3 columns */}
              <div className="lg:col-span-3">
                {/* Top row: 3 orthogonal views */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="aspect-square">
                    <SliceViewer
                      volume={primaryVolume}
                      overlay={overlayVolume || undefined}
                      plane="axial"
                      sliceIndex={sliceIndices.axial}
                      windowLevel={windowLevel}
                      overlayColorMap={overlayColorMap}
                      overlayOpacity={overlayOpacity}
                      crosshairPosition={crosshairPosition}
                      onCrosshairMove={handleCrosshairMove}
                      onSliceChange={handleAxialChange}
                    />
                  </div>
                  <div className="aspect-square">
                    <SliceViewer
                      volume={primaryVolume}
                      overlay={overlayVolume || undefined}
                      plane="coronal"
                      sliceIndex={sliceIndices.coronal}
                      windowLevel={windowLevel}
                      overlayColorMap={overlayColorMap}
                      overlayOpacity={overlayOpacity}
                      crosshairPosition={crosshairPosition}
                      onCrosshairMove={handleCrosshairMove}
                      onSliceChange={handleCoronalChange}
                    />
                  </div>
                  <div className="aspect-square">
                    <SliceViewer
                      volume={primaryVolume}
                      overlay={overlayVolume || undefined}
                      plane="sagittal"
                      sliceIndex={sliceIndices.sagittal}
                      windowLevel={windowLevel}
                      overlayColorMap={overlayColorMap}
                      overlayOpacity={overlayOpacity}
                      crosshairPosition={crosshairPosition}
                      onCrosshairMove={handleCrosshairMove}
                      onSliceChange={handleSagittalChange}
                    />
                  </div>
                </div>

                {/* Bottom: 3D view */}
                <div className="h-[300px] bg-gray-900 rounded-lg border border-gray-700">
                  <VolumeRenderer
                    volume={primaryVolume}
                    enabled={show3D}
                    renderMode={renderMode}
                    colorMap={primaryColorMap}
                  />
                </div>
              </div>

              {/* Right sidebar - controls and info */}
              <div className="space-y-4">
                <ControlPanel
                  volume={primaryVolume}
                  windowLevel={windowLevel}
                  onWindowLevelChange={setWindowLevel}
                  overlayOpacity={overlayOpacity}
                  onOverlayOpacityChange={setOverlayOpacity}
                  overlayColorMap={overlayColorMap}
                  onOverlayColorMapChange={setOverlayColorMap}
                  primaryColorMap={primaryColorMap}
                  onPrimaryColorMapChange={setPrimaryColorMap}
                  show3D={show3D}
                  onShow3DChange={setShow3D}
                  renderMode={renderMode}
                  onRenderModeChange={setRenderMode}
                />
                <InfoPanel
                  volume={primaryVolume}
                  crosshairPosition={crosshairPosition}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
