/**
 * Per-deck FX send chain: input → filter (biquad) → delay ⇄ feedback → wet gain → output.
 * Wet amount 0..1 on the wet gain; filter 0..1 sweeps lowpass 200Hz..18kHz (log).
 */
export class FxChain {
  readonly input: BiquadFilterNode;
  private delay: DelayNode;
  private feedback: GainNode;
  private wet: GainNode;

  constructor(ctx: AudioContext, output: AudioNode) {
    this.input = ctx.createBiquadFilter();
    this.input.type = 'lowpass';
    this.input.frequency.value = 18000;
    this.input.Q.value = 0.9;

    this.delay = ctx.createDelay(2);
    this.feedback = ctx.createGain();
    this.feedback.gain.value = 0.35;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0;

    this.input.connect(this.delay);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);
    this.delay.connect(this.wet);
    this.wet.connect(output);
  }

  /** Wet send 0..1. */
  setWet(v: number) {
    this.wet.gain.setTargetAtTime(Math.min(1, Math.max(0, v)) * 0.8, 0, 0.02);
  }

  /** Filter sweep 0..1 → 200Hz..18kHz log scale. */
  setFilter(v: number) {
    const c = Math.min(1, Math.max(0, v));
    this.input.frequency.setTargetAtTime(200 * Math.pow(90, c), 0, 0.02);
  }

  /** Sync delay time to the track tempo (3/16 dotted feel). */
  setBpm(bpm: number | null) {
    if (bpm) this.delay.delayTime.setTargetAtTime(((60 / bpm) * 3) / 4, 0, 0.05);
  }
}
