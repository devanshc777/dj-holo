# Architecture

One engine, many faces. Every input path converges on the same event bus; every view reads the same store.

```
┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐
│ hands       │ │ keyboard │ │ Web MIDI │ │ pointer   │
│ (MediaPipe) │ │          │ │          │ │ (UI)      │
└──────┬──────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘
       └─────────────┴─────┬──────┴──────────────┘
                           ▼
                  ControlEvent  (src/control/events.ts)
                           ▼
                  zustand store (src/state/store.ts)
                           ▼
                  Engine facade (src/engine/engine.ts)
                           ▼
                  Web Audio graph ──► speakers
                       │
                       ├─ AnalyserNodes ──► waveforms / holo shaders
                       └─ MediaStreamDest ──► MediaRecorder (set recording)
```

## Module boundaries (enforced by convention, checked in review)

| Module | May import | Never imports |
|---|---|---|
| `src/engine/` | nothing app-side (gets `AudioContext` injected) | React, zustand, control, ui |
| `src/control/` | `events.ts`, own config | engine internals, React components |
| `src/state/` | engine facade, events | ui, holo |
| `src/ui/`, `src/holo/` | state, events | engine internals (except read-only analyser accessors via facade) |

Why: engine is testable headless (mock AudioContext in `tests/mocks/audio.ts`); any new input device (Leap Motion, depth camera, OSC) is a new adapter file emitting ControlEvents — zero changes elsewhere.

## Audio graph (per deck)

```
BufferSource (playbackRate = tempo × syncRatio)
 → lowShelf 250Hz → peaking 1kHz → highShelf 4kHz   (3-band EQ)
 → channelGain
 ├→ dryGain ────────────────────────┐
 └→ fxSend → BiquadFilter → Delay ⇄ feedbackGain → wetGain ─┤
                                    ▼
                              crossfadeGain (equal-power)
                                    ▼
              masterGain → Analyser → destination
                        → MediaStreamDestination → MediaRecorder
```

- **EQ mapping:** knob 0..1 → dB: `0 → -26` (kill), `0.5 → 0`, `1 → +6` (piecewise linear).
- **Crossfader:** equal-power — deck A gain `cos(x·π/2)`, deck B gain `sin(x·π/2)`.
- **Loops:** implemented via `BufferSource.loopStart/loopEnd` set from beat grid (`60/bpm × beats`).
- **Seek/cue:** BufferSources are one-shot — every seek/play creates a fresh source at the right offset (standard Web Audio pattern; `Deck` tracks `startedAt`/`offset` to compute the playhead).

## BPM detection (src/engine/analysis.ts)

Decode → mono mixdown → 150 Hz lowpass (biquad run offline over samples) → rectified energy in ~11 ms hops → adaptive-threshold onset peaks → inter-onset-interval histogram → dominant interval → BPM, octave-folded into 70–180. Click-track unit tests pin accuracy to ±2 BPM.

**Sync:** `deckB.syncRatio = bpmA / bpmB`, then phase-nudge playhead to the nearest beat boundary of the other deck's grid.

## Hand-tracking pipeline (src/control/hands/)

```
getUserMedia → <video> → HandLandmarker (VIDEO mode, GPU delegate)
  → per-frame: 21 landmarks × ≤2 hands + handedness
  → OneEuroFilter per tracked coordinate (filter.ts)
  → GestureRecognizer (gestures.ts): pinch / fist / two-finger point / open palm,
    with enter/exit hysteresis + hold timers
  → ControlEvents
```

- Landmark model WASM + `.task` file load from jsDelivr CDN at runtime (documented fallback: app works without camera).
- All thresholds (pinch distance, fist curl, hold ms, smoothing cutoffs) in `hands/config.ts` — tune there, nowhere else.
- Recognizer is pure (landmarks in → gesture state out) → unit tested with fixture frames, no camera needed.

## State (src/state/store.ts)

Single zustand store: per-deck `{loaded, playing, bpm, tempo, volume, eq, fxWet, filter, loopBeats, hotcues, playhead}`, mixer `{crossfade, master}`, `uiMode: 'classic' | 'holo'`, `hands: {enabled, status, landmarks}`. `dispatchControl(event)` is the only mutation path for performance controls — UI widgets call it too, so pointer input exercises the exact same code path as gestures/MIDI.

Playhead + analyser data intentionally bypass React state (rAF reads from engine facade) — 60fps updates would thrash React.

## Holo view (src/holo/)

R3F `<Canvas>` replaces the classic layout (toggle in TopBar). Deck discs spin at `rpm ∝ tempo` when playing; ribbon geometry displaced by waveform peaks; particle field scales with FFT bands from the master analyser; hand landmarks (if tracking) render as glowing spheres in screen-mapped space. Custom `ShaderMaterial` does fresnel rim + scanlines + additive glow = "hologram" look. Same store, same dispatch — the 3D controls are real controls.
