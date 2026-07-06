/**
 * Offline track analysis: waveform peaks for display, BPM via onset
 * energy + inter-onset-interval histogram. Tuned for 4/4 electronic
 * material, BPM folded into 70–180.
 */

/** Min/max pair per window → Float32Array [min0, max0, min1, max1, ...]. */
export function computePeaks(buffer: AudioBuffer, windowSize = 512): Float32Array {
  const data = buffer.getChannelData(0);
  const windows = Math.ceil(data.length / windowSize);
  const peaks = new Float32Array(windows * 2);
  for (let w = 0; w < windows; w++) {
    let min = Infinity;
    let max = -Infinity;
    const end = Math.min(data.length, (w + 1) * windowSize);
    for (let i = w * windowSize; i < end; i++) {
      const v = data[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    peaks[w * 2] = min === Infinity ? 0 : min;
    peaks[w * 2 + 1] = max === -Infinity ? 0 : max;
  }
  return peaks;
}

export function detectBPM(buffer: AudioBuffer): number | null {
  const sr = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  if (data.length < sr * 4) return null;

  // 1. Energy envelope in ~11ms hops (one-pole lowpassed to favour beats)
  const hop = 512;
  const nHops = Math.floor(data.length / hop);
  const energy = new Float32Array(nHops);
  for (let h = 0; h < nHops; h++) {
    let sum = 0;
    for (let i = h * hop; i < (h + 1) * hop; i++) sum += data[i] * data[i];
    energy[h] = sum;
  }

  // 2. Onsets: energy rise above adaptive threshold
  const onsets: number[] = [];
  const mean = energy.reduce((a, b) => a + b, 0) / nHops;
  if (mean === 0) return null;
  const minGap = Math.floor((0.25 * sr) / hop); // ≥250ms between onsets (≤240 BPM)
  let last = -minGap;
  for (let h = 1; h < nHops - 1; h++) {
    if (
      energy[h] > 1.5 * mean &&
      energy[h] > energy[h - 1] * 1.3 &&
      energy[h] >= energy[h + 1] &&
      h - last >= minGap
    ) {
      onsets.push(h);
      last = h;
    }
  }
  if (onsets.length < 8) return null;

  // 3. Inter-onset-interval histogram (quantized to hops)
  const hist = new Map<number, number>();
  for (let i = 1; i < onsets.length; i++) {
    const ioi = onsets[i] - onsets[i - 1];
    hist.set(ioi, (hist.get(ioi) ?? 0) + 1);
    // also merge near-neighbours to absorb jitter
    hist.set(ioi - 1, (hist.get(ioi - 1) ?? 0) + 0.5);
    hist.set(ioi + 1, (hist.get(ioi + 1) ?? 0) + 0.5);
  }
  let bestIoi = 0;
  let bestCount = 0;
  for (const [ioi, count] of hist) {
    if (count > bestCount) {
      bestCount = count;
      bestIoi = ioi;
    }
  }
  if (bestIoi <= 0) return null;

  // 4. Interval → BPM, octave-fold into 70..180
  let bpm = 60 / ((bestIoi * hop) / sr);
  while (bpm < 70) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return Math.round(bpm * 10) / 10;
}
