# dj-holo 🎛️✋

Browser DJ rig with three faces over one audio engine:

- **Classic mode** — dual decks, mixer, EQ, FX, loops, hot cues, waveforms. Mouse, touch, keyboard, MIDI.
- **Hand-tracking** — webcam + MediaPipe. Pinch, fist, point: your hands are the controller. No extra hardware.
- **Holo mode** — pseudo-holographic 3D interface (react-three-fiber) with audio-reactive shaders; your tracked hand floats in the scene as a cursor.

100% client-side. No backend, no accounts, no uploads — audio never leaves your machine.

## Quick start

```bash
npm install
npm run gen:demos   # synthesizes royalty-free demo loops into public/demo-tracks/
npm run dev         # http://localhost:5199
```

Load a demo track on each deck (or drag-drop your own MP3/WAV/FLAC), hit play, enable the camera, raise your fist. You're DJing.

## Features

| Area | What you get |
|---|---|
| Decks ×2 | spinning vinyl jog wheels (drag to scratch/scrub), play/pause, cue, seek, pitch ±8%, beat loops (1/2/4/8), 4 hot cues |
| Library | multi-file upload / drag-drop, auto BPM analysis, one-click load to deck A/B |
| Mixer | 3-band EQ per deck (full kill → +6 dB), channel volume, equal-power crossfader, master |
| FX | per-deck send: filter → tempo-synced delay w/ feedback |
| Analysis | auto BPM detection, one-tap beat sync, peak waveforms with playhead |
| Recording | record master bus → downloadable `.webm` |
| Inputs | mouse/touch, keyboard, Web MIDI (Chrome/Edge), MediaPipe hand gestures |

## Controls

Full gesture + keyboard + MIDI map: [`docs/GESTURES.md`](docs/GESTURES.md) — or press `?` in the app.
Cheat sheet: left hand = Deck A, right hand = Deck B. **Pinch+drag ↕** volume · **pinch+drag ↔** tempo · **fist (hold)** play/pause · **two-finger point ↔** crossfader · **open palm height** FX.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | dev server on :5199 |
| `npm test` | vitest — engine + gesture unit tests (headless, mocked AudioContext) |
| `npm run build` | typecheck + production bundle |
| `npm run gen:demos` | regenerate synthesized demo tracks |

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, audio graph, module boundaries
- [`docs/GESTURES.md`](docs/GESTURES.md) — every gesture/key/MIDI mapping + tuning
- [`docs/HANDOFF.md`](docs/HANDOFF.md) — state of the project, how to extend, known limitations
- [`docs/superpowers/specs/`](docs/superpowers/specs/) — approved design spec
- [`docs/superpowers/plans/`](docs/superpowers/plans/) — implementation plan

## Requirements

- Chrome/Edge recommended (Web MIDI + best MediaPipe perf). Firefox/Safari: everything except MIDI.
- Webcam optional — app is fully usable without it.
- Decent lighting helps hand-tracking a lot.

## Stack

Vite · React 18 · TypeScript (strict) · Web Audio API · zustand · three / @react-three/fiber / drei · @mediapipe/tasks-vision · vitest

## License

MIT. Demo tracks are program-synthesized (see `scripts/generate-demo-tracks.mjs`) — no third-party audio.
