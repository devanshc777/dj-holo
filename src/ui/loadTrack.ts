import { engine, useStore } from '../state/store';
import { DeckId } from '../control/events';

export async function loadTrackFile(deck: DeckId, file: File) {
  const { trackLoaded, showToast } = useStore.getState();
  try {
    engine.resume();
    const info = await engine.loadFile(deck, file.name.replace(/\.[^.]+$/, ''), await file.arrayBuffer());
    trackLoaded(deck, info);
    showToast(info.bpm ? `${info.name} — ${info.bpm} BPM` : `${info.name} — BPM unknown`);
  } catch {
    showToast(`Couldn't decode ${file.name}`);
  }
}

export async function loadDemoTrack(deck: DeckId, url: string, name: string) {
  const { trackLoaded, showToast } = useStore.getState();
  try {
    engine.resume();
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const info = await engine.loadFile(deck, name, await res.arrayBuffer());
    trackLoaded(deck, info);
    showToast(info.bpm ? `${info.name} — ${info.bpm} BPM` : info.name);
  } catch {
    showToast('Demo track missing — run: npm run gen:demos');
  }
}
