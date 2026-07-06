import { engine, useStore, dispatchControl } from '../state/store';
import { DeckId } from './events';

let rampTimer: number | null = null;

/**
 * One-button mix: beat-sync the incoming deck, start it, then glide the
 * crossfader to it over `bars` bars (of the incoming track's tempo).
 * Outgoing deck pauses when the fade completes.
 */
export function autoMix(bars = 8): string {
  const s = useStore.getState();
  const loaded = [0, 1].filter((i) => s.decks[i as DeckId].trackName) as DeckId[];
  if (loaded.length < 2) return 'load both decks first';

  const a = engine.deck(0);
  const b = engine.deck(1);
  // outgoing = the deck the crossfader currently favours (or whichever plays)
  let from: DeckId;
  if (a.playing && !b.playing) from = 0;
  else if (b.playing && !a.playing) from = 1;
  else from = s.crossfade <= 0.5 ? 0 : 1;
  const to: DeckId = from === 0 ? 1 : 0;

  if (!engine.deck(from).playing) dispatchControl({ type: 'deck', deck: from, action: 'play' });
  dispatchControl({ type: 'deck', deck: to, action: 'sync' });
  dispatchControl({ type: 'deck', deck: to, action: 'play' });

  const bpm = (engine.deck(to).bpm ?? 120) * engine.deck(to).effectiveRate();
  const seconds = (bars * 4 * 60) / bpm;
  const start = performance.now();
  const startX = s.crossfade;
  const endX = to === 1 ? 1 : 0;

  if (rampTimer !== null) window.clearInterval(rampTimer);
  rampTimer = window.setInterval(() => {
    const p = Math.min(1, (performance.now() - start) / (seconds * 1000));
    // smoothstep for a DJ-ish ease in the middle
    const e = p * p * (3 - 2 * p);
    dispatchControl({ type: 'mixer', param: 'crossfade', value: startX + (endX - startX) * e });
    if (p >= 1) {
      window.clearInterval(rampTimer!);
      rampTimer = null;
      dispatchControl({ type: 'deck', deck: from, action: 'pause' });
    }
  }, 50);

  return `mixing ${from === 0 ? 'A→B' : 'B→A'} over ${bars} bars (${seconds.toFixed(0)}s)`;
}

export function cancelAutoMix() {
  if (rampTimer !== null) {
    window.clearInterval(rampTimer);
    rampTimer = null;
  }
}
