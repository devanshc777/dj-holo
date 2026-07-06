import { beatsToSeconds, eqValueToDb } from './math';
import { FxChain } from './fx';

export type EqBand = 'low' | 'mid' | 'high';

/**
 * One playback deck. Web Audio BufferSources are one-shot, so every
 * play/seek builds a fresh source; playhead position is derived from
 * `startedAt`/`offset` bookkeeping, never from the source itself.
 */
export class Deck {
  playing = false;
  buffer: AudioBuffer | null = null;
  bpm: number | null = null;
  hotCues: (number | null)[] = [null, null, null, null];
  loopBeats: number | null = null;

  private ctx: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private eq: Record<EqBand, BiquadFilterNode>;
  private channelGain: GainNode;
  private dry: GainNode;
  private fx: FxChain;
  private out: GainNode;

  private rate = 1; // tempo slider
  private syncRatio = 1; // extra multiplier from beat sync
  private offset = 0; // buffer seconds at last start/pause
  private startedAt = 0; // ctx.currentTime at last start
  private cuePoint = 0;
  private loopStart = 0;
  private reversed: AudioBuffer | null = null; // lazy cache for backspin

  constructor(ctx: AudioContext, output: AudioNode) {
    this.ctx = ctx;
    this.eq = {
      low: ctx.createBiquadFilter(),
      mid: ctx.createBiquadFilter(),
      high: ctx.createBiquadFilter(),
    };
    this.eq.low.type = 'lowshelf';
    this.eq.low.frequency.value = 250;
    this.eq.mid.type = 'peaking';
    this.eq.mid.frequency.value = 1000;
    this.eq.mid.Q.value = 0.8;
    this.eq.high.type = 'highshelf';
    this.eq.high.frequency.value = 4000;

    this.channelGain = ctx.createGain();
    this.dry = ctx.createGain();
    this.out = ctx.createGain();
    this.fx = new FxChain(ctx, this.out);

    this.eq.low.connect(this.eq.mid);
    this.eq.mid.connect(this.eq.high);
    this.eq.high.connect(this.channelGain);
    this.channelGain.connect(this.dry);
    this.channelGain.connect(this.fx.input);
    this.dry.connect(this.out);
    this.out.connect(output);
  }

  load(buffer: AudioBuffer, bpm: number | null) {
    this.stopSource();
    this.buffer = buffer;
    this.reversed = null;
    this.bpm = bpm;
    this.fx.setBpm(bpm);
    this.playing = false;
    this.offset = 0;
    this.cuePoint = 0;
    this.loopBeats = null;
    this.hotCues = [null, null, null, null];
  }

  play() {
    if (!this.buffer || this.playing) return;
    this.startSource(this.offset);
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this.offset = this.playhead();
    this.stopSource();
    this.playing = false;
  }

  /** While playing: pressing cue returns to the cue point and stops. While stopped: see setCuePoint. */
  cue() {
    this.stopSource();
    this.playing = false;
    this.offset = this.cuePoint;
  }

  setCuePoint() {
    this.cuePoint = this.playhead();
  }

  seek(seconds: number) {
    const t = Math.min(this.duration(), Math.max(0, seconds));
    this.loopBeats = null; // seeking exits any loop (documented in HANDOFF)
    if (this.playing) {
      this.stopSource();
      this.startSource(t);
    } else {
      this.offset = t;
    }
  }

  setTempo(rate: number) {
    this.rate = rate;
    if (this.source) this.source.playbackRate.setTargetAtTime(this.effectiveRate(), 0, 0.01);
    // rebase bookkeeping so playhead math stays correct across rate changes
    if (this.playing) {
      this.offset = this.playheadRaw();
      this.startedAt = this.ctx.currentTime;
    }
  }

  setSyncRatio(r: number) {
    this.syncRatio = r;
    this.setTempo(this.rate);
  }

  effectiveRate() {
    return this.rate * this.syncRatio;
  }

  setVolume(v: number) {
    this.channelGain.gain.setTargetAtTime(Math.min(1, Math.max(0, v)), 0, 0.01);
  }

  channelGainValue() {
    return this.channelGain.gain.value;
  }

  setEq(band: EqBand, value01: number) {
    this.eq[band].gain.setTargetAtTime(eqValueToDb(value01), 0, 0.01);
  }

  eqGainDb(band: EqBand) {
    return this.eq[band].gain.value;
  }

  setFxWet(v: number) {
    this.fx.setWet(v);
  }

  setFilter(v: number) {
    this.fx.setFilter(v);
  }

  /** Beat loop of `beats` starting at the current playhead; null disables. */
  setLoop(beats: number | null) {
    this.loopBeats = beats;
    if (!this.source) return;
    if (beats && this.bpm) {
      this.loopStart = this.playheadRaw();
      this.source.loopStart = this.loopStart;
      this.source.loopEnd = this.loopStart + beatsToSeconds(beats, this.bpm);
      this.source.loop = true;
    } else {
      this.source.loop = false;
    }
  }

  setHotCue(slot: number) {
    this.hotCues[slot] = this.playhead();
  }

  jumpHotCue(slot: number) {
    const t = this.hotCues[slot];
    if (t !== null) this.seek(t);
  }

  clearHotCue(slot: number) {
    this.hotCues[slot] = null;
  }

  /** Vinyl brake: ramp speed to zero over `seconds`, end paused where it coasted to. */
  brake(seconds = 1.5) {
    if (!this.source || !this.playing) return;
    const startPos = this.playhead();
    const rate = this.effectiveRate();
    this.source.playbackRate.cancelScheduledValues(this.ctx.currentTime);
    this.source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
    this.source.playbackRate.linearRampToValueAtTime(0, this.ctx.currentTime + seconds);
    setTimeout(() => {
      this.stopSource();
      this.playing = false;
      // linear ramp covers half the distance a constant rate would
      this.offset = Math.min(this.duration(), startPos + (rate * seconds) / 2);
    }, seconds * 1000);
  }

  /** Backspin: fast reversed burst from the current position, land paused at the cue point. */
  backspin(seconds = 1.2) {
    if (!this.buffer || !this.playing) return;
    const pos = this.playhead();
    this.stopSource();
    if (!this.reversed) this.reversed = this.reverseBuffer(this.buffer);
    const src = this.ctx.createBufferSource();
    src.buffer = this.reversed;
    src.playbackRate.value = 2.5;
    src.connect(this.eq.low);
    src.start(0, Math.max(0, this.buffer.duration - pos));
    this.source = src;
    setTimeout(() => {
      this.stopSource();
      this.playing = false;
      this.offset = this.cuePoint;
    }, seconds * 1000);
  }

  /** Echo out: cut the dry signal, let the delay tail ring, relax feedback after. */
  echoOut(tailSeconds = 3.5) {
    if (!this.playing) return;
    this.fx.setWet(1);
    this.fx.setFeedback(0.85);
    this.pause();
    setTimeout(() => {
      this.fx.setFeedback(0.35);
      this.fx.setWet(0);
    }, tailSeconds * 1000);
  }

  fxFeedbackValue() {
    return this.fx.feedbackValue();
  }

  duration() {
    return this.buffer?.duration ?? 0;
  }

  /** Current position in buffer seconds, loop-aware for display. */
  playhead() {
    const raw = this.playheadRaw();
    if (this.playing && this.source?.loop && this.bpm && this.loopBeats) {
      const len = beatsToSeconds(this.loopBeats, this.bpm);
      if (raw > this.loopStart + len) return this.loopStart + ((raw - this.loopStart) % len);
    }
    return Math.min(raw, this.duration());
  }

  private playheadRaw() {
    if (!this.playing) return this.offset;
    return this.offset + (this.ctx.currentTime - this.startedAt) * this.effectiveRate();
  }

  private reverseBuffer(buffer: AudioBuffer): AudioBuffer {
    const rev = this.ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const from = buffer.getChannelData(ch);
      const to = rev.getChannelData(ch);
      for (let i = 0, n = from.length; i < n; i++) to[i] = from[n - 1 - i];
    }
    return rev;
  }

  private startSource(offset: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = this.effectiveRate();
    src.connect(this.eq.low);
    src.start(0, offset);
    this.source = src;
    this.offset = offset;
    this.startedAt = this.ctx.currentTime;
  }

  private stopSource() {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch {
        /* already stopped */
      }
      this.source = null;
    }
  }
}
