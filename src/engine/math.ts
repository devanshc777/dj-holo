/** Equal-power crossfade: x 0..1 → [gainA, gainB]. */
export function equalPower(x: number): [number, number] {
  const c = Math.min(1, Math.max(0, x));
  return [Math.cos((c * Math.PI) / 2), Math.sin((c * Math.PI) / 2)];
}

/** EQ knob 0..1 → dB. 0 = -26 (kill), 0.5 = flat, 1 = +6 boost. */
export function eqValueToDb(v: number): number {
  const c = Math.min(1, Math.max(0, v));
  return c < 0.5 ? -26 + (c / 0.5) * 26 : ((c - 0.5) / 0.5) * 6;
}

/** Tempo slider 0..1 → playback rate 0.92..1.08 (±8%). */
export function tempoValueToRate(v: number): number {
  const c = Math.min(1, Math.max(0, v));
  return 0.92 + c * 0.16;
}

/** Loop length in buffer seconds for `beats` at track `bpm`. */
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}
