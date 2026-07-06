import { detectBPM, computePeaks } from '../../src/engine/analysis';
import { makeBuffer, asBuf } from '../mocks/audio';

/** Synthesize a click track: short decaying bursts at the given BPM. */
function clickTrack(bpm: number, seconds: number, sampleRate = 44100) {
  const interval = (60 / bpm) * sampleRate;
  return makeBuffer(seconds, sampleRate, (i) => {
    const phase = i % interval;
    return phase < 400 ? Math.sin(phase * 0.5) * Math.exp(-phase / 80) : 0;
  });
}

describe('detectBPM', () => {
  it('finds 120 BPM within ±2 on a 120 BPM click track', () => {
    const bpm = detectBPM(asBuf(clickTrack(120, 15)));
    expect(bpm).not.toBeNull();
    expect(Math.abs(bpm! - 120)).toBeLessThanOrEqual(2);
  });

  it('finds 128 BPM within ±2 on a 128 BPM click track', () => {
    const bpm = detectBPM(asBuf(clickTrack(128, 15)));
    expect(bpm).not.toBeNull();
    expect(Math.abs(bpm! - 128)).toBeLessThanOrEqual(2);
  });

  it('returns null on silence', () => {
    expect(detectBPM(asBuf(makeBuffer(10)))).toBeNull();
  });
});

describe('computePeaks', () => {
  it('returns min/max pairs, one pair per window', () => {
    const buf = clickTrack(120, 1);
    const peaks = computePeaks(asBuf(buf), 512);
    expect(peaks.length).toBe(Math.ceil(buf.length / 512) * 2);
    // max of every pair >= min
    for (let i = 0; i < peaks.length; i += 2) expect(peaks[i + 1]).toBeGreaterThanOrEqual(peaks[i]);
  });
});
