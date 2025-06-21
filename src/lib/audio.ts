import Soundfont from 'soundfont-player';

export type InstrumentName =
  | 'lead_1_square'
  | 'pad_2_warm'
  | 'synth_bass_1'
  | 'synth_drum'
  | 'acoustic_grand_piano'
  | 'violin'
  | 'cello'
  | 'string_ensemble_1'
  | 'pad_8_sweep'
  | 'pad_4_choir'
  | 'fx_4_atmosphere'
  | 'marimba'
  | 'vibraphone'
  | 'electric_piano_1'
  | 'electric_bass_pick'
  | 'overdriven_guitar'
  | 'distortion_guitar'
  | 'electric_bass_finger'
  | 'fx_8_scifi'
  | 'pad_6_metallic';

export interface InstrumentSet {
  name: string;
  instruments: {
    q1: InstrumentName;
    q2: InstrumentName;
    q3: InstrumentName;
    q4: InstrumentName;
  };
}

export const INSTRUMENT_SETS: InstrumentSet[] = [
  {
    name: 'Ambient',
    instruments: {
      q1: 'lead_1_square',
      q2: 'pad_2_warm',
      q3: 'synth_bass_1',
      q4: 'synth_drum',
    },
  },
  {
    name: 'Classical',
    instruments: {
      q1: 'acoustic_grand_piano',
      q2: 'violin',
      q3: 'cello',
      q4: 'string_ensemble_1',
    },
  },
  {
    name: 'Drone',
    instruments: {
      q1: 'pad_8_sweep',
      q2: 'pad_4_choir',
      q3: 'fx_4_atmosphere',
      q4: 'pad_2_warm',
    },
  },
  {
    name: 'Minimal',
    instruments: {
      q1: 'marimba',
      q2: 'vibraphone',
      q3: 'electric_piano_1',
      q4: 'electric_bass_pick',
    },
  },
  {
    name: 'Chill Out',
    instruments: {
      q1: 'electric_piano_1',
      q2: 'pad_2_warm',
      q3: 'synth_bass_1',
      q4: 'synth_drum',
    },
  },
  {
    name: 'Space Music',
    instruments: {
      q1: 'fx_8_scifi',
      q2: 'pad_8_sweep',
      q3: 'pad_6_metallic',
      q4: 'fx_4_atmosphere',
    },
  },
  {
    name: 'Dark Ambient',
    instruments: {
      q1: 'fx_4_atmosphere',
      q2: 'pad_8_sweep',
      q3: 'pad_6_metallic',
      q4: 'synth_bass_1',
    },
  },
];

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mainGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbWet: GainNode | null = null;
  private initializationPromise: Promise<void> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instrumentCache: Partial<Record<InstrumentName, any>> = {};

  private async initialize() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.mainGain = this.audioContext.createGain();

    const masterGain = this.audioContext.createGain();
    masterGain.connect(this.audioContext.destination);
    
    // Dry path
    this.mainGain.connect(masterGain);

    await this.loadReverb();

    // Wet path
    if (this.reverbWet) {
      this.reverbWet.connect(masterGain);
      if (this.mainGain && this.reverbNode) {
        this.mainGain.connect(this.reverbNode);
      }
    }
  }

  private ensureInitialized = async () => {
    if (!this.initializationPromise) {
        this.initializationPromise = this.initialize();
    }
    return this.initializationPromise;
  }

  private loadReverb = async () => {
    if (!this.audioContext) return;
    try {
      const response = await fetch('http://reverbjs.org/Library/ElvedenHallMarbleHall.m4a');
      const arraybuffer = await response.arrayBuffer();
      const impulseResponse = await this.audioContext.decodeAudioData(arraybuffer);

      this.reverbNode = this.audioContext.createConvolver();
      this.reverbNode.buffer = impulseResponse;
      this.reverbNode.normalize = true;

      this.reverbWet = this.audioContext.createGain();
      this.reverbWet.gain.setValueAtTime(0.6, this.audioContext.currentTime);

      if (this.reverbNode && this.reverbWet) {
        this.reverbNode.connect(this.reverbWet);
      }
    } catch (e) {
      console.error("Failed to load reverb", e);
    }
  }

  public start = async () => {
    await this.ensureInitialized();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    if (this.mainGain) {
      this.mainGain.gain.setValueAtTime(0.3, this.audioContext!.currentTime);
    }
  }

  public stopAllSounds = () => {
    if (this.mainGain) {
      this.mainGain.gain.setValueAtTime(0, this.audioContext!.currentTime);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadInstrument(instrumentName: InstrumentName): Promise<any> {
    await this.ensureInitialized();
    if (!this.audioContext || !this.mainGain) return null;

    if (this.instrumentCache[instrumentName]) {
      return this.instrumentCache[instrumentName];
    }

    try {
      const instrument = await Soundfont.instrument(this.audioContext, instrumentName, {
        destination: this.mainGain,
      });
      this.instrumentCache[instrumentName] = instrument;
      return instrument;
    } catch (error) {
      console.error(`Could not load instrument: ${instrumentName}`, error);
      return null;
    }
  }

  public playNote = async (
    midiNote: number,
    instrumentName: InstrumentName,
  ) => {
    await this.ensureInitialized();
    if (!this.audioContext) return;
    
    try {
      const instrument = await this.loadInstrument(instrumentName);
      if (instrument) {
        instrument.play(midiNote.toString());
      }
    } catch(e) {
      console.log(e);
    }
  };
}
