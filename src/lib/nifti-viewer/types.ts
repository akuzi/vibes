export interface ImageVolume {
  data: Float32Array;
  dims: [number, number, number];
  pixDims: [number, number, number];
  affine: number[][];
  dataType: string;
  minValue: number;
  maxValue: number;
}
