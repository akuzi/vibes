import { NiftiVolume } from './parser';
import { SlicePlane } from './slicing';

export interface VoxelCoords {
  i: number;
  j: number;
  k: number;
}

export interface WorldCoords {
  x: number;
  y: number;
  z: number;
}

export function voxelToWorld(
  voxel: VoxelCoords,
  affine: number[][]
): WorldCoords {
  const { i, j, k } = voxel;

  const x =
    affine[0][0] * i +
    affine[0][1] * j +
    affine[0][2] * k +
    affine[0][3];

  const y =
    affine[1][0] * i +
    affine[1][1] * j +
    affine[1][2] * k +
    affine[1][3];

  const z =
    affine[2][0] * i +
    affine[2][1] * j +
    affine[2][2] * k +
    affine[2][3];

  return { x, y, z };
}

export function worldToVoxel(
  world: WorldCoords,
  affine: number[][]
): VoxelCoords {
  // Compute inverse of affine matrix (simplified for common cases)
  // For a proper implementation, you'd want a full matrix inverse
  const { x, y, z } = world;

  // Subtract translation
  const tx = x - affine[0][3];
  const ty = y - affine[1][3];
  const tz = z - affine[2][3];

  // Simple case: assume diagonal scaling (common for axis-aligned data)
  const i = affine[0][0] !== 0 ? tx / affine[0][0] : 0;
  const j = affine[1][1] !== 0 ? ty / affine[1][1] : 0;
  const k = affine[2][2] !== 0 ? tz / affine[2][2] : 0;

  return {
    i: Math.round(i),
    j: Math.round(j),
    k: Math.round(k),
  };
}

export function getVoxelValue(
  volume: NiftiVolume,
  voxel: VoxelCoords
): number | null {
  const { i, j, k } = voxel;
  const [dimX, dimY, dimZ] = volume.dims;

  if (i < 0 || i >= dimX || j < 0 || j >= dimY || k < 0 || k >= dimZ) {
    return null;
  }

  const index = i + j * dimX + k * dimX * dimY;
  return volume.data[index];
}

export function canvasToVoxel(
  canvasX: number,
  canvasY: number,
  canvasWidth: number,
  canvasHeight: number,
  sliceWidth: number,
  sliceHeight: number,
  plane: SlicePlane,
  sliceIndex: number,
  _volume: NiftiVolume
): VoxelCoords {
  // Convert canvas coordinates to slice coordinates
  const scaleX = sliceWidth / canvasWidth;
  const scaleY = sliceHeight / canvasHeight;

  let sliceX = Math.floor(canvasX * scaleX);
  let sliceY = Math.floor(canvasY * scaleY);

  // Clamp to valid range
  sliceX = Math.max(0, Math.min(sliceX, sliceWidth - 1));
  sliceY = Math.max(0, Math.min(sliceY, sliceHeight - 1));

  // Convert slice coordinates to voxel coordinates
  // Note: slice extraction flips Y axis, so we need to flip back
  let i: number, j: number, k: number;

  switch (plane) {
    case 'axial':
      i = sliceX;
      j = sliceHeight - 1 - sliceY;
      k = sliceIndex;
      break;
    case 'coronal':
      i = sliceX;
      j = sliceIndex;
      k = sliceHeight - 1 - sliceY;
      break;
    case 'sagittal':
      i = sliceIndex;
      j = sliceWidth - 1 - sliceX;
      k = sliceHeight - 1 - sliceY;
      break;
  }

  return { i, j, k };
}

export function voxelToSliceCoords(
  voxel: VoxelCoords,
  plane: SlicePlane,
  volume: NiftiVolume
): { x: number; y: number; sliceIndex: number } {
  const { i, j, k } = voxel;
  const [, dimY, dimZ] = volume.dims;

  switch (plane) {
    case 'axial':
      return {
        x: i,
        y: dimY - 1 - j,
        sliceIndex: k,
      };
    case 'coronal':
      return {
        x: i,
        y: dimZ - 1 - k,
        sliceIndex: j,
      };
    case 'sagittal':
      return {
        x: dimY - 1 - j,
        y: dimZ - 1 - k,
        sliceIndex: i,
      };
  }
}
