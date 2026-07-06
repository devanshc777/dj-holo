import { lazy, Suspense, useCallback, useEffect } from 'react';
import { engine, useStore } from './state/store';
import { bindKeyboard } from './control/keyboard';
import { bindMidi } from './control/midi';
import { handTracker } from './control/hands/tracker';
import { TopBar } from './ui/TopBar';
import { DeckPanel } from './ui/DeckPanel';
import { MixerPanel } from './ui/MixerPanel';

const HoloScene = lazy(() => import('./holo/HoloScene'));

function HandCursors() {
  const points = useStore((s) => s.handPoints);
  return (
    <>
      {points.map((p) => (
        <div
          key={p.deck}
          className={`hand-cursor deck-${p.deck} pose-${p.pose}`}
          style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
        >
          {p.pose === 'pinch' ? '◉' : p.pose === 'fist' ? '✊' : p.pose === 'point' ? '☝' : '✋'}
        </div>
      ))}
    </>
  );
}

export function App() {
  const uiMode = useStore((s) => s.uiMode);
  const toast = useStore((s) => s.toast);

  const toggleHands = useCallback(() => {
    if (useStore.getState().handsStatus === 'off') void handTracker.start();
    else handTracker.stop();
  }, []);

  const toggleRecord = useCallback(() => {
    const { recording, setRecording, showToast } = useStore.getState();
    if (!recording) {
      if (engine.startRecording()) {
        setRecording(true);
        showToast('Recording set…');
      } else {
        showToast('Recording unsupported in this browser');
      }
    } else {
      void engine.stopRecording().then((blob) => {
        setRecording(false);
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        a.download = `set-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.webm`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('Set saved');
      });
    }
  }, []);

  useEffect(() => {
    const unbind = bindKeyboard({
      toggleHands,
      toggleRecord,
      toggleUiMode: () => {
        const s = useStore.getState();
        s.setUiMode(s.uiMode === 'classic' ? 'holo' : 'classic');
      },
    });
    void bindMidi();
    return unbind;
  }, [toggleHands, toggleRecord]);

  return (
    <div className="app">
      <TopBar onToggleHands={toggleHands} onToggleRecord={toggleRecord} />
      {uiMode === 'classic' ? (
        <main className="classic">
          <DeckPanel deck={0} />
          <MixerPanel />
          <DeckPanel deck={1} />
        </main>
      ) : (
        <Suspense fallback={<div className="holo-loading">entering the hologram…</div>}>
          <HoloScene />
        </Suspense>
      )}
      <HandCursors />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
