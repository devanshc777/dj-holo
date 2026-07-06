// Minimal structural mock of the Web Audio API — just enough surface for the
// engine to build its graph and for tests to assert param values and wiring.

export class MockParam {
  constructor(public value = 1) {}
  setValueAtTime(v: number) { this.value = v; }
  linearRampToValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number) { this.value = v; }
  cancelScheduledValues() {}
}

export class MockNode {
  connections: MockNode[] = [];
  connect(n: MockNode) { this.connections.push(n); return n; }
  disconnect() { this.connections = []; }
}

export class MockGain extends MockNode { gain = new MockParam(1); }

export class MockBiquad extends MockNode {
  type = 'lowpass';
  frequency = new MockParam(350);
  gain = new MockParam(0);
  Q = new MockParam(1);
}

export class MockDelay extends MockNode { delayTime = new MockParam(0); }

export class MockAnalyser extends MockNode {
  fftSize = 2048;
  frequencyBinCount = 1024;
  smoothingTimeConstant = 0.8;
  getByteFrequencyData(a: Uint8Array) { a.fill(0); }
  getFloatTimeDomainData(a: Float32Array) { a.fill(0); }
}

export class MockBufferSource extends MockNode {
  buffer: MockAudioBuffer | null = null;
  playbackRate = new MockParam(1);
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  started = false;
  startOffset = 0;
  stopped = false;
  onended: (() => void) | null = null;
  start(_when = 0, offset = 0) { this.started = true; this.startOffset = offset; }
  stop() { this.stopped = true; this.onended?.(); }
}

export class MockMediaStreamDestination extends MockNode {
  stream = { id: 'mock-stream' };
}

export class MockAudioBuffer {
  length: number;
  private channels: Float32Array[];
  constructor(public numberOfChannels: number, lengthSamples: number, public sampleRate: number) {
    this.length = lengthSamples;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(lengthSamples));
  }
  get duration() { return this.length / this.sampleRate; }
  getChannelData(i: number) { return this.channels[i]; }
}

export class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  destination = new MockNode();
  sources: MockBufferSource[] = [];

  createGain() { return new MockGain(); }
  createBiquadFilter() { return new MockBiquad(); }
  createDelay() { return new MockDelay(); }
  createAnalyser() { return new MockAnalyser(); }
  createMediaStreamDestination() { return new MockMediaStreamDestination(); }
  createBufferSource() { const s = new MockBufferSource(); this.sources.push(s); return s; }
  createBuffer(ch: number, len: number, sr: number) { return new MockAudioBuffer(ch, len, sr); }
  resume() { return Promise.resolve(); }
}

/** AudioBuffer stand-in of `seconds` length; optionally fill channel 0. */
export function makeBuffer(seconds: number, sampleRate = 44100, fill?: (i: number) => number): MockAudioBuffer {
  const buf = new MockAudioBuffer(1, Math.floor(seconds * sampleRate), sampleRate);
  if (fill) {
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = fill(i);
  }
  return buf;
}

export const asCtx = (m: MockAudioContext) => m as unknown as AudioContext;
export const asBuf = (b: MockAudioBuffer) => b as unknown as AudioBuffer;
