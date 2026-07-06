import { lazy, Suspense, useCallback, useEffect } from 'react';
import { engine, useStore } from './state/store';
import { bindKeyboard } from './control/keyboard';
import { bindMidi } from './control/midi';
import { handTracker } from './control/hands/tracker';
import { TopBar } from './ui/TopBar';
import { DeckPanel } from './ui/DeckPanel';
import { MixerPanel } from './ui/MixerPanel';
import { Library } from './ui/Library';
import { HelpOverlay } from './ui/HelpOverlay';
import { WaveformCanvas } from './ui/WaveformCanvas';
import { CamLayer } from './ui/CamLayer';
import { SamplerPads } from './ui/SamplerPads';
import { bindTouchCursor } from './control/touchCursor';
import { mapCamToViewport } from './control/camMap';

const HoloScene = lazy(() => import('./holo/HoloScene'));

function HandCursors() {
  const points = useStore((s) => s.handPoints);
  const uiMode = useStore((s) => s.uiMode);
  return (
    <>
      {points.map((p) =>
        uiMode === 'cam' ? (
          <div
            key={p.deck}
            className={`touch-cursor deck-${p.deck} ${p.pinch ? 'pinched' : ''}`}
            style={(() => {
              const m = mapCamToViewport(p.x, p.y);
              return { left: m.x, top: m.y };
            })()}
          />
        ) : (
          <div
            key={p.deck}
            className={`hand-cursor deck-${p.deck} pose-${p.pose}`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            {p.pose === 'pinch' ? '◉' : p.pose === 'fist' ? '✊' : p.pose === 'point' ? '☝' : '✋'}
          </div>
        ),
      )}
    </>
  );
}

const MODE_CYCLE = { classic: 'cam', cam: 'holo', holo: 'classic' } as const;

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
      void engine.stopRecording().then(async (blob) => {
        if (blob) {
          const { saveMix } = await import('./state/mixes');
          const meta = await saveMix(blob);
          showToast(`${meta.name} saved to MIXES shelf`);
        }
        setRecording(false); // after save so the shelf refresh sees the new mix
      });
    }
  }, []);

  useEffect(() => {
    const unbind = bindKeyboard({
      toggleHands,
      toggleRecord,
      toggleUiMode: () => {
        const s = useStore.getState();
        s.setUiMode(MODE_CYCLE[s.uiMode]);
      },
    });
    void bindMidi();
    const untouch = bindTouchCursor();
    return () => {
      unbind();
      untouch();
    };
  }, [toggleHands, toggleRecord]);

  return (
    <div className="app">
      <TopBar onToggleHands={toggleHands} onToggleRecord={toggleRecord} />
      {uiMode === 'cam' && <CamLayer />}
      {uiMode !== 'holo' ? (
        <main className={`classic ${uiMode === 'cam' ? 'cam-mode' : ''}`}>
          <div className="wave-stack">
            <WaveformCanvas deck={0} />
            <WaveformCanvas deck={1} />
          </div>
          <SamplerPads />
          <div className="deck-row">
            <DeckPanel deck={0} />
            <MixerPanel />
            <DeckPanel deck={1} />
          </div>
          <Library />
        </main>
      ) : (
        <Suspense fallback={<div className="holo-loading">entering the hologram…</div>}>
          <HoloScene />
        </Suspense>
      )}
      <HandCursors />
      <HelpOverlay />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
