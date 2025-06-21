const midiToFreq = (midi: number): number => {
  return Math.pow(2, (midi - 69) / 12) * 440;
};

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mainGain: GainNode | null = null;

  private initialize = () => {
    if (!this.audioContext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.mainGain = this.audioContext.createGain();
      this.mainGain.gain.value = 0.3; // Initial volume
      this.mainGain.connect(this.audioContext.destination);
    }
  }

  public start = () => {
    this.initialize();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playNote = (midiNote: number, time: number = 0, duration: number = 0.5) => {
    if (!this.audioContext || !this.mainGain) return;

    const freq = midiToFreq(midiNote);
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.mainGain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + time);

    // Piano-like envelope
    const now = this.audioContext.currentTime + time;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.7, now + 0.02); // Fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration); // Decay

    osc.start(now);
    osc.stop(now + duration);
  };
}
