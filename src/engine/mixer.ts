import { equalPower } from './math';

/**
 * Master section: two deck buses under an equal-power crossfader,
 * master gain, analyser tap for visuals, MediaStream tap for recording.
 */
export class Mixer {
  readonly master: GainNode;
  readonly analyser: AnalyserNode;
  readonly recordDest: MediaStreamAudioDestinationNode;
  private buses: [GainNode, GainNode];

  constructor(ctx: AudioContext) {
    this.master = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.recordDest = ctx.createMediaStreamDestination();
    this.buses = [ctx.createGain(), ctx.createGain()];

    this.buses[0].connect(this.master);
    this.buses[1].connect(this.master);
    this.master.connect(this.analyser);
    this.master.connect(this.recordDest);
    this.analyser.connect(ctx.destination);

    this.setCrossfade(0.5);
  }

  /** Bus a deck's output should connect into. */
  deckBus(i: 0 | 1): GainNode {
    return this.buses[i];
  }

  setCrossfade(x: number) {
    const [a, b] = equalPower(x);
    this.buses[0].gain.setTargetAtTime(a, 0, 0.01);
    this.buses[1].gain.setTargetAtTime(b, 0, 0.01);
  }

  setMaster(v: number) {
    this.master.gain.setTargetAtTime(Math.min(1, Math.max(0, v)), 0, 0.01);
  }
}
