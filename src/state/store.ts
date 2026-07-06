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

export interface HandPoint {
  x: number;
  y: number;
  deck: DeckId;
  pose: string;
}

interface AppState {
  decks: [DeckUI, DeckUI];
  crossfade: number;
  master: number;
  uiMode: 'classic' | 'holo';
  handsStatus: HandsStatus;
  handPoints: HandPoint[]; // smoothed cursor per tracked hand (for overlays/holo)
  recording: boolean;
  toast: string | null;

  dispatch: (e: ControlEvent) => void;
  trackLoaded: (deck: DeckId, info: TrackInfo) => void;
  setUiMode: (m: 'classic' | 'holo') => void;
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
        }
        decks[e.deck] = { ...decks[e.deck], playing: d.playing };
        set({ decks });
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
