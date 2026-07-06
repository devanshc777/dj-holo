import { useStore } from '../state/store';

const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: 'Transport',
    rows: [
      ['Q / P', 'play·pause deck A / B'],
      ['W / O', 'cue A / B'],
      ['E / I', 'beat sync A / B'],
      ['click waveform', 'seek'],
      ['drag jog wheel', 'scratch / scrub'],
    ],
  },
  {
    title: 'Pads',
    rows: [
      ['1–4 / 7–0', 'hot cues A / B (shift = set)'],
      ['R / T', 'loop 4 · off (deck A)'],
      ['Y / U', 'loop 4 · off (deck B)'],
      ['A / S / D', 'deck A: echo out · brake · backspin'],
      ['J / K / L', 'deck B: echo out · brake · backspin'],
    ],
  },
  {
    title: 'Mix',
    rows: [
      ['Z / X', 'crossfader nudge'],
      ['M', 'automix — sync + 8-bar crossfade'],
      ['Space', 'record start/stop → MIXES shelf'],
    ],
  },
  {
    title: 'Modes',
    rows: [
      ['V', 'classic → cam → holo'],
      ['H', 'hand-tracking on/off'],
      ['?', 'this help'],
    ],
  },
  {
    title: 'Cam mode (AR touch)',
    rows: [
      ['fingertip', 'cursor (per hand)'],
      ['pinch', 'click button / grab slider or jog'],
      ['pinch + move', 'drag fader · scratch · seek'],
    ],
  },
  {
    title: 'Hands (webcam)',
    rows: [
      ['pinch + drag ↕ / ↔', 'volume / tempo'],
      ['fist (hold)', 'play·pause'],
      ['two-finger point ↔', 'crossfader'],
      ['open palm height', 'FX amount'],
      ['victory → fist', 'beat sync'],
    ],
  },
];

export function HelpOverlay() {
  const open = useStore((s) => s.helpOpen);
  const setOpen = useStore((s) => s.setHelpOpen);
  if (!open) return null;

  return (
    <div className="help-overlay" onClick={() => setOpen(false)}>
      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>CONTROLS</h2>
          <button onClick={() => setOpen(false)}>✕</button>
        </header>
        <div className="help-grid">
          {SECTIONS.map((s) => (
            <div key={s.title} className="help-section">
              <h3>{s.title}</h3>
              {s.rows.map(([k, v]) => (
                <div key={k} className="help-row">
                  <kbd>{k}</kbd>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <footer>left hand → deck A · right hand → deck B · full reference in docs/GESTURES.md</footer>
      </div>
    </div>
  );
}
