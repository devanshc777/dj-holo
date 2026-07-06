import { useStore } from '../state/store';
import { DeckId } from '../control/events';

/**
 * Fred-Again-style performance pads. Left 4 sample deck A, right 4 sample
 * deck B: tap an empty pad to grab 2 beats at the playhead, tap again to
 * fire it. Right-click (or long think) clears.
 */
export function SamplerPads() {
  const pads = useStore((s) => s.pads);
  const padAction = useStore((s) => s.padAction);
  const padClear = useStore((s) => s.padClear);

  return (
    <div className="sampler">
      <span className="sampler-label">PADS</span>
      {pads.map((p, i) => {
        const deck = (i < 4 ? 0 : 1) as DeckId;
        return (
          <button
            key={i}
            className={`spad ${p.filled ? `filled deck-${p.deck}` : ''}`}
            title={p.filled ? `fire (${p.seconds.toFixed(1)}s) · right-click clears` : `sample 2 beats from deck ${deck === 0 ? 'A' : 'B'}`}
            onClick={() => padAction(i, deck)}
            onContextMenu={(e) => {
              e.preventDefault();
              padClear(i);
            }}
          >
            {p.filled ? '◆' : '◇'}
            <small>{i + 1}</small>
          </button>
        );
      })}
      <span className="sampler-hint">tap empty = sample deck · tap filled = fire</span>
    </div>
  );
}
