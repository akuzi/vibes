export interface Scale {
  name: string;
  notes: number[]; // MIDI note numbers relative to a root note (e.g., C4 = 60)
}

// C4 minor pentatonic: C, E♭, F, G, B♭
const C_MINOR_PENTATONIC = [60, 63, 65, 67, 70];

export const SCALES: Scale[] = [
  { name: 'C Pentatonic Minor', notes: C_MINOR_PENTATONIC },
];

export const getNotesForScale = (scaleName: string): number[] => {
  const scale = SCALES.find(s => s.name === scaleName);
  return scale ? scale.notes : C_MINOR_PENTATONIC;
}; 