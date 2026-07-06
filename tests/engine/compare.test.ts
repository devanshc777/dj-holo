import { compareTracks, bandEnvelopes } from '../../src/engine/compare';
import { makeBuffer, asBuf } from '../mocks/audio';

function tone(freq: number, seconds: number, sampleRate = 44100) {
  return makeBuffer(seconds, sampleRate, (i) => Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.5);
}

/** kick-ish pattern: low bursts every beat, second half doubles energy (structure change) */
function structured(bpm: number, seconds: number, sampleRate = 44100) {
  const interval = (60 / bpm) * sampleRate;
  const half = (seconds * sampleRate) / 2;
  return makeBuffer(seconds, sampleRate, (i) => {
    const phase = i % interval;
    const amp = i > half ? 1 : 0.4;
    return phase < 600 ? Math.sin(phase * 0.05) * Math.exp(-phase / 200) * amp : 0;
  });
}

describe('bandEnvelopes', () => {
  it('low tone lands mostly in the low band, high tone in the high band', () => {
    const lowE = bandEnvelopes(asBuf(tone(80, 4)));
    const highE = bandEnvelopes(asBuf(tone(8000, 4)));
    expect(lowE.balance[0]).toBeGreaterThan(0.6); // low share
    expect(highE.balance[2]).toBeGreaterThan(0.5); // high share
  });
});

describe('compareTracks', () => {
  it('identical tracks → near-perfect similarity', () => {
    const a = structured(120, 12);
    const r = compareTracks(asBuf(a), asBuf(a));
    expect(r.overall).toBeGreaterThan(0.97);
    expect(r.structure).toBeGreaterThan(0.97);
    expect(r.spectralBalance).toBeGreaterThan(0.97);
  });

  it('very different content → clearly lower score', () => {
    const kicks = structured(120, 12);
    const hiss = tone(9000, 12);
    const same = compareTracks(asBuf(kicks), asBuf(kicks)).overall;
    const diff = compareTracks(asBuf(kicks), asBuf(hiss)).overall;
    expect(diff).toBeLessThan(same - 0.2);
  });

  it('reports both BPMs and the delta', () => {
    const a = structured(120, 15);
    const b = structured(128, 15);
    const r = compareTracks(asBuf(a), asBuf(b));
    expect(r.bpmA).not.toBeNull();
    expect(r.bpmB).not.toBeNull();
    expect(Math.abs(r.bpmA! - 120)).toBeLessThanOrEqual(3);
    expect(Math.abs(r.bpmB! - 128)).toBeLessThanOrEqual(3);
  });
});
