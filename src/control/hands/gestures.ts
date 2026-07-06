import { handsConfig } from './config';

/** MediaPipe hand landmark indices we use. */
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_TIP: 20,
} as const;

export interface Pt {
  x: number;
  y: number;
  z?: number;
}

export type Pose = 'pinch' | 'fist' | 'point' | 'palm' | 'none';

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** finger extended = tip meaningfully further from wrist than its knuckle */
function extended(lm: Pt[], tip: number, mcp: number): boolean {
  const w = lm[LM.WRIST];
  return dist(lm[tip], w) > dist(lm[mcp], w) * handsConfig.curlRatio;
}

/**
 * Pure pose classifier for one hand's 21 landmarks (normalized coords).
 * Priority: pinch > fist > point > palm — pinch wins because thumb+index
 * touching is deliberate even if other fingers are loose.
 */
export function detectPose(lm: Pt[], pinched: boolean): Pose {
  if (lm.length < 21) return 'none';

  // scale-invariant: everything relative to hand span, so distance from the
  // camera doesn't change what counts as a pinch
  const span = dist(lm[LM.WRIST], lm[LM.MIDDLE_MCP]) || 1e-6;
  const pinchRatio = dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) / span;
  const pinchNow = pinched
    ? pinchRatio < handsConfig.pinchExitRatio
    : pinchRatio < handsConfig.pinchEnterRatio;
  if (pinchNow) return 'pinch';

  const idx = extended(lm, LM.INDEX_TIP, LM.INDEX_MCP);
  const mid = extended(lm, LM.MIDDLE_TIP, LM.MIDDLE_MCP);
  const ring = extended(lm, LM.RING_TIP, LM.RING_MCP);
  const pinky = extended(lm, LM.PINKY_TIP, LM.PINKY_MCP);

  if (!idx && !mid && !ring && !pinky) return 'fist';
  if (idx && mid && !ring && !pinky) return 'point';
  if (idx && mid && ring && pinky) return 'palm';
  return 'none';
}

export interface GestureEvent {
  kind: 'fistHold' | 'syncCombo';
}

/**
 * Stateful per-hand recognizer: hysteresis via `pinched` feedback,
 * hold-timer for fist, victory→fist combo for sync, cooldowns on triggers.
 */
export class GestureRecognizer {
  pose: Pose = 'none';
  private fistSince: number | null = null;
  private lastPose: Pose = 'none';
  private lastPoseAt = 0;
  private cooldownUntil = 0;
  private fistFired = false;

  /** Feed one frame; returns discrete events fired this frame. */
  update(lm: Pt[], tMs: number): GestureEvent[] {
    const events: GestureEvent[] = [];
    const pose = detectPose(lm, this.pose === 'pinch');

    if (pose !== this.pose) {
      this.lastPose = this.pose;
      this.lastPoseAt = tMs;
      this.pose = pose;
      if (pose === 'fist') {
        this.fistSince = tMs;
        this.fistFired = false;
        // point (victory) → fist within 500ms = sync combo
        if (this.lastPose === 'point' && tMs - this.lastPoseAt < 500 && tMs >= this.cooldownUntil) {
          events.push({ kind: 'syncCombo' });
          this.cooldownUntil = tMs + handsConfig.triggerCooldownMs;
          this.fistFired = true; // combo consumed the fist
        }
      } else {
        this.fistSince = null;
      }
    }

    if (
      this.pose === 'fist' &&
      !this.fistFired &&
      this.fistSince !== null &&
      tMs - this.fistSince >= handsConfig.fistHoldMs &&
      tMs >= this.cooldownUntil
    ) {
      events.push({ kind: 'fistHold' });
      this.fistFired = true;
      this.cooldownUntil = tMs + handsConfig.triggerCooldownMs;
    }

    return events;
  }

  reset() {
    this.pose = 'none';
    this.fistSince = null;
    this.fistFired = false;
  }
}
