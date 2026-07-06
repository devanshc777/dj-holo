import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { handTracker } from '../control/hands/tracker';

export function TopBar({
  onToggleHands,
  onToggleRecord,
}: {
  onToggleHands: () => void;
  onToggleRecord: () => void;
}) {
  const handsStatus = useStore((s) => s.handsStatus);
  const recording = useStore((s) => s.recording);
  const uiMode = useStore((s) => s.uiMode);
  const setUiMode = useStore((s) => s.setUiMode);
  const previewRef = useRef<HTMLDivElement>(null);

  // mount the tracker's <video> as a small mirrored preview while tracking
  useEffect(() => {
    const el = previewRef.current;
    const video = handTracker.videoEl;
    if (!el) return;
    if (handsStatus !== 'off' && handsStatus !== 'error' && video) {
      video.className = 'cam-preview';
      el.appendChild(video);
      return () => {
        if (video.parentElement === el) el.removeChild(video);
      };
    }
  }, [handsStatus]);

  const dot =
    handsStatus === 'tracking' ? 'green' : handsStatus === 'off' || handsStatus === 'error' ? 'red' : 'amber';

  return (
    <header className="topbar">
      <h1>
        dj<span className="accent">-holo</span>
      </h1>
      <div className="topbar-controls">
        {(['classic', 'cam', 'holo'] as const).map((m) => (
          <button key={m} className={uiMode === m ? 'active' : ''} onClick={() => setUiMode(m)}>
            {m.toUpperCase()}
          </button>
        ))}
        <button className={handsStatus !== 'off' ? 'active' : ''} onClick={onToggleHands}>
          <span className={`dot ${dot}`} /> HANDS (H)
        </button>
        <button className={recording ? 'rec active' : 'rec'} onClick={onToggleRecord}>
          {recording ? '■ STOP' : '● REC'} (Space)
        </button>
        <button onClick={() => useStore.getState().setHelpOpen(!useStore.getState().helpOpen)}>? KEYS</button>
      </div>
      <div ref={previewRef} className="cam-slot" />
    </header>
  );
}
