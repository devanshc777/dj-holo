/** Every hand-tracking threshold lives here. Tune here, nowhere else. */
export const handsConfig = {
  /** thumb-index tip distance (normalized) to enter/exit pinch — gap = hysteresis */
  pinchEnter: 0.055,
  pinchExit: 0.085,
  /** fingertip-to-wrist vs knuckle-to-wrist ratio below which a finger counts as curled */
  curlRatio: 1.12,
  /** ms a fist must hold before it fires play/pause */
  fistHoldMs: 250,
  /** ms cooldown after any discrete trigger (fist, sync) */
  triggerCooldownMs: 600,
  /** one-euro filter tuning: lower minCutoff = smoother/laggier, higher beta = faster catch-up */
  oneEuro: { minCutoff: 1.2, beta: 0.007, dCutoff: 1.0 },
  /** pinch-drag sensitivity: full-frame vertical drag = this much param range */
  dragGainVolume: 1.6,
  dragGainTempo: 1.2,
  /** camera request size */
  video: { width: 640, height: 480 },
  /** MediaPipe assets (CDN; see HANDOFF.md to self-host) */
  wasmBase: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
  modelUrl:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
};
