import { useCallback } from 'react';
import { dispatchControl, useStore } from '../state/store';
import { DeckId } from '../control/events';
import { WaveformCanvas } from './WaveformCanvas';
import { loadTrackFile, loadDemoTrack } from './loadTrack';

const DEMOS: Record<DeckId, { url: string; name: string }> = {
  0: { url: '/demo-tracks/neon-drive-120.wav', name: 'Neon Drive (120)' },
  1: { url: '/demo-tracks/pulse-grid-128.wav', name: 'Pulse Grid (128)' },
};

export function DeckPanel({ deck }: { deck: DeckId }) {
  const d = useStore((s) => s.decks[deck]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void loadTrackFile(deck, file);
    },
    [deck],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void loadTrackFile(deck, file);
      e.target.value = '';
    },
    [deck],
  );

  const set = (param: 'tempo' | 'fxWet' | 'filter') => (e: React.ChangeEvent<HTMLInputElement>) =>
    dispatchControl({ type: 'param', deck, param, value: Number(e.target.value) });

  return (
    <section className={`deck deck-${deck}`} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <header className="deck-head">
        <span className="deck-label">{deck === 0 ? 'A' : 'B'}</span>
        <span className="track-name">{d.trackName ?? 'drop a track / load demo'}</span>
        <span className="bpm">{d.bpm ? `${d.bpm} BPM` : '—'}</span>
      </header>

      <WaveformCanvas deck={deck} />

      <div className="row transport">
        <button className={d.playing ? 'active' : ''} onClick={() => dispatchControl({ type: 'deck', deck, action: 'toggle' })}>
          {d.playing ? '❚❚' : '▶'}
        </button>
        <button onClick={() => dispatchControl({ type: 'deck', deck, action: 'cue' })}>CUE</button>
        <button onClick={() => dispatchControl({ type: 'deck', deck, action: 'sync' })}>SYNC</button>
        <label className="load-btn">
          LOAD
          <input type="file" accept="audio/*" onChange={onPick} hidden />
        </label>
        <button onClick={() => void loadDemoTrack(deck, DEMOS[deck].url, DEMOS[deck].name)}>DEMO</button>
      </div>

      <div className="row">
        <label className="slider-label">
          tempo
          <input type="range" min={0} max={1} step={0.001} value={d.tempo} onChange={set('tempo')} />
        </label>
        <label className="slider-label">
          filter
          <input type="range" min={0} max={1} step={0.001} value={d.filter} onChange={set('filter')} />
        </label>
        <label className="slider-label">
          fx
          <input type="range" min={0} max={1} step={0.001} value={d.fxWet} onChange={set('fxWet')} />
        </label>
      </div>

      <div className="row pads">
        {([0, 1, 2, 3] as const).map((slot) => (
          <button
            key={slot}
            className={`pad ${d.hotcues[slot] !== null ? 'set' : ''}`}
            onClick={() =>
              dispatchControl({
                type: 'hotcue',
                deck,
                slot,
                action: d.hotcues[slot] === null ? 'set' : 'jump',
              })
            }
            onContextMenu={(e) => {
              e.preventDefault();
              dispatchControl({ type: 'hotcue', deck, slot, action: 'clear' });
            }}
            title="click: set/jump · right-click: clear"
          >
            {slot + 1}
          </button>
        ))}
        {([1, 2, 4, 8] as const).map((beats) => (
          <button
            key={beats}
            className={`pad loop ${d.loopBeats === beats ? 'set' : ''}`}
            onClick={() => dispatchControl({ type: 'loop', deck, beats: d.loopBeats === beats ? null : beats })}
          >
            {beats}⟲
          </button>
        ))}
      </div>
    </section>
  );
}
