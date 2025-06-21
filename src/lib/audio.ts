import Soundfont from 'soundfont-player';

export type InstrumentName =
  | 'acoustic_grand_piano'
  | 'violin'
  | 'viola'
  | 'acoustic_guitar_nylon';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instrumentCache: Partial<Record<InstrumentName, any>> = {};

  private initialize = () => {
    if (!this.audioContext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public start = () => {
    this.initialize();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async loadInstrument(instrumentName: InstrumentName): Promise<any> {
    if (!this.audioContext) return null;

    if (this.instrumentCache[instrumentName]) {
      return this.instrumentCache[instrumentName];
    }

    try {
      const instrument = await Soundfont.instrument(this.audioContext, instrumentName);
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
