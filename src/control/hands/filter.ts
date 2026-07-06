/**
 * One-euro filter (Casiez et al. 2012) — adaptive lowpass for noisy
 * interactive signals: smooth when slow, responsive when fast.
 */
export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(
    private minCutoff = 1.0,
    private beta = 0.0,
    private dCutoff = 1.0,
  ) {}

  private alpha(cutoff: number, dt: number) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x: number, tMs: number): number {
    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = tMs;
      return x;
    }
    const dt = Math.max(1e-3, (tMs - this.tPrev) / 1000);
    this.tPrev = tMs;

    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    this.dxPrev = dxHat;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;
    return xHat;
  }

  reset() {
    this.xPrev = null;
    this.tPrev = null;
    this.dxPrev = 0;
  }
}

/** Filters an {x,y} landmark stream. */
export class PointFilter {
  private fx: OneEuroFilter;
  private fy: OneEuroFilter;
  constructor(minCutoff: number, beta: number, dCutoff: number) {
    this.fx = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.fy = new OneEuroFilter(minCutoff, beta, dCutoff);
  }
  filter(x: number, y: number, tMs: number) {
    return { x: this.fx.filter(x, tMs), y: this.fy.filter(y, tMs) };
  }
  reset() {
    this.fx.reset();
    this.fy.reset();
  }
}
