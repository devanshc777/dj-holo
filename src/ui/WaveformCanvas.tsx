import { useEffect, useRef } from 'react';
import { engine, useStore } from '../state/store';
import { DeckId } from '../control/events';
import { dispatchControl } from '../state/store';

const DECK_COLORS = ['#00e5ff', '#ff2ec4'];

/** Peak waveform + live playhead. Click to seek. */
export function WaveformCanvas({ deck }: { deck: DeckId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaks = useStore((s) => s.decks[deck].peaks);
  const duration = useStore((s) => s.decks[deck].duration);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const { width: w, height: hgt } = canvas;
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, w, hgt);
      if (!peaks) return;

      const mid = hgt / 2;
      const pairs = peaks.length / 2;
      const step = pairs / w;
      const playX = duration ? (engine.deck(deck).playhead() / duration) * w : 0;

      for (let x = 0; x < w; x++) {
        const i = Math.floor(x * step) * 2;
        const min = peaks[i];
        const max = peaks[i + 1];
        ctx.fillStyle = x <= playX ? DECK_COLORS[deck] : '#2c3550';
        ctx.fillRect(x, mid - max * mid * 0.95, 1, Math.max(1, (max - min) * mid * 0.95));
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(playX, 0, 2, hgt);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [peaks, duration, deck]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    dispatchControl({ type: 'deck', deck, action: 'seek', value: (e.clientX - rect.left) / rect.width });
  };

  return <canvas ref={canvasRef} className="waveform" width={560} height={96} onClick={onClick} />;
}
