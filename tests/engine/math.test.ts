import { equalPower, eqValueToDb, tempoValueToRate, beatsToSeconds } from '../../src/engine/math';

describe('equalPower crossfade', () => {
  it('full left: deck A at unity, deck B silent', () => {
    const [a, b] = equalPower(0);
    expect(a).toBeCloseTo(1, 5);
    expect(b).toBeCloseTo(0, 5);
  });
  it('full right: inverse', () => {
    const [a, b] = equalPower(1);
    expect(a).toBeCloseTo(0, 5);
    expect(b).toBeCloseTo(1, 5);
  });
  it('center: both at ~0.707 (equal power)', () => {
    const [a, b] = equalPower(0.5);
    expect(a).toBeCloseTo(Math.SQRT1_2, 3);
    expect(b).toBeCloseTo(Math.SQRT1_2, 3);
  });
});

describe('eqValueToDb', () => {
  it('0 → full kill (-26 dB)', () => expect(eqValueToDb(0)).toBeCloseTo(-26));
  it('0.5 → flat (0 dB)', () => expect(eqValueToDb(0.5)).toBeCloseTo(0));
  it('1 → +6 dB boost', () => expect(eqValueToDb(1)).toBeCloseTo(6));
});

describe('tempoValueToRate (±8%)', () => {
  it('0.5 → 1.0', () => expect(tempoValueToRate(0.5)).toBeCloseTo(1));
  it('0 → 0.92', () => expect(tempoValueToRate(0)).toBeCloseTo(0.92));
  it('1 → 1.08', () => expect(tempoValueToRate(1)).toBeCloseTo(1.08));
});

describe('beatsToSeconds', () => {
  it('4 beats at 120 BPM = 2s', () => expect(beatsToSeconds(4, 120)).toBeCloseTo(2));
  it('8 beats at 128 BPM = 3.75s', () => expect(beatsToSeconds(8, 128)).toBeCloseTo(3.75));
});
