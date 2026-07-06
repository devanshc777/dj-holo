import { useEffect, useRef } from 'react';
import { engine, useStore, dispatchControl } from '../state/store';
import { DeckId } from '../control/events';

const SEC_PER_REV = 1.8; // 33⅓ rpm vinyl feel

/**
 * Spinning vinyl jog wheel. Rotation is derived from the deck playhead, so it
 * spins when playing, stops when paused, and scrubs the audio when dragged.
 */
export function JogWheel({ deck }: { deck: DeckId }) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const trackName = useStore((s) => s.decks[deck].trackName);
  const playing = useStore((s) => s.decks[deck].playing);
  const drag = useRef<{ lastAngle: number; wasPlaying: boolean; lastSeek: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    const spin = () => {
      raf = requestAnimationFrame(spin);
      const el = wheelRef.current;
      if (!el) return;
      const angle = (engine.deck(deck).playhead() / SEC_PER_REV) * 360;
      el.style.transform = `rotate(${angle}deg)`;
    };
    spin();
    return () => cancelAnimationFrame(raf);
  }, [deck]);

  const angleAt = (e: PointerEvent | React.PointerEvent) => {
    const rect = wheelRef.current!.parentElement!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(e.clientY - cy, e.clientX - cx);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!useStore.getState().decks[deck].trackName) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const d = engine.deck(deck);
    drag.current = { lastAngle: angleAt(e), wasPlaying: d.playing, lastSeek: 0 };
    if (d.playing) d.pause();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const st = drag.current;
    if (!st) return;
    const a = angleAt(e);
    let delta = a - st.lastAngle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    st.lastAngle = a;
    const d = engine.deck(deck);
    const target = d.playhead() + (delta / (2 * Math.PI)) * SEC_PER_REV;
    const now = performance.now();
    if (now - st.lastSeek > 35) {
      st.lastSeek = now;
      d.seek(Math.max(0, target));
    }
  };

  const onPointerUp = () => {
    const st = drag.current;
    drag.current = null;
    if (st?.wasPlaying) engine.deck(deck).play();
    // resync store playing flag
    dispatchControl({ type: 'deck', deck, action: st?.wasPlaying ? 'play' : 'pause' });
  };

  return (
    <div
      className={`jog deck-${deck} ${playing ? 'spinning' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={wheelRef} className="jog-vinyl">
        <div className="jog-grooves" />
        <div className="jog-label">
          <span>{trackName ?? 'NO DISC'}</span>
        </div>
        <div className="jog-marker" />
      </div>
      <div className="jog-ring" />
    </div>
  );
}
