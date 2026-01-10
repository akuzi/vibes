export type ColorMap = 'grayscale' | 'jet' | 'hot' | 'cool' | 'bone' | 'copper';

export type RGBA = [number, number, number, number];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function grayscale(value: number): RGBA {
  const v = clamp(Math.round(value * 255), 0, 255);
  return [v, v, v, 255];
}

export function jet(value: number): RGBA {
  const v = clamp(value, 0, 1);

  let r: number, g: number, b: number;

  if (v < 0.125) {
    r = 0;
    g = 0;
    b = 0.5 + v * 4;
  } else if (v < 0.375) {
    r = 0;
    g = (v - 0.125) * 4;
    b = 1;
  } else if (v < 0.625) {
    r = (v - 0.375) * 4;
    g = 1;
    b = 1 - (v - 0.375) * 4;
  } else if (v < 0.875) {
    r = 1;
    g = 1 - (v - 0.625) * 4;
    b = 0;
  } else {
    r = 1 - (v - 0.875) * 2;
    g = 0;
    b = 0;
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
    255,
  ];
}

export function hot(value: number): RGBA {
  const v = clamp(value, 0, 1);

  let r: number, g: number, b: number;

  if (v < 0.33) {
    r = v * 3;
    g = 0;
    b = 0;
  } else if (v < 0.67) {
    r = 1;
    g = (v - 0.33) * 3;
    b = 0;
  } else {
    r = 1;
    g = 1;
    b = (v - 0.67) * 3;
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
    255,
  ];
}

export function cool(value: number): RGBA {
  const v = clamp(value, 0, 1);
  return [
    Math.round(v * 255),
    Math.round((1 - v) * 255),
    255,
    255,
  ];
}

export function bone(value: number): RGBA {
  const v = clamp(value, 0, 1);

  let r: number, g: number, b: number;

  if (v < 0.375) {
    r = v * 0.75 / 0.375;
    g = v * 0.75 / 0.375;
    b = v * 0.75 / 0.375 + 0.25 * (v / 0.375);
  } else if (v < 0.75) {
    const t = (v - 0.375) / 0.375;
    r = 0.75 * (1 - t) + t * 0.75;
    g = 0.75 + t * 0.25;
    b = 1;
  } else {
    const t = (v - 0.75) / 0.25;
    r = 0.75 + t * 0.25;
    g = 1;
    b = 1;
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
    255,
  ];
}

export function copper(value: number): RGBA {
  const v = clamp(value, 0, 1);
  return [
    Math.round(Math.min(1, v * 1.25) * 255),
    Math.round(v * 0.7812 * 255),
    Math.round(v * 0.4975 * 255),
    255,
  ];
}

export function applyColorMap(value: number, colorMap: ColorMap): RGBA {
  switch (colorMap) {
    case 'grayscale':
      return grayscale(value);
    case 'jet':
      return jet(value);
    case 'hot':
      return hot(value);
    case 'cool':
      return cool(value);
    case 'bone':
      return bone(value);
    case 'copper':
      return copper(value);
    default:
      return grayscale(value);
  }
}

export const COLOR_MAP_OPTIONS: { value: ColorMap; label: string }[] = [
  { value: 'grayscale', label: 'Grayscale' },
  { value: 'jet', label: 'Jet' },
  { value: 'hot', label: 'Hot' },
  { value: 'cool', label: 'Cool' },
  { value: 'bone', label: 'Bone' },
  { value: 'copper', label: 'Copper' },
];

export interface WindowLevel {
  center: number;
  width: number;
}

export function applyWindowLevel(
  value: number,
  windowLevel: WindowLevel
): number {
  const { center, width } = windowLevel;
  const lower = center - width / 2;
  const upper = center + width / 2;

  if (value <= lower) return 0;
  if (value >= upper) return 1;
  return (value - lower) / width;
}

export const WINDOW_PRESETS: { name: string; center: number; width: number }[] = [
  { name: 'Auto', center: 0, width: 0 },
  { name: 'Brain CT', center: 40, width: 80 },
  { name: 'Bone CT', center: 400, width: 2000 },
  { name: 'Lung CT', center: -600, width: 1500 },
  { name: 'Soft Tissue', center: 50, width: 400 },
  { name: 'Brain MRI', center: 500, width: 1000 },
  { name: 'Full Range', center: 128, width: 256 },
];
