# Control Reference — Gestures · Keyboard · MIDI

## Cam mode (AR touch overlay)

`V` cycles Classic → **Cam** → Holo. In Cam mode the UI floats over your mirrored camera feed and
gesture mappings switch off — your **index fingertip is a cursor per hand** (cyan = left/deck A,
magenta = right/deck B) and **pinch = touch**:

| Action | How |
|---|---|
| Click any button / pad | move fingertip over it, pinch once |
| Drag any slider (EQ, volume, pitch, crossfader) | pinch on it, move while pinched, release |
| Seek waveform | pinch on the position |
| Scratch jog | pinch on the disc, rotate while pinched |

Implementation: `src/control/touchCursor.ts` synthesizes real DOM events, so every control works
without special cases. Tuning (pinch thresholds, smoothing) shared with gesture mode in
`src/control/hands/config.ts`.

## Hand gestures (webcam)

Handedness decides the deck: **left hand → Deck A, right hand → Deck B** (mirrored view handled internally). Either hand can work the crossfader.

| Gesture | How | Controls | Notes |
|---|---|---|---|
| **Pinch + drag ↕** | thumb + index tips together, move up/down | Deck volume | grab-style: value follows relative motion while pinched |
| **Pinch + drag ↔** | pinch, move left/right | Deck tempo (±8%) | release = value stays |
| **Fist (hold ~250 ms)** | curl all fingers | Play/pause that deck | hold prevents accidental triggers |
| **Two-finger point ↔** | index + middle extended, others curled; x-position | Crossfader | absolute: screen x → 0..1 |
| **Open palm ↕** | all five fingers extended; wrist height | FX wet amount | top of frame = full wet |
| **Victory → fist** | two fingers then quick fist | Beat sync that deck | matches its BPM/phase to the other deck |

**Tuning:** every threshold lives in `src/control/hands/config.ts` — pinch enter/exit distance, fist curl ratio, hold duration, one-euro smoothing (`minCutoff`, `beta`). If gestures flicker → raise hysteresis gap or lower `beta`. If laggy → raise `minCutoff`.

**Camera tips:** face a light source, keep hands inside frame, ~0.5–1.5 m from camera. Status dot in the top bar: green = tracking, amber = camera on but no hands, red = no camera.

## Keyboard

| Key | Action | Key | Action |
|---|---|---|---|
| `Q` | Deck A play/pause | `P` | Deck B play/pause |
| `W` | Deck A cue | `O` | Deck B cue |
| `E` | Deck A sync | `I` | Deck B sync |
| `1–4` | Deck A hot cues | `7–0` | Deck B hot cues |
| `R` / `T` | Deck A loop 4 / off | `Y` / `U` | Deck B loop 4 / off |
| `Z` / `X` | crossfader nudge left/right | `Space` | record start/stop (→ MIXES shelf) |
| `M` | automix: sync + 8-bar auto-crossfade | | |
| `A` / `S` / `D` | deck A: echo out / brake / backspin | `J` / `K` / `L` | deck B: echo out / brake / backspin |
| `H` | toggle hand-tracking | `V` | toggle Classic ⇄ Holo |
| `?` | in-app control cheat sheet | `Esc` | close overlay |

## Mouse

Everything is mouse-operable: drag jog wheels to scratch/scrub (pauses while held, resumes on release), click waveforms to seek, sliders for EQ/volume/pitch/FX/crossfader, pads for cues/loops, library buttons to load decks.

## MIDI (Chrome/Edge)

Generic mapping, no vendor profiles (plug-and-play with most 2-channel controllers; remap in `src/control/midi.ts`):

| MIDI | Control |
|---|---|
| Note 0x0B / 0x0C (ch 1/2) | play/pause A / B |
| CC 0x07 ch 1/2 | volume A / B |
| CC 0x0D ch 1/2 | tempo A / B |
| CC 0x0E–0x10 ch 1/2 | EQ low/mid/high A / B |
| CC 0x08 ch 1 | crossfader |
