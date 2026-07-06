import { dispatchControl } from '../state/store';
import { DeckId } from './events';

/**
 * Generic Web MIDI adapter (Chrome/Edge). Notes toggle transport,
 * CCs drive continuous params. Channel 1 → Deck A, channel 2 → Deck B.
 * Remap the tables below for a specific controller.
 */
const NOTE_MAP: Record<number, { deck: DeckId; action: 'toggle' | 'cue' | 'sync' }> = {
  0x0b: { deck: 0, action: 'toggle' },
  0x0c: { deck: 1, action: 'toggle' },
  0x33: { deck: 0, action: 'cue' },
  0x34: { deck: 1, action: 'cue' },
  0x58: { deck: 0, action: 'sync' },
  0x59: { deck: 1, action: 'sync' },
};

const CC_PARAM: Record<number, 'volume' | 'tempo' | 'eqLow' | 'eqMid' | 'eqHigh' | 'fxWet' | 'filter'> = {
  0x07: 'volume',
  0x0d: 'tempo',
  0x0e: 'eqLow',
  0x0f: 'eqMid',
  0x10: 'eqHigh',
  0x11: 'fxWet',
  0x12: 'filter',
};

const CC_CROSSFADE = 0x08;

export async function bindMidi(): Promise<boolean> {
  if (!('requestMIDIAccess' in navigator)) return false;
  try {
    const access = await navigator.requestMIDIAccess();
    const attach = (input: MIDIInput) => {
      input.onmidimessage = (msg) => {
        const data = msg.data;
        if (!data || data.length < 3) return;
        const [status, d1, d2] = data;
        const kind = status & 0xf0;
        const channel = status & 0x0f; // 0-based: 0 → Deck A, 1 → Deck B
        const deck = (channel === 0 ? 0 : 1) as DeckId;

        if (kind === 0x90 && d2 > 0) {
          const m = NOTE_MAP[d1];
          if (m) dispatchControl({ type: 'deck', deck: m.deck, action: m.action });
        } else if (kind === 0xb0) {
          const value = d2 / 127;
          if (d1 === CC_CROSSFADE) dispatchControl({ type: 'mixer', param: 'crossfade', value });
          else if (CC_PARAM[d1]) dispatchControl({ type: 'param', deck, param: CC_PARAM[d1], value });
        }
      };
    };
    access.inputs.forEach(attach);
    access.onstatechange = (e) => {
      const port = (e as MIDIConnectionEvent).port;
      if (port && port.type === 'input' && port.state === 'connected') attach(port as MIDIInput);
    };
    return true;
  } catch {
    return false;
  }
}
