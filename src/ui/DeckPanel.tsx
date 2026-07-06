import { useCallback } from 'react';
import { dispatchControl, useStore } from '../state/store';
import { DeckId } from '../control/events';
import { JogWheel } from './JogWheel';
import { loadTrackFile } from './loadTrack';

const KEYS: Record<DeckId, { play: string; cue: string; sync: string }> = {
  0: { play: 'Q', cue: 'W', sync: 'E' },
  1: { play: 'P', cue: 'O', sync: 'I' },
};

export function DeckPanel({ deck }: { deck: DeckId }) {
  const d = useStore((s) => s.decks[deck]);
  const k = KEYS[deck];

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

  const tempoPct = ((d.tempo - 0.5) * 16).toFixed(1);

  return (
    <section className={`deck deck-${deck}`} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <header className="deck-head">
        <span className="deck-label">{deck === 0 ? 'A' : 'B'}</span>
        <span className="track-name">{d.trackName ?? 'no track loaded'}</span>
        <span className="bpm">{d.bpm ? `${(d.bpm * (0.92 + d.tempo * 0.16)).toFixed(1)} BPM` : '—'}</span>
      </header>

      <div className="deck-body">
        {deck === 1 && <PitchColumn value={d.tempo} pct={tempoPct} onChange={set('tempo')} />}
        <JogWheel deck={deck} />
        {deck === 0 && <PitchColumn value={d.tempo} pct={tempoPct} onChange={set('tempo')} />}
      </div>

      <div className="row transport">
        <button
          className={`play ${d.playing ? 'active' : ''}`}
          onClick={() => dispatchControl({ type: 'deck', deck, action: 'toggle' })}
        >
          {d.playing ? '❚❚' : '▶'} <kbd>{k.play}</kbd>
        </button>
        <button onClick={() => dispatchControl({ type: 'deck', deck, action: 'cue' })}>
          CUE <kbd>{k.cue}</kbd>
        </button>
        <button onClick={() => dispatchControl({ type: 'deck', deck, action: 'sync' })}>
          SYNC <kbd>{k.sync}</kbd>
        </button>
        <label className="load-btn">
          LOAD
          <input type="file" accept="audio/*" onChange={onPick} hidden />
        </label>
      </div>

      <div className="row fx-row">
        <label className="slider-label">
          filter
          <input type="range" min={0} max={1} step={0.001} value={d.filter} onChange={set('filter')} />
        </label>
        <label className="slider-label">
          fx
          <input type="range" min={0} max={1} step={0.001} value={d.fxWet} onChange={set('fxWet')} />
        </label>
        <button className="exit-fx" title="echo out" onClick={() => dispatchControl({ type: 'deck', deck, action: 'echoOut' })}>
          ECHO
        </button>
        <button className="exit-fx" title="vinyl brake" onClick={() => dispatchControl({ type: 'deck', deck, action: 'brake' })}>
          BRK
        </button>
        <button className="exit-fx" title="backspin" onClick={() => dispatchControl({ type: 'deck', deck, action: 'backspin' })}>
          SPIN
        </button>
      </div>

      <div className="row pads">
        {([0, 1, 2, 3] as const).map((slot) => (
          <button
            key={slot}
            className={`pad ${d.hotcues[slot] !== null ? 'set' : ''}`}
            onClick={() =>
              dispatchControl({ type: 'hotcue', deck, slot, action: d.hotcues[slot] === null ? 'set' : 'jump' })
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

function PitchColumn({
  value,
  pct,
  onChange,
}: {
  value: number;
  pct: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="pitch-col">
      <span className="pitch-pct">{Number(pct) > 0 ? `+${pct}` : pct}%</span>
      <input
        type="range"
        className="pitch-fader"
        min={0}
        max={1}
        step={0.001}
        value={value}
        onChange={onChange}
      />
      <span className="pitch-word">pitch</span>
    </div>
  );
}
