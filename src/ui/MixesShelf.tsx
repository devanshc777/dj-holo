import { useEffect, useRef, useState } from 'react';
import { MixMeta, listMixes, getMixBlob, deleteMix } from '../state/mixes';
import { useStore } from '../state/store';

const fmtSize = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
const fmtDate = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });

/** Recorded sets stored in IndexedDB — play back, download, delete. */
export function MixesShelf() {
  const [mixes, setMixes] = useState<MixMeta[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recording = useStore((s) => s.recording);

  const refresh = () => void listMixes().then(setMixes);
  useEffect(refresh, [recording]); // reload when a recording finishes

  const stop = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  };

  const play = async (id: string) => {
    if (playingId === id) return stop();
    stop();
    const blob = await getMixBlob(id);
    if (!blob) return;
    const audio = new Audio(URL.createObjectURL(blob));
    audio.onended = stop;
    audioRef.current = audio;
    setPlayingId(id);
    void audio.play();
  };

  const download = async (m: MixMeta) => {
    const blob = await getMixBlob(m.id);
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${m.name}.webm`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (mixes.length === 0) return null;

  return (
    <div className="mixes">
      <span className="lib-title">MIXES</span>
      <div className="mix-rows">
        {mixes.map((m) => (
          <div key={m.id} className="mix-row">
            <button className="mix-play" onClick={() => void play(m.id)}>
              {playingId === m.id ? '❚❚' : '▶'}
            </button>
            <span className="lib-name">{m.name}</span>
            <span className="lib-dur">{fmtSize(m.size)}</span>
            <span className="lib-bpm">{fmtDate(m.date)}</span>
            <button onClick={() => void download(m)}>⬇</button>
            <button
              className="lib-del"
              onClick={() => {
                if (playingId === m.id) stop();
                void deleteMix(m.id).then(refresh);
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
