import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { handTracker } from '../control/hands/tracker';

/**
 * Cam mode backdrop: the webcam feed fullscreen (mirrored) behind the UI,
 * so the interface floats over you — controls are "touched" by pinching.
 */
export function CamLayer() {
  const hostRef = useRef<HTMLDivElement>(null);
  const handsStatus = useStore((s) => s.handsStatus);

  // entering cam mode starts tracking automatically
  useEffect(() => {
    if (useStore.getState().handsStatus === 'off') void handTracker.start();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const video = handTracker.videoEl;
    if (!host || !video || handsStatus === 'off' || handsStatus === 'error') return;
    video.classList.remove('cam-preview');
    video.className = 'cam-bg-video';
    host.appendChild(video);
    return () => {
      if (video.parentElement === host) host.removeChild(video);
    };
  }, [handsStatus]);

  return (
    <div className="cam-bg" ref={hostRef}>
      {(handsStatus === 'off' || handsStatus === 'starting') && (
        <div className="cam-waiting">waiting for camera…</div>
      )}
      {handsStatus === 'error' && <div className="cam-waiting">camera unavailable — cam mode needs one</div>}
    </div>
  );
}
