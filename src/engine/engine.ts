import { Deck } from './deck';
import { Mixer } from './mixer';
import { computePeaks, detectBPM } from './analysis';
import { tempoValueToRate } from './math';

export interface TrackInfo {
  name: string;
  bpm: number | null;
  duration: number;
  peaks: Float32Array;
}

export type DeckParam = 'tempo' | 'volume' | 'eqLow' | 'eqMid' | 'eqHigh' | 'fxWet' | 'filter';

/**
 * Facade the rest of the app talks to. Owns the AudioContext, two decks,
 * the mixer, and the set recorder. All perform-time params arrive
 * normalized 0..1 and are mapped here.
 */
export class Engine {
  readonly ctx: AudioContext;
  private decks: [Deck, Deck];
  private mixer: Mixer;
  private tempoValue: [number, number] = [0.5, 0.5];
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor(ctx?: AudioContext) {
    this.ctx = ctx ?? new AudioContext();
    this.mixer = new Mixer(this.ctx);
    this.decks = [
      new Deck(this.ctx, this.mixer.deckBus(0)),
      new Deck(this.ctx, this.mixer.deckBus(1)),
    ];
  }

  deck(i: 0 | 1): Deck {
    return this.decks[i];
  }

  /** Decode a file and load it — returns display info. */
  async loadFile(i: 0 | 1, name: string, data: ArrayBuffer): Promise<TrackInfo> {
    const buffer = await this.ctx.decodeAudioData(data);
    return this.loadDecoded(i, name, buffer);
  }

  /** Load an already-decoded buffer (tests, demo generator). */
  loadBuffer(i: 0 | 1, buffer: AudioBuffer, bpm: number | null): void {
    this.decks[i].load(buffer, bpm);
  }

  private loadDecoded(i: 0 | 1, name: string, buffer: AudioBuffer): TrackInfo {
    const bpm = detectBPM(buffer);
    const peaks = computePeaks(buffer);
    this.decks[i].load(buffer, bpm);
    return { name, bpm, duration: buffer.duration, peaks };
  }

  setParam(i: 0 | 1, param: DeckParam, value01: number) {
    const d = this.decks[i];
    switch (param) {
      case 'tempo':
        this.tempoValue[i] = value01;
        d.setTempo(tempoValueToRate(value01));
        break;
      case 'volume':
        d.setVolume(value01);
        break;
      case 'eqLow':
        d.setEq('low', value01);
        break;
      case 'eqMid':
        d.setEq('mid', value01);
        break;
      case 'eqHigh':
        d.setEq('high', value01);
        break;
      case 'fxWet':
        d.setFxWet(value01);
        break;
      case 'filter':
        d.setFilter(value01);
        break;
    }
  }

  getTempoValue(i: 0 | 1) {
    return this.tempoValue[i];
  }

  setCrossfade(x: number) {
    this.mixer.setCrossfade(x);
  }

  setMaster(v: number) {
    this.mixer.setMaster(v);
  }

  /** Match deck i's effective BPM (and beat phase) to the other deck. */
  sync(i: 0 | 1) {
    const self = this.decks[i];
    const other = this.decks[i === 0 ? 1 : 0];
    if (!self.bpm || !other.bpm) return;
    const targetBpm = other.bpm * other.effectiveRate();
    self.setSyncRatio(1); // reset so effectiveRate() is the tempo-slider rate alone
    const rate = self.effectiveRate();
    self.setSyncRatio(targetBpm / (self.bpm * rate));

    // phase nudge: align to the other deck's beat grid
    if (self.playing && other.playing) {
      const beat = 60 / targetBpm;
      const otherPhase = (other.playhead() * other.effectiveRate()) % beat;
      const selfPhase = (self.playhead() * self.effectiveRate()) % beat;
      let delta = otherPhase - selfPhase;
      if (delta > beat / 2) delta -= beat;
      if (delta < -beat / 2) delta += beat;
      self.seek(self.playhead() + delta / self.effectiveRate());
    }
  }

  /** Frequency-domain snapshot of the master bus (for visuals). */
  getFFT(out: Uint8Array) {
    this.mixer.analyser.getByteFrequencyData(out);
  }

  get fftSize() {
    return this.mixer.analyser.frequencyBinCount;
  }

  startRecording(): boolean {
    if (typeof MediaRecorder === 'undefined' || this.recorder) return false;
    this.chunks = [];
    this.recorder = new MediaRecorder(this.mixer.recordDest.stream, {
      mimeType: 'audio/webm;codecs=opus',
    });
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start(1000);
    return true;
  }

  /** Stops and resolves to the recorded blob (null if not recording). */
  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const r = this.recorder;
      if (!r) return resolve(null);
      r.onstop = () => {
        this.recorder = null;
        resolve(new Blob(this.chunks, { type: 'audio/webm' }));
      };
      r.stop();
    });
  }

  get isRecording() {
    return this.recorder !== null;
  }

  /** Autoplay policy: call from any user gesture. */
  resume() {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
}
