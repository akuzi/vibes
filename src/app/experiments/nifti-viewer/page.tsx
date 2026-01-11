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

type ExpandedView = 'axial' | 'coronal' | 'sagittal' | '3d' | null;

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

  // Expanded view state
  const [expandedView, setExpandedView] = useState<ExpandedView>(null);

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
      // Escape to close expanded view
      if (e.key === 'Escape' && expandedView) {
        setExpandedView(null);
        return;
      }

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
  }, [primaryVolume, expandedView]);

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
            {expandedView ? (
              // Expanded single view
              <div className="fixed inset-0 z-50 bg-black flex flex-col">
                {/* Expanded view header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
                  <span className="text-lg font-medium capitalize">
                    {expandedView === '3d' ? '3D Volume' : `${expandedView} View`}
                  </span>
                  <button
                    onClick={() => setExpandedView(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                    Minimize
                  </button>
                </div>

                {/* Floating minimize button - always visible */}
                <button
                  onClick={() => setExpandedView(null)}
                  className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 rounded-full text-white font-medium shadow-lg shadow-red-900/50 transition-all hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                  Minimize (Esc)
                </button>
                {/* Expanded content */}
                <div className="flex-1 p-4">
                  {expandedView === 'axial' && (
                    <div className="h-full flex items-center justify-center">
                      <div className="h-full aspect-square max-w-full">
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
                    </div>
                  )}
                  {expandedView === 'coronal' && (
                    <div className="h-full flex items-center justify-center">
                      <div className="h-full aspect-square max-w-full">
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
                    </div>
                  )}
                  {expandedView === 'sagittal' && (
                    <div className="h-full flex items-center justify-center">
                      <div className="h-full aspect-square max-w-full">
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
                  )}
                  {expandedView === '3d' && (
                    <div className="h-full bg-gray-900 rounded-lg border border-gray-700">
                      <VolumeRenderer
                        volume={primaryVolume}
                        enabled={show3D}
                        renderMode={renderMode}
                        colorMap={primaryColorMap}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Normal grid layout
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* 2D views - 3 columns */}
                <div className="lg:col-span-3">
                  {/* Top row: 3 orthogonal views */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="aspect-square relative group">
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
                      <button
                        onClick={() => setExpandedView('axial')}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Expand Axial view"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                    <div className="aspect-square relative group">
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
                      <button
                        onClick={() => setExpandedView('coronal')}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Expand Coronal view"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                    <div className="aspect-square relative group">
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
                      <button
                        onClick={() => setExpandedView('sagittal')}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Expand Sagittal view"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Bottom: 3D view */}
                  <div className="h-[300px] bg-gray-900 rounded-lg border border-gray-700 relative group">
                    <VolumeRenderer
                      volume={primaryVolume}
                      enabled={show3D}
                      renderMode={renderMode}
                      colorMap={primaryColorMap}
                    />
                    <button
                      onClick={() => setExpandedView('3d')}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Expand 3D view"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
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
            )}
          </div>
        )}
      </main>
    </div>
  );
}
