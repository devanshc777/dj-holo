import { handTracker } from './hands/tracker';

/**
 * Landmarks are normalized to the CAMERA frame (e.g. 4:3); the cam-mode
 * backdrop renders with object-fit: cover, which crops. This maps hand
 * coords through the same cover transform so the cursor sits exactly on
 * the user's fingertip in the video.
 */
export function mapCamToViewport(x: number, y: number): { x: number; y: number } {
  const v = handTracker.videoEl;
  const W = window.innerWidth;
  const H = window.innerHeight;
  if (!v || !v.videoWidth) return { x: x * W, y: y * H };
  const scale = Math.max(W / v.videoWidth, H / v.videoHeight);
  const sw = v.videoWidth * scale;
  const sh = v.videoHeight * scale;
  return { x: x * sw - (sw - W) / 2, y: y * sh - (sh - H) / 2 };
}
