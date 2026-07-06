import { dispatchControl, useStore } from '../state/store';
import { DeckId } from '../control/events';
import { autoMix } from '../control/automix';

function EqColumn({ deck }: { deck: DeckId }) {
  const d = useStore((s) => s.decks[deck]);
  const set = (param: 'eqHigh' | 'eqMid' | 'eqLow' | 'volume') => (e: React.ChangeEvent<HTMLInputElement>) =>
    dispatchControl({ type: 'param', deck, param, value: Number(e.target.value) });

  return (
    <div className="eq-col">
      {(['eqHigh', 'eqMid', 'eqLow'] as const).map((band) => (
        <label key={band} className="knob-label">
          {band.replace('eq', '').toLowerCase()}
          <input type="range" min={0} max={1} step={0.001} value={d[band]} onChange={set(band)} />
        </label>
      ))}
      <label className="knob-label vol">
        vol
        <input
          type="range"
          className="vertical"
          min={0}
          max={1}
          step={0.001}
          value={d.volume}
          onChange={set('volume')}
        />
      </label>
    </div>
  );
}

export function MixerPanel() {
  const crossfade = useStore((s) => s.crossfade);
  const master = useStore((s) => s.master);

  return (
    <section className="mixer">
      <div className="eq-row">
        <EqColumn deck={0} />
        <EqColumn deck={1} />
      </div>
      <button className="automix" onClick={() => useStore.getState().showToast(autoMix())}>
        ⚡ AUTOMIX <kbd>M</kbd>
      </button>
      <label className="slider-label xfade">
        crossfader
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={crossfade}
          onChange={(e) => dispatchControl({ type: 'mixer', param: 'crossfade', value: Number(e.target.value) })}
        />
      </label>
      <label className="slider-label">
        master
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={master}
          onChange={(e) => dispatchControl({ type: 'mixer', param: 'master', value: Number(e.target.value) })}
        />
      </label>
    </section>
  );
}
