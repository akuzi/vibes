import * as nifti from 'nifti-reader-js';

export interface NiftiVolume {
  header: nifti.NIFTI1 | nifti.NIFTI2;
  data: Float32Array;
  dims: [number, number, number];
  pixDims: [number, number, number];
  affine: number[][];
  dataType: string;
  minValue: number;
  maxValue: number;
}

type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

const DATA_TYPE_NAMES: Record<number, string> = {
  2: 'uint8',
  4: 'int16',
  8: 'int32',
  16: 'float32',
  64: 'float64',
  256: 'int8',
  512: 'uint16',
  768: 'uint32',
};

function getTypedData(
  header: nifti.NIFTI1 | nifti.NIFTI2,
  imageData: ArrayBuffer
): TypedArray {
  const dataType = header.datatypeCode;

  switch (dataType) {
    case 2: // UINT8
      return new Uint8Array(imageData);
    case 4: // INT16
      return new Int16Array(imageData);
    case 8: // INT32
      return new Int32Array(imageData);
    case 16: // FLOAT32
      return new Float32Array(imageData);
    case 64: // FLOAT64
      return new Float64Array(imageData);
    case 256: // INT8
      return new Int8Array(imageData);
    case 512: // UINT16
      return new Uint16Array(imageData);
    case 768: // UINT32
      return new Uint32Array(imageData);
    default:
      throw new Error(`Unsupported NIfTI data type: ${dataType}`);
  }
}

function getAffineMatrix(header: nifti.NIFTI1 | nifti.NIFTI2): number[][] {
  // Use sform if available (method 3), otherwise use qform (method 2)
  if (header.sform_code > 0) {
    return [
      header.affine[0],
      header.affine[1],
      header.affine[2],
      [0, 0, 0, 1],
    ];
  }

  // Fall back to qform or identity
  if (header.qform_code > 0) {
    return [
      header.affine[0],
      header.affine[1],
      header.affine[2],
      [0, 0, 0, 1],
    ];
  }

  // Default identity with pixel dimensions
  const pixDim = header.pixDims;
  return [
    [pixDim[1], 0, 0, 0],
    [0, pixDim[2], 0, 0],
    [0, 0, pixDim[3], 0],
    [0, 0, 0, 1],
  ];
}

export async function parseNiftiFile(
  arrayBuffer: ArrayBuffer
): Promise<NiftiVolume> {
  let data = arrayBuffer;

  // Check if gzipped and decompress
  if (nifti.isCompressed(data)) {
    data = nifti.decompress(data) as ArrayBuffer;
  }

  // Validate NIfTI format
  if (!nifti.isNIFTI(data)) {
    throw new Error('Invalid NIfTI file format');
  }

  // Read header
  const header = nifti.readHeader(data);
  if (!header) {
    throw new Error('Failed to read NIfTI header');
  }

  // Read image data
  const imageData = nifti.readImage(header, data);

  // Get typed array based on data type
  const typedData = getTypedData(header, imageData);

  // Convert to Float32Array for consistent processing
  const float32Data = new Float32Array(typedData.length);
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (let i = 0; i < typedData.length; i++) {
    const val = typedData[i];
    float32Data[i] = val;
    if (val < minValue) minValue = val;
    if (val > maxValue) maxValue = val;
  }

  // Extract dimensions (first 3 spatial dimensions)
  const dims: [number, number, number] = [
    header.dims[1],
    header.dims[2],
    header.dims[3],
  ];

  // Extract voxel dimensions
  const pixDims: [number, number, number] = [
    header.pixDims[1],
    header.pixDims[2],
    header.pixDims[3],
  ];

  // Get affine transformation matrix
  const affine = getAffineMatrix(header);

  // Get data type name
  const dataType = DATA_TYPE_NAMES[header.datatypeCode] || 'unknown';

  return {
    header,
    data: float32Data,
    dims,
    pixDims,
    affine,
    dataType,
    minValue,
    maxValue,
  };
}

export function parseNiftiFileSync(arrayBuffer: ArrayBuffer): NiftiVolume {
  let data = arrayBuffer;

  if (nifti.isCompressed(data)) {
    data = nifti.decompress(data) as ArrayBuffer;
  }

  if (!nifti.isNIFTI(data)) {
    throw new Error('Invalid NIfTI file format');
  }

  const header = nifti.readHeader(data);
  if (!header) {
    throw new Error('Failed to read NIfTI header');
  }

  const imageData = nifti.readImage(header, data);
  const typedData = getTypedData(header, imageData);

  const float32Data = new Float32Array(typedData.length);
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (let i = 0; i < typedData.length; i++) {
    const val = typedData[i];
    float32Data[i] = val;
    if (val < minValue) minValue = val;
    if (val > maxValue) maxValue = val;
  }

  const dims: [number, number, number] = [
    header.dims[1],
    header.dims[2],
    header.dims[3],
  ];

  const pixDims: [number, number, number] = [
    header.pixDims[1],
    header.pixDims[2],
    header.pixDims[3],
  ];

  const affine = getAffineMatrix(header);
  const dataType = DATA_TYPE_NAMES[header.datatypeCode] || 'unknown';

  return {
    header,
    data: float32Data,
    dims,
    pixDims,
    affine,
    dataType,
    minValue,
    maxValue,
  };
}
