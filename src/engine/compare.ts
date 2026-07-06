import { detectBPM } from './analysis';

/**
 * Offline track/mix comparison — no FFT libs, just one-pole band splits and
 * envelope correlation. Good enough to answer "does my reproduction have the
 * same shape and tonal balance as the reference?"
 */

export interface BandEnvelopeResult {
  /** 64-bin unit-normalized loudness envelope (whole track) */
  loudness: Float32Array;
  /** per-band 64-bin envelopes: [low, mid, high] */
  bands: [Float32Array, Float32Array, Float32Array];
  /** overall energy share per band, sums to 1: [low, mid, high] */
  balance: [number, number, number];
}

const BINS = 64;

function onePoleLP(data: Float32Array, sampleRate: number, cutoff: number): Float32Array {
  const out = new Float32Array(data.length);
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
  let y = 0;
  for (let i = 0; i < data.length; i++) {
    y += a * (data[i] - y);
    out[i] = y;
  }
  return out;
}

function binEnergies(data: Float32Array, bins: number): Float32Array {
  const out = new Float32Array(bins);
  const per = Math.floor(data.length / bins) || 1;
  for (let b = 0; b < bins; b++) {
    let sum = 0;
    const start = b * per;
    const end = Math.min(data.length, start + per);
    for (let i = start; i < end; i++) sum += data[i] * data[i];
    out[b] = Math.sqrt(sum / Math.max(1, end - start));
  }
  return out;
}

function unitNorm(v: Float32Array): Float32Array {
  let mag = 0;
  for (const x of v) mag += x * x;
  mag = Math.sqrt(mag) || 1;
  return v.map((x) => x / mag) as Float32Array;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot)); // both unit-norm, non-negative energies
}

export function bandEnvelopes(buffer: AudioBuffer): BandEnvelopeResult {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const low = onePoleLP(data, sr, 250);
  const lp4k = onePoleLP(data, sr, 4000);
  const mid = new Float32Array(data.length);
  const high = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    mid[i] = lp4k[i] - low[i];
    high[i] = data[i] - lp4k[i];
  }

  const bandBins = [binEnergies(low, BINS), binEnergies(mid, BINS), binEnergies(high, BINS)] as const;
  const totals = bandBins.map((b) => b.reduce((s, x) => s + x, 0)) as [number, number, number];
  const sum = totals[0] + totals[1] + totals[2] || 1;

  return {
    loudness: unitNorm(binEnergies(data, BINS)),
    bands: [unitNorm(bandBins[0]), unitNorm(bandBins[1]), unitNorm(bandBins[2])],
    balance: [totals[0] / sum, totals[1] / sum, totals[2] / sum],
  };
}

export interface CompareResult {
  bpmA: number | null;
  bpmB: number | null;
  bpmDelta: number | null;
  /** how similar the energy arc is (drops/breakdowns in the same places) 0..1 */
  structure: number;
  /** how similar the low/mid/high proportions are 0..1 */
  spectralBalance: number;
  /** per-band envelope similarity 0..1 */
  bandStructure: { low: number; mid: number; high: number };
  overall: number;
}

export function compareTracks(a: AudioBuffer, b: AudioBuffer): CompareResult {
  const ea = bandEnvelopes(a);
  const eb = bandEnvelopes(b);

  const structure = cosine(ea.loudness, eb.loudness);
  const bandStructure = {
    low: cosine(ea.bands[0], eb.bands[0]),
    mid: cosine(ea.bands[1], eb.bands[1]),
    high: cosine(ea.bands[2], eb.bands[2]),
  };
  const l1 =
    Math.abs(ea.balance[0] - eb.balance[0]) +
    Math.abs(ea.balance[1] - eb.balance[1]) +
    Math.abs(ea.balance[2] - eb.balance[2]);
  const spectralBalance = 1 - l1 / 2;

  const bpmA = detectBPM(a);
  const bpmB = detectBPM(b);
  const bpmDelta = bpmA && bpmB ? Math.abs(bpmA - bpmB) : null;

  const overall =
    0.35 * structure +
    0.25 * spectralBalance +
    0.4 * ((bandStructure.low + bandStructure.mid + bandStructure.high) / 3);

  return { bpmA, bpmB, bpmDelta, structure, spectralBalance, bandStructure, overall };
}
