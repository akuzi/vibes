import { NiftiVolume } from './parser';

export type SlicePlane = 'axial' | 'coronal' | 'sagittal';

export interface SliceData {
  data: Float32Array;
  width: number;
  height: number;
}

function getVoxelIndex(
  x: number,
  y: number,
  z: number,
  dims: [number, number, number]
): number {
  return x + y * dims[0] + z * dims[0] * dims[1];
}

export function extractAxialSlice(
  volume: NiftiVolume,
  sliceIndex: number
): SliceData {
  const [dimX, dimY] = volume.dims;
  const z = Math.max(0, Math.min(sliceIndex, volume.dims[2] - 1));

  const sliceData = new Float32Array(dimX * dimY);

  for (let y = 0; y < dimY; y++) {
    for (let x = 0; x < dimX; x++) {
      const srcIdx = getVoxelIndex(x, y, z, volume.dims);
      // Flip Y for display (image coordinates vs array coordinates)
      const dstIdx = x + (dimY - 1 - y) * dimX;
      sliceData[dstIdx] = volume.data[srcIdx];
    }
  }

  return {
    data: sliceData,
    width: dimX,
    height: dimY,
  };
}

export function extractCoronalSlice(
  volume: NiftiVolume,
  sliceIndex: number
): SliceData {
  const [dimX, , dimZ] = volume.dims;
  const y = Math.max(0, Math.min(sliceIndex, volume.dims[1] - 1));

  const sliceData = new Float32Array(dimX * dimZ);

  for (let z = 0; z < dimZ; z++) {
    for (let x = 0; x < dimX; x++) {
      const srcIdx = getVoxelIndex(x, y, z, volume.dims);
      // Flip Z for display
      const dstIdx = x + (dimZ - 1 - z) * dimX;
      sliceData[dstIdx] = volume.data[srcIdx];
    }
  }

  return {
    data: sliceData,
    width: dimX,
    height: dimZ,
  };
}

export function extractSagittalSlice(
  volume: NiftiVolume,
  sliceIndex: number
): SliceData {
  const [, dimY, dimZ] = volume.dims;
  const x = Math.max(0, Math.min(sliceIndex, volume.dims[0] - 1));

  const sliceData = new Float32Array(dimY * dimZ);

  for (let z = 0; z < dimZ; z++) {
    for (let y = 0; y < dimY; y++) {
      const srcIdx = getVoxelIndex(x, y, z, volume.dims);
      // Flip both Y and Z for display
      const dstIdx = (dimY - 1 - y) + (dimZ - 1 - z) * dimY;
      sliceData[dstIdx] = volume.data[srcIdx];
    }
  }

  return {
    data: sliceData,
    width: dimY,
    height: dimZ,
  };
}

export function extractSlice(
  volume: NiftiVolume,
  plane: SlicePlane,
  sliceIndex: number
): SliceData {
  switch (plane) {
    case 'axial':
      return extractAxialSlice(volume, sliceIndex);
    case 'coronal':
      return extractCoronalSlice(volume, sliceIndex);
    case 'sagittal':
      return extractSagittalSlice(volume, sliceIndex);
  }
}

export function getSliceCount(
  volume: NiftiVolume,
  plane: SlicePlane
): number {
  switch (plane) {
    case 'axial':
      return volume.dims[2];
    case 'coronal':
      return volume.dims[1];
    case 'sagittal':
      return volume.dims[0];
  }
}

export function getSliceDimensions(
  volume: NiftiVolume,
  plane: SlicePlane
): { width: number; height: number } {
  switch (plane) {
    case 'axial':
      return { width: volume.dims[0], height: volume.dims[1] };
    case 'coronal':
      return { width: volume.dims[0], height: volume.dims[2] };
    case 'sagittal':
      return { width: volume.dims[1], height: volume.dims[2] };
  }
}
