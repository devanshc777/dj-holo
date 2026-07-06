/** Uniform control vocabulary — every input device speaks this. */
export type DeckId = 0 | 1;

export type ControlEvent =
  | { type: 'deck'; deck: DeckId; action: 'play' | 'pause' | 'toggle' | 'cue' | 'sync' | 'seek' | 'brake' | 'backspin' | 'echoOut'; value?: number }
  | { type: 'param'; deck: DeckId; param: 'tempo' | 'volume' | 'eqLow' | 'eqMid' | 'eqHigh' | 'fxWet' | 'filter'; value: number }
  | { type: 'mixer'; param: 'crossfade' | 'master'; value: number }
  | { type: 'loop'; deck: DeckId; beats: 1 | 2 | 4 | 8 | null }
  | { type: 'hotcue'; deck: DeckId; slot: 0 | 1 | 2 | 3; action: 'set' | 'jump' | 'clear' };
