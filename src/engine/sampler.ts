/**
 * Fred-Again-style performance sampler: 8 pads. A pad captures a beat-aligned
 * slice straight off a playing deck's buffer, then retriggers it through the
 * master as a one-shot — build a set live out of moments you just played.
 */
export interface PadInfo {
  filled: boolean;
  seconds: number;
}

export class Sampler {
  private slots: (AudioBuffer | null)[] = Array(8).fill(null);
  private gain: GainNode;

  constructor(private ctx: AudioContext, output: AudioNode) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0.9;
    this.gain.connect(output);
  }

  /** Copy `seconds` from `buffer` starting at `startSec` into a pad. */
  capture(slot: number, buffer: AudioBuffer, startSec: number, seconds: number): boolean {
    if (slot < 0 || slot >= this.slots.length) return false;
    const sr = buffer.sampleRate;
    const start = Math.floor(Math.max(0, startSec) * sr);
    const len = Math.min(Math.floor(seconds * sr), buffer.length - start);
    if (len <= 0) return false;
    const slice = this.ctx.createBuffer(buffer.numberOfChannels, len, sr);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const from = buffer.getChannelData(ch);
      const to = slice.getChannelData(ch);
      for (let i = 0; i < len; i++) to[i] = from[start + i];
    }
    this.slots[slot] = slice;
    return true;
  }

  /** One-shot playback of a pad through the master. */
  trigger(slot: number): boolean {
    const buf = this.slots[slot];
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain);
    src.start(0);
    return true;
  }

  clear(slot: number) {
    this.slots[slot] = null;
  }

  pad(slot: number): PadInfo {
    const b = this.slots[slot];
    return { filled: b !== null, seconds: b ? b.duration : 0 };
  }
}
