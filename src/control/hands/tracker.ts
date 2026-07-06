import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { dispatchControl, useStore, engine, HandPoint } from '../../state/store';
import { DeckId } from '../events';
import { handsConfig } from './config';
import { GestureRecognizer, LM, Pt } from './gestures';
import { PointFilter } from './filter';

interface HandRuntime {
  recognizer: GestureRecognizer;
  filter: PointFilter;
  // pinch-drag anchors: value + position captured on pinch enter
  grab: { x: number; y: number; volume: number; tempo: number } | null;
}

/**
 * Webcam → MediaPipe HandLandmarker → gestures → ControlEvents.
 * Left hand drives Deck A, right hand Deck B (video is mirrored,
 * so MediaPipe's reported handedness is flipped back here).
 */
export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private hands: Record<DeckId, HandRuntime> = {
    0: this.freshHand(),
    1: this.freshHand(),
  };

  private freshHand(): HandRuntime {
    const { minCutoff, beta, dCutoff } = handsConfig.oneEuro;
    return { recognizer: new GestureRecognizer(), filter: new PointFilter(minCutoff, beta, dCutoff), grab: null };
  }

  /** The video element (for UI preview). Null until started. */
  get videoEl() {
    return this.video;
  }

  async start(): Promise<void> {
    const setStatus = useStore.getState().setHandsStatus;
    setStatus('starting');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: handsConfig.video.width, height: handsConfig.video.height, facingMode: 'user' },
        audio: false,
      });
    } catch {
      setStatus('error');
      useStore.getState().showToast('Camera unavailable — mouse/keyboard still work');
      return;
    }

    try {
      const fileset = await FilesetResolver.forVisionTasks(handsConfig.wasmBase);
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: handsConfig.modelUrl, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    } catch {
      setStatus('error');
      useStore.getState().showToast('Hand model failed to load (offline?) — camera off');
      this.stopStream();
      return;
    }

    this.video = document.createElement('video');
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play();
    setStatus('no-hands');
    this.loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.landmarker?.close();
    this.landmarker = null;
    this.stopStream();
    this.video = null;
    this.hands = { 0: this.freshHand(), 1: this.freshHand() };
    useStore.getState().setHandsStatus('off');
    useStore.getState().setHandPoints([]);
  }

  private stopStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.landmarker || !this.video || this.video.readyState < 2) return;

    const t = performance.now();
    const result = this.landmarker.detectForVideo(this.video, t);
    const points: HandPoint[] = [];
    const seen = new Set<DeckId>();

    result.landmarks.forEach((lm, i) => {
      // mirrored preview: MediaPipe "Left" label = user's right hand
      const label = result.handedness[i]?.[0]?.categoryName ?? 'Left';
      const deck: DeckId = label === 'Left' ? 1 : 0;
      if (seen.has(deck)) return;
      seen.add(deck);
      this.processHand(deck, lm as Pt[], t, points);
    });

    // hands that vanished this frame lose their state
    ([0, 1] as DeckId[]).forEach((d) => {
      if (!seen.has(d)) {
        this.hands[d].recognizer.reset();
        this.hands[d].filter.reset();
        this.hands[d].grab = null;
      }
    });

    useStore.getState().setHandPoints(points);
    const status = points.length ? 'tracking' : 'no-hands';
    if (useStore.getState().handsStatus !== status) useStore.getState().setHandsStatus(status);
  };

  private processHand(deck: DeckId, lm: Pt[], t: number, points: HandPoint[]) {
    const h = this.hands[deck];
    const wrist = lm[LM.WRIST];
    // mirror x so movement matches what the user sees
    const p = h.filter.filter(1 - wrist.x, wrist.y, t);
    const events = h.recognizer.update(lm, t);
    const pose = h.recognizer.pose;
    points.push({ x: p.x, y: p.y, deck, pose });

    for (const ev of events) {
      if (ev.kind === 'fistHold') dispatchControl({ type: 'deck', deck, action: 'toggle' });
      if (ev.kind === 'syncCombo') dispatchControl({ type: 'deck', deck, action: 'sync' });
    }

    const deckUI = useStore.getState().decks[deck];

    if (pose === 'pinch') {
      if (!h.grab) {
        h.grab = { x: p.x, y: p.y, volume: deckUI.volume, tempo: deckUI.tempo };
      } else {
        const dy = h.grab.y - p.y; // up = positive
        const dx = p.x - h.grab.x;
        const vol = clamp01(h.grab.volume + dy * handsConfig.dragGainVolume);
        const tempo = clamp01(h.grab.tempo + dx * handsConfig.dragGainTempo);
        if (Math.abs(dy) > Math.abs(dx)) dispatchControl({ type: 'param', deck, param: 'volume', value: vol });
        else dispatchControl({ type: 'param', deck, param: 'tempo', value: tempo });
      }
    } else {
      h.grab = null;
      if (pose === 'point') {
        dispatchControl({ type: 'mixer', param: 'crossfade', value: clamp01(1 - lm[LM.INDEX_TIP].x) });
      } else if (pose === 'palm') {
        dispatchControl({ type: 'param', deck, param: 'fxWet', value: clamp01(1 - p.y * 1.4) });
      }
    }

    engine.resume();
  }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const handTracker = new HandTracker();
