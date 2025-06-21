export interface Scale {
  name: string;
  notes: number[]; // MIDI note numbers relative to a root note (e.g., C4 = 60)
}

// C4 harmonic minor: C, D, E♭, F, G, A♭, B
const C_HARMONIC_MINOR = [60, 62, 63, 65, 67, 68, 71];

// C4 major: C, D, E, F, G, A, B
const C_MAJOR = [60, 62, 64, 65, 67, 69, 71];

// C4 natural minor: C, D, E♭, F, G, A♭, B♭
const C_NATURAL_MINOR = [60, 62, 63, 65, 67, 68, 70];

// C4 pentatonic major: C, D, E, G, A
const C_PENTATONIC_MAJOR = [60, 62, 64, 67, 69];

export const SCALES: Scale[] = [
  { name: 'C Harmonic Minor', notes: C_HARMONIC_MINOR },
  { name: 'C Major', notes: C_MAJOR },
  { name: 'C Natural Minor', notes: C_NATURAL_MINOR },
  { name: 'C Pentatonic Major', notes: C_PENTATONIC_MAJOR },
];

export const getNotesForScale = (scaleName: string): number[] => {
  const scale = SCALES.find(s => s.name === scaleName);
  return scale ? scale.notes : C_HARMONIC_MINOR;
}; 