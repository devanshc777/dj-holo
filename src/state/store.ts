import { create } from 'zustand';
import { Engine, TrackInfo } from '../engine/engine';
import { ControlEvent, DeckId } from '../control/events';

export const engine = new Engine();

export interface DeckUI {
  trackName: string | null;
  bpm: number | null;
  duration: number;
  peaks: Float32Array | null;
  playing: boolean;
  tempo: number; // 0..1 (0.5 = neutral)
  volume: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  fxWet: number;
  filter: number;
  loopBeats: number | null;
  hotcues: (number | null)[];
}

export type HandsStatus = 'off' | 'starting' | 'no-hands' | 'tracking' | 'error';

export interface LibraryTrack {
  id: string;
  name: string;
  buffer: AudioBuffer;
  bpm: number | null;
  duration: number;
}

export interface HandPoint {
  x: number; // index fingertip, mirrored + smoothed, 0..1
  y: number;
  deck: DeckId;
  pose: string;
  pinch: boolean;
}

interface AppState {
  decks: [DeckUI, DeckUI];
  crossfade: number;
  master: number;
  uiMode: 'classic' | 'holo' | 'cam';
  handsStatus: HandsStatus;
  handPoints: HandPoint[]; // smoothed cursor per tracked hand (for overlays/holo)
  recording: boolean;
  toast: string | null;
  library: LibraryTrack[];
  analyzing: number; // files currently decoding
  helpOpen: boolean;

  dispatch: (e: ControlEvent) => void;
  addToLibrary: (files: File[]) => Promise<void>;
  loadFromLibrary: (id: string, deck: DeckId) => void;
  removeFromLibrary: (id: string) => void;
  setHelpOpen: (v: boolean) => void;
  trackLoaded: (deck: DeckId, info: TrackInfo) => void;
  setUiMode: (m: 'classic' | 'holo' | 'cam') => void;
  setHandsStatus: (s: HandsStatus) => void;
  setHandPoints: (p: HandPoint[]) => void;
  setRecording: (r: boolean) => void;
  showToast: (msg: string) => void;
}

const freshDeck = (): DeckUI => ({
  trackName: null,
  bpm: null,
  duration: 0,
  peaks: null,
  playing: false,
  tempo: 0.5,
  volume: 1,
  eqLow: 0.5,
  eqMid: 0.5,
  eqHigh: 0.5,
  fxWet: 0,
  filter: 1,
  loopBeats: null,
  hotcues: [null, null, null, null],
});

export const useStore = create<AppState>((set, get) => ({
  decks: [freshDeck(), freshDeck()],
  crossfade: 0.5,
  master: 0.9,
  uiMode: 'classic',
  handsStatus: 'off',
  handPoints: [],
  recording: false,
  toast: null,
  library: [],
  analyzing: 0,
  helpOpen: false,

  addToLibrary: async (files) => {
    const { detectBPM } = await import('../engine/analysis');
    for (const file of files) {
      set((s) => ({ analyzing: s.analyzing + 1 }));
      try {
        engine.resume();
        const buffer = await engine.decode(await file.arrayBuffer());
        const track: LibraryTrack = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name.replace(/\.[^.]+$/, ''),
          buffer,
          bpm: detectBPM(buffer),
          duration: buffer.duration,
        };
        set((s) => ({ library: [...s.library, track] }));
      } catch {
        get().showToast(`Couldn't decode ${file.name}`);
      } finally {
        set((s) => ({ analyzing: s.analyzing - 1 }));
      }
    }
  },

  loadFromLibrary: (id, deck) => {
    const t = get().library.find((x) => x.id === id);
    if (!t) return;
    const info = engine.loadTrack(deck, t.name, t.buffer, t.bpm);
    get().trackLoaded(deck, info);
  },

  removeFromLibrary: (id) => set((s) => ({ library: s.library.filter((t) => t.id !== id) })),
  setHelpOpen: (helpOpen) => set({ helpOpen }),

  dispatch: (e) => {
    engine.resume();
    const decks = [...get().decks] as [DeckUI, DeckUI];

    switch (e.type) {
      case 'deck': {
        const d = engine.deck(e.deck);
        switch (e.action) {
          case 'play':
            d.play();
            break;
          case 'pause':
            d.pause();
            break;
          case 'toggle':
            d.playing ? d.pause() : d.play();
            break;
          case 'cue':
            d.playing ? d.cue() : d.setCuePoint();
            break;
          case 'sync':
            engine.sync(e.deck);
            break;
          case 'seek':
            d.seek((e.value ?? 0) * d.duration());
            break;
          case 'brake':
            d.brake();
            break;
          case 'backspin':
            d.backspin();
            break;
          case 'echoOut':
            d.echoOut();
            break;
        }
        decks[e.deck] = { ...decks[e.deck], playing: d.playing };
        set({ decks });
        // exit FX finish async — resync the playing flag once they land
        if (e.action === 'brake' || e.action === 'backspin') {
          setTimeout(() => {
            const ds = [...get().decks] as [DeckUI, DeckUI];
            ds[e.deck] = { ...ds[e.deck], playing: engine.deck(e.deck).playing };
            set({ decks: ds });
          }, 1700);
        }
        break;
      }
      case 'param': {
        engine.setParam(e.deck, e.param, e.value);
        decks[e.deck] = { ...decks[e.deck], [e.param]: e.value };
        set({ decks });
        break;
      }
      case 'mixer': {
        if (e.param === 'crossfade') {
          engine.setCrossfade(e.value);
          set({ crossfade: e.value });
        } else {
          engine.setMaster(e.value);
          set({ master: e.value });
        }
        break;
      }
      case 'loop': {
        engine.deck(e.deck).setLoop(e.beats);
        decks[e.deck] = { ...decks[e.deck], loopBeats: e.beats };
        set({ decks });
        break;
      }
      case 'hotcue': {
        const d = engine.deck(e.deck);
        if (e.action === 'set') d.setHotCue(e.slot);
        else if (e.action === 'jump') d.jumpHotCue(e.slot);
        else d.clearHotCue(e.slot);
        decks[e.deck] = { ...decks[e.deck], hotcues: [...d.hotCues] };
        set({ decks });
        break;
      }
    }
  },

  trackLoaded: (deck, info) => {
    const decks = [...get().decks] as [DeckUI, DeckUI];
    decks[deck] = {
      ...freshDeck(),
      trackName: info.name,
      bpm: info.bpm,
      duration: info.duration,
      peaks: info.peaks,
    };
    set({ decks });
  },

  setUiMode: (uiMode) => set({ uiMode }),
  setHandsStatus: (handsStatus) => set({ handsStatus }),
  setHandPoints: (handPoints) => set({ handPoints }),
  setRecording: (recording) => set({ recording }),
  showToast: (toast) => {
    set({ toast });
    setTimeout(() => set({ toast: null }), 3000);
  },
}));

/** Single entry point every input adapter uses. */
export const dispatchControl = (e: ControlEvent) => useStore.getState().dispatch(e);

// dev console access for debugging / simulating hand input
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__djstore = useStore;
}
