import { dispatchControl, useStore } from '../state/store';

/** Keyboard map — see docs/GESTURES.md. Returns an unbind fn. */
export function bindKeyboard(actions: {
  toggleHands: () => void;
  toggleUiMode: () => void;
  toggleRecord: () => void;
}): () => void {
  const onKey = (ev: KeyboardEvent) => {
    if (ev.repeat) return;
    const tag = (ev.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const xf = () => useStore.getState().crossfade;
    switch (ev.key.toLowerCase()) {
      case 'q': dispatchControl({ type: 'deck', deck: 0, action: 'toggle' }); break;
      case 'p': dispatchControl({ type: 'deck', deck: 1, action: 'toggle' }); break;
      case 'w': dispatchControl({ type: 'deck', deck: 0, action: 'cue' }); break;
      case 'o': dispatchControl({ type: 'deck', deck: 1, action: 'cue' }); break;
      case 'e': dispatchControl({ type: 'deck', deck: 0, action: 'sync' }); break;
      case 'i': dispatchControl({ type: 'deck', deck: 1, action: 'sync' }); break;
      case '1': case '2': case '3': case '4':
        dispatchControl({ type: 'hotcue', deck: 0, slot: (Number(ev.key) - 1) as 0 | 1 | 2 | 3, action: ev.shiftKey ? 'set' : 'jump' });
        break;
      case '7': case '8': case '9':
        dispatchControl({ type: 'hotcue', deck: 1, slot: (Number(ev.key) - 7) as 0 | 1 | 2, action: ev.shiftKey ? 'set' : 'jump' });
        break;
      case '0':
        dispatchControl({ type: 'hotcue', deck: 1, slot: 3, action: ev.shiftKey ? 'set' : 'jump' });
        break;
      case 'r': dispatchControl({ type: 'loop', deck: 0, beats: 4 }); break;
      case 't': dispatchControl({ type: 'loop', deck: 0, beats: null }); break;
      case 'y': dispatchControl({ type: 'loop', deck: 1, beats: 4 }); break;
      case 'u': dispatchControl({ type: 'loop', deck: 1, beats: null }); break;
      case 'z': dispatchControl({ type: 'mixer', param: 'crossfade', value: Math.max(0, xf() - 0.1) }); break;
      case 'x': dispatchControl({ type: 'mixer', param: 'crossfade', value: Math.min(1, xf() + 0.1) }); break;
      case ' ': ev.preventDefault(); actions.toggleRecord(); break;
      case 'h': actions.toggleHands(); break;
      case 'v': actions.toggleUiMode(); break;
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
