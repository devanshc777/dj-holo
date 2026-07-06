# dj-holo — Design Spec

**Date:** 2026-07-06 · **Status:** Approved · **Owner:** Devansh

## What

A browser-based DJ rig with three faces over one engine:

1. **Classic UI** — flat 2D dual-deck layout (decks, mixer, FX, waveforms) usable with mouse/touch/keyboard.
2. **Hand-tracking control** — webcam + MediaPipe Tasks Vision; gestures drive the same controls.
3. **Holo UI** — react-three-fiber pseudo-holographic 3D skin with audio-reactive shaders; hand position renders as a spatial cursor so it *feels* like touching a hologram.

No backend. Runs entirely client-side.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Scope | Full build, phased (engine → classic UI → hands → holo → MIDI/recording) |
| Music source | Local file drag-drop + bundled royalty-free demo loops (synthesized by script, zero licensing risk) |
| Inputs | Hand-tracking, mouse/touch, keyboard, Web MIDI — all four |
| Engine depth | Core mixing + BPM detect/sync + FX/loops/hot-cues + set recording |
| Stack | Vite + React 18 + TypeScript strict, zustand, R3F/three, @mediapipe/tasks-vision, vitest |
| Location | `C:\Dev\fullstack\dj-holo`, GitHub personal (devanshc777) |
| True holography | Out of scope — needs projector/depth-camera hardware. Pseudo-holo on screen instead. Architecture keeps input adapters swappable so a Leap Motion / depth camera adapter can be added later without touching the engine. |

## Architecture

```
input adapters (hands | midi | keyboard | pointer)
        │  emit ControlEvent (uniform schema)
        ▼
zustand store  ──►  engine facade  ──►  Web Audio graph  ──►  speakers
        │                                    │
        ▼                                    ▼ (analyser taps)
   React classic UI                     holo shaders / waveforms
```

**Hard boundaries:**
- `src/engine/` — pure TS, zero React imports, constructor-injected `AudioContext` (mockable → headless tests).
- `src/control/` — adapters know gestures/keys/MIDI, emit `ControlEvent` only; know nothing about audio.
- `src/state/` — zustand store; the only thing UI reads and the only thing that calls the engine.
- `src/ui/` (classic) and `src/holo/` (3D) — two views over identical state; runtime toggle.

### Web Audio graph (per deck → master)

```
AudioBufferSourceNode (playbackRate = tempo)
  → 3-band EQ (low shelf 250Hz / peaking 1kHz / high shelf 4kHz)
  → channel gain
  → FX send (filter → delay → feedback) [wet gain] ─┐
  → dry ──────────────────────────────────────────┬─┴→ crossfade gain
                                                  ▼
                             master gain → AnalyserNode → destination
                                        → MediaStreamDestination → MediaRecorder
```

Crossfader = equal-power curve (`cos/sin` of `x·π/2`) across the two deck crossfade gains.

### ControlEvent schema

```ts
type ControlEvent =
  | { type: 'deck'; deck: 0 | 1; action: 'play'|'pause'|'cue'|'sync'|'seek'|'loadDemo'; value?: number }
  | { type: 'param'; deck: 0 | 1; param: 'tempo'|'volume'|'eqLow'|'eqMid'|'eqHigh'|'fxWet'|'filter'; value: number }  // value 0..1 normalized
  | { type: 'mixer'; param: 'crossfade'|'master'; value: number }
  | { type: 'loop'; deck: 0 | 1; beats: 1|2|4|8 | null }   // null = loop off
  | { type: 'hotcue'; deck: 0 | 1; slot: 0|1|2|3; action: 'set'|'jump'|'clear' };
```

### Hand gesture map (MediaPipe, 21 landmarks/hand, 2 hands)

Left hand → Deck A, right hand → Deck B. Screen split irrelevant — handedness from MediaPipe.

| Gesture | Detection | Control |
|---|---|---|
| Pinch (thumb–index < threshold) + vertical move | pinch enters "grab" mode; Δy | Volume of that hand's deck |
| Pinch + horizontal move | Δx while pinched | Tempo bend of that deck |
| Open palm height | wrist y, no pinch | FX wet amount |
| Fist (all fingertips near palm) | hold 250 ms | Play/pause toggle |
| Two-finger point (index+middle up) x-position | index tip x mapped 0..1 | Crossfader (either hand) |
| Victory→fist quickly | gesture sequence | Beat sync that deck |

Smoothing: one-euro filter on landmark stream; hysteresis on gesture enter/exit to stop flicker. All thresholds in one config file (`src/control/hands/config.ts`).

### BPM detection

Offline: decode buffer → lowpass 150 Hz → rectify → onset energy peaks → inter-onset histogram → dominant interval → BPM (clamped 70–180, octave-corrected). Runs in main thread on load (few hundred ms for a 5-min track; acceptable; move to worker if it ever janks).

Sync = set target deck `playbackRate *= bpmOther/bpmSelf` and nudge phase to nearest beat-grid offset.

### Waveforms

On load, compute min/max peak pairs per ~512-sample window → `Float32Array` → drawn to `<canvas>`; playhead overlaid per animation frame. Holo mode feeds the same peaks into a ribbon shader.

### Recording

`MediaStreamAudioDestinationNode` tapped off master → `MediaRecorder` (`audio/webm;codecs=opus`) → Blob → download link `set-YYYYMMDD-HHmm.webm`.

## Error handling

- No webcam / permission denied → hand-tracking panel shows status, app fully usable via mouse/keys.
- Undecodable file → toast, deck unchanged.
- No Web MIDI (Safari/Firefox) → MIDI adapter silently disabled, note in UI.
- AudioContext suspended (autoplay policy) → resumed on first user gesture.
- MediaPipe WASM fetched from jsDelivr CDN at runtime; offline → hands unavailable, rest works.

## Testing

- Vitest on `src/engine/` with a minimal mock `AudioContext` (`tests/mocks/audio.ts`): param routing, crossfade math (equal-power values), EQ gain mapping, BPM detector on synthesized click-track buffers, loop boundary math, hot-cue store.
- Gesture recognizer unit-tested on canned landmark frames (pinch/fist/point fixtures).
- UI/holo verified manually via `npm run dev` (webcam + audio not automatable cheaply — documented in HANDOFF).

## Out of scope (YAGNI)

Streaming services, key detection, stems separation, backend, playlists persistence beyond localStorage, true volumetric display, mobile layout polish (desktop-first).
