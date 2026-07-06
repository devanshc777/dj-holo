import { useStore, HandPoint } from '../state/store';
import { DeckId } from './events';

/**
 * Cam-mode touch layer: each tracked fingertip is a cursor; pinch acts as
 * press / drag / release on the REAL DOM under it. Buttons click, range
 * sliders drag, waveforms seek, jog wheels scratch — no special-case UI,
 * the overlay drives the same interface the mouse does.
 */

type DragTarget =
  | { kind: 'range'; el: HTMLInputElement }
  | { kind: 'jog'; el: Element }
  | null;

interface CursorState {
  pinched: boolean;
  drag: DragTarget;
}

const cursors: Record<DeckId, CursorState> = {
  0: { pinched: false, drag: null },
  1: { pinched: false, drag: null },
};

const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;

function setRangeFromPoint(input: HTMLInputElement, x: number, y: number) {
  const r = input.getBoundingClientRect();
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const vertical = r.height > r.width;
  let f = vertical ? 1 - (y - r.top) / r.height : (x - r.left) / r.width;
  f = Math.min(1, Math.max(0, f));
  nativeValueSetter.call(input, String(min + f * (max - min)));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function pointerEvent(type: string, x: number, y: number, id: number) {
  return new PointerEvent(type, { bubbles: true, pointerId: id + 10, clientX: x, clientY: y, isPrimary: true });
}

function press(x: number, y: number, deck: DeckId) {
  const el = document.elementFromPoint(x, y);
  if (!el) return;
  const c = cursors[deck];

  const jog = el.closest('.jog');
  if (jog) {
    c.drag = { kind: 'jog', el: jog };
    jog.dispatchEvent(pointerEvent('pointerdown', x, y, deck));
    return;
  }

  const range =
    el instanceof HTMLInputElement && el.type === 'range'
      ? el
      : el.closest('label')?.querySelector<HTMLInputElement>('input[type="range"]') ?? null;
  if (range) {
    c.drag = { kind: 'range', el: range };
    setRangeFromPoint(range, x, y);
    return;
  }

  const clickable = el.closest('button, .load-btn, canvas, [role="button"]');
  if (clickable) {
    clickable.classList.add('touch-press');
    setTimeout(() => clickable.classList.remove('touch-press'), 180);
    clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  }
}

function move(x: number, y: number, deck: DeckId) {
  const d = cursors[deck].drag;
  if (!d) return;
  if (d.kind === 'range') setRangeFromPoint(d.el, x, y);
  else d.el.dispatchEvent(pointerEvent('pointermove', x, y, deck));
}

function release(x: number, y: number, deck: DeckId) {
  const d = cursors[deck].drag;
  cursors[deck].drag = null;
  if (d?.kind === 'jog') d.el.dispatchEvent(pointerEvent('pointerup', x, y, deck));
}

/** Feed one frame of hand points (call only in cam mode). */
export function touchFrame(points: HandPoint[]) {
  const seen = new Set<DeckId>();
  for (const p of points) {
    seen.add(p.deck);
    const x = p.x * window.innerWidth;
    const y = p.y * window.innerHeight;
    const c = cursors[p.deck];
    if (p.pinch && !c.pinched) press(x, y, p.deck);
    else if (p.pinch && c.pinched) move(x, y, p.deck);
    else if (!p.pinch && c.pinched) release(x, y, p.deck);
    c.pinched = p.pinch;
  }
  // hand vanished mid-pinch → release
  ([0, 1] as DeckId[]).forEach((d) => {
    if (!seen.has(d) && cursors[d].pinched) {
      release(window.innerWidth / 2, window.innerHeight / 2, d);
      cursors[d].pinched = false;
    }
  });
}

/** Wire the store → touchFrame subscription. Returns unsubscribe. */
export function bindTouchCursor(): () => void {
  return useStore.subscribe((s, prev) => {
    if (s.uiMode !== 'cam') return;
    if (s.handPoints !== prev.handPoints) touchFrame(s.handPoints);
  });
}
