import { useCallback, useRef } from 'react';
import { useStore } from '../state/store';
import { loadDemoTrack } from './loadTrack';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function Library() {
  const library = useStore((s) => s.library);
  const analyzing = useStore((s) => s.analyzing);
  const addToLibrary = useStore((s) => s.addToLibrary);
  const loadFromLibrary = useStore((s) => s.loadFromLibrary);
  const removeFromLibrary = useStore((s) => s.removeFromLibrary);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      void addToLibrary([...list].filter((f) => f.type.startsWith('audio/') || /\.(mp3|wav|flac|ogg|m4a)$/i.test(f.name)));
    },
    [addToLibrary],
  );

  return (
    <section
      className="library"
      onDrop={(e) => {
        e.preventDefault();
        onFiles(e.dataTransfer.files);
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <header className="lib-head">
        <span className="lib-title">LIBRARY</span>
        <button className="upload-btn" onClick={() => inputRef.current?.click()}>
          ⬆ ADD TRACKS
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button onClick={() => { void loadDemoTrack(0, '/demo-tracks/neon-drive-120.wav', 'Neon Drive (120)'); void loadDemoTrack(1, '/demo-tracks/pulse-grid-128.wav', 'Pulse Grid (128)'); }}>
          LOAD DEMOS A+B
        </button>
        {analyzing > 0 && <span className="analyzing">analyzing {analyzing}…</span>}
        <span className="lib-hint">drag &amp; drop audio files anywhere here · mp3 / wav / flac / ogg</span>
      </header>

      {library.length === 0 ? (
        <div className="lib-empty">no tracks yet — add files or load the demos</div>
      ) : (
        <div className="lib-rows">
          {library.map((t) => (
            <div key={t.id} className="lib-row">
              <button className="to-deck a" onClick={() => loadFromLibrary(t.id, 0)}>
                ◀ A
              </button>
              <span className="lib-name">{t.name}</span>
              <span className="lib-bpm">{t.bpm ? `${t.bpm} BPM` : '—'}</span>
              <span className="lib-dur">{fmt(t.duration)}</span>
              <button className="lib-del" onClick={() => removeFromLibrary(t.id)} title="remove">
                ✕
              </button>
              <button className="to-deck b" onClick={() => loadFromLibrary(t.id, 1)}>
                B ▶
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
