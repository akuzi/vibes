import { parseDicom, DataSet } from 'dicom-parser';
import { ImageVolume } from './types';

// DICOM tags
const TAG_ROWS = 'x00280010';
const TAG_COLUMNS = 'x00280011';
const TAG_BITS_ALLOCATED = 'x00280100';
const TAG_BITS_STORED = 'x00280101';
const TAG_PIXEL_REPRESENTATION = 'x00280103';
const TAG_PIXEL_SPACING = 'x00280030';
const TAG_IMAGE_POSITION_PATIENT = 'x00200032';
const TAG_IMAGE_ORIENTATION_PATIENT = 'x00200037';
const TAG_INSTANCE_NUMBER = 'x00200013';
const TAG_RESCALE_SLOPE = 'x00281053';
const TAG_RESCALE_INTERCEPT = 'x00281052';
const TAG_PIXEL_DATA = 'x7fe00010';
const TAG_SAMPLES_PER_PIXEL = 'x00280002';

interface DicomSlice {
  dataSet: DataSet;
  position: number[] | null;
  instanceNumber: number;
  pixelData: ArrayBuffer;
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  pixelRepresentation: number;
  rescaleSlope: number;
  rescaleIntercept: number;
}

function parseFloatStringArray(dataSet: DataSet, tag: string): number[] | null {
  const element = dataSet.elements[tag];
  if (!element) return null;

  const str = dataSet.string(tag);
  if (!str) return null;

  return str.split('\\').map(Number);
}

function extractPixelData(dataSet: DataSet): ArrayBuffer {
  const element = dataSet.elements[TAG_PIXEL_DATA];
  if (!element) {
    throw new Error('No pixel data found in DICOM file');
  }

  // Check for encapsulated pixel data (compressed transfer syntaxes)
  if (element.encapsulatedPixelData) {
    throw new Error(
      'Compressed DICOM transfer syntax not supported. Only uncompressed (Explicit/Implicit VR Little Endian, Explicit VR Big Endian) is supported.'
    );
  }

  const byteArray = dataSet.byteArray;
  const offset = element.dataOffset;
  const length = element.length;

  // Create a copy of the pixel data
  const buffer = new ArrayBuffer(length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < length; i++) {
    view[i] = byteArray[offset + i];
  }
  return buffer;
}

function parseSlice(arrayBuffer: ArrayBuffer): DicomSlice {
  const byteArray = new Uint8Array(arrayBuffer);
  const dataSet = parseDicom(byteArray);

  const rows = dataSet.uint16(TAG_ROWS);
  const columns = dataSet.uint16(TAG_COLUMNS);
  if (rows === undefined || columns === undefined) {
    throw new Error('DICOM file missing Rows or Columns tag');
  }

  const bitsAllocated = dataSet.uint16(TAG_BITS_ALLOCATED) ?? 16;
  const bitsStored = dataSet.uint16(TAG_BITS_STORED) ?? bitsAllocated;
  const pixelRepresentation = dataSet.uint16(TAG_PIXEL_REPRESENTATION) ?? 0;

  const samplesPerPixel = dataSet.uint16(TAG_SAMPLES_PER_PIXEL) ?? 1;
  if (samplesPerPixel !== 1) {
    throw new Error(
      `Only grayscale DICOM images are supported (SamplesPerPixel=${samplesPerPixel})`
    );
  }

  const position = parseFloatStringArray(dataSet, TAG_IMAGE_POSITION_PATIENT);
  const instanceNumber = dataSet.intString(TAG_INSTANCE_NUMBER) ?? 0;

  const rescaleSlope = dataSet.floatString(TAG_RESCALE_SLOPE) ?? 1;
  const rescaleIntercept = dataSet.floatString(TAG_RESCALE_INTERCEPT) ?? 0;

  const pixelData = extractPixelData(dataSet);

  return {
    dataSet,
    position,
    instanceNumber,
    pixelData,
    rows,
    columns,
    bitsAllocated,
    bitsStored,
    pixelRepresentation,
    rescaleSlope,
    rescaleIntercept,
  };
}

function getSlicePixelValues(slice: DicomSlice): Float32Array {
  const { rows, columns, bitsAllocated, pixelRepresentation, rescaleSlope, rescaleIntercept, pixelData } = slice;
  const numPixels = rows * columns;
  const result = new Float32Array(numPixels);

  if (bitsAllocated === 8) {
    if (pixelRepresentation === 0) {
      const view = new Uint8Array(pixelData);
      for (let i = 0; i < numPixels; i++) {
        result[i] = view[i] * rescaleSlope + rescaleIntercept;
      }
    } else {
      const view = new Int8Array(pixelData);
      for (let i = 0; i < numPixels; i++) {
        result[i] = view[i] * rescaleSlope + rescaleIntercept;
      }
    }
  } else if (bitsAllocated === 16) {
    if (pixelRepresentation === 0) {
      const view = new Uint16Array(pixelData);
      for (let i = 0; i < numPixels; i++) {
        result[i] = view[i] * rescaleSlope + rescaleIntercept;
      }
    } else {
      const view = new Int16Array(pixelData);
      for (let i = 0; i < numPixels; i++) {
        result[i] = view[i] * rescaleSlope + rescaleIntercept;
      }
    }
  } else if (bitsAllocated === 32) {
    const view = new Float32Array(pixelData);
    for (let i = 0; i < numPixels; i++) {
      result[i] = view[i] * rescaleSlope + rescaleIntercept;
    }
  } else {
    throw new Error(`Unsupported BitsAllocated: ${bitsAllocated}`);
  }

  return result;
}

function computeAffine(
  slices: DicomSlice[],
  pixelSpacing: [number, number],
  sliceSpacing: number
): number[][] {
  const firstSlice = slices[0];
  const orientationValues = parseFloatStringArray(
    firstSlice.dataSet,
    TAG_IMAGE_ORIENTATION_PATIENT
  );

  // Row and column direction cosines
  let rowCos = [1, 0, 0];
  let colCos = [0, 1, 0];

  if (orientationValues && orientationValues.length >= 6) {
    rowCos = [orientationValues[0], orientationValues[1], orientationValues[2]];
    colCos = [orientationValues[3], orientationValues[4], orientationValues[5]];
  }

  // Slice normal = cross product of row and column cosines
  const sliceNormal = [
    rowCos[1] * colCos[2] - rowCos[2] * colCos[1],
    rowCos[2] * colCos[0] - rowCos[0] * colCos[2],
    rowCos[0] * colCos[1] - rowCos[1] * colCos[0],
  ];

  // Origin from first slice position
  const origin = firstSlice.position || [0, 0, 0];

  return [
    [
      colCos[0] * pixelSpacing[1], // Column direction (X) * column spacing
      rowCos[0] * pixelSpacing[0], // Row direction (Y) * row spacing
      sliceNormal[0] * sliceSpacing,
      origin[0],
    ],
    [
      colCos[1] * pixelSpacing[1], // Column direction (X) * column spacing
      rowCos[1] * pixelSpacing[0], // Row direction (Y) * row spacing
      sliceNormal[1] * sliceSpacing,
      origin[1],
    ],
    [
      colCos[2] * pixelSpacing[1], // Column direction (X) * column spacing
      rowCos[2] * pixelSpacing[0], // Row direction (Y) * row spacing
      sliceNormal[2] * sliceSpacing,
      origin[2],
    ],
    [0, 0, 0, 1],
  ];
}

function getDataTypeName(bitsAllocated: number, pixelRepresentation: number): string {
  if (bitsAllocated === 8) {
    return pixelRepresentation === 0 ? 'uint8' : 'int8';
  }
  if (bitsAllocated === 16) {
    return pixelRepresentation === 0 ? 'uint16' : 'int16';
  }
  if (bitsAllocated === 32) {
    return 'float32';
  }
  return 'unknown';
}

export async function parseDicomFiles(
  arrayBuffers: ArrayBuffer[]
): Promise<ImageVolume> {
  if (arrayBuffers.length === 0) {
    throw new Error('No DICOM files provided');
  }

  // Parse all slices
  const slices: DicomSlice[] = [];
  for (const buffer of arrayBuffers) {
    try {
      slices.push(parseSlice(buffer));
    } catch {
      // Skip non-DICOM files (e.g., DICOMDIR)
      continue;
    }
  }

  if (slices.length === 0) {
    throw new Error('No valid DICOM image slices found');
  }

  // Validate all slices have the same dimensions
  const { rows, columns } = slices[0];
  for (const slice of slices) {
    if (slice.rows !== rows || slice.columns !== columns) {
      throw new Error(
        `Inconsistent slice dimensions: expected ${columns}x${rows}, got ${slice.columns}x${slice.rows}`
      );
    }
  }

  // Sort slices by ImagePositionPatient[2] (Z position) if available, else by InstanceNumber
  const hasPositions = slices.every((s) => s.position !== null);
  if (hasPositions) {
    slices.sort((a, b) => a.position![2] - b.position![2]);
  } else {
    slices.sort((a, b) => a.instanceNumber - b.instanceNumber);
  }

  const numSlices = slices.length;

  // Get pixel spacing
  const pixelSpacingValues = parseFloatStringArray(
    slices[0].dataSet,
    TAG_PIXEL_SPACING
  );
  const pixelSpacing: [number, number] = pixelSpacingValues
    ? [pixelSpacingValues[0], pixelSpacingValues[1]]
    : [1, 1];

  // Compute slice spacing from position deltas
  let sliceSpacing = 1;
  if (numSlices > 1 && hasPositions) {
    const pos0 = slices[0].position!;
    const pos1 = slices[1].position!;
    sliceSpacing = Math.sqrt(
      (pos1[0] - pos0[0]) ** 2 +
      (pos1[1] - pos0[1]) ** 2 +
      (pos1[2] - pos0[2]) ** 2
    );
    if (sliceSpacing === 0) sliceSpacing = 1;
  }

  // Stack pixel data into 3D volume
  // Volume layout: columns (X) x rows (Y) x slices (Z) to match NIfTI convention
  const totalVoxels = columns * rows * numSlices;
  const volumeData = new Float32Array(totalVoxels);
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (let z = 0; z < numSlices; z++) {
    const slicePixels = getSlicePixelValues(slices[z]);
    const sliceOffset = z * columns * rows;

    // DICOM pixel data is in row-major order (row * columns + col)
    // We need column-major for our volume: x + y * columns + z * columns * rows
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const dicomIdx = row * columns + col;
        const volumeIdx = sliceOffset + col + row * columns;
        const val = slicePixels[dicomIdx];
        volumeData[volumeIdx] = val;
        if (val < minValue) minValue = val;
        if (val > maxValue) maxValue = val;
      }
    }
  }

  // Build affine matrix
  const affine = computeAffine(slices, pixelSpacing, sliceSpacing);

  // Pixel dimensions: column spacing, row spacing, slice spacing
  const pixDims: [number, number, number] = [
    pixelSpacing[1],
    pixelSpacing[0],
    sliceSpacing,
  ];

  const dataType = getDataTypeName(
    slices[0].bitsAllocated,
    slices[0].pixelRepresentation
  );

  return {
    data: volumeData,
    dims: [columns, rows, numSlices],
    pixDims,
    affine,
    dataType,
    minValue,
    maxValue,
  };
}
