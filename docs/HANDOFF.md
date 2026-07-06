# Handoff

State of the project for anyone (human or agent) picking it up.

## Status (2026-07-06)

Built in one session, phases per `docs/superpowers/plans/2026-07-06-dj-holo.md`:

- ✅ Engine: dual decks, EQ, equal-power crossfader, FX send, loops, hot cues, BPM detect + sync, recorder — unit-tested against mock AudioContext
- ✅ Controls: ControlEvent bus, keyboard, Web MIDI, MediaPipe hand gestures (recognizer unit-tested on landmark fixtures)
- ✅ Classic UI + Holo UI (toggle with `V`)
- ✅ Demo track generator (`npm run gen:demos`)

## Verify it works

```bash
npm install && npm run gen:demos
npm test          # engine + gesture tests must be green
npm run build     # typecheck + bundle must be clean
npm run dev       # manual smoke below
```

Manual smoke (needs human — audio + camera aren't automated):
1. Load demo on both decks → play → hear audio, waveform playhead moves.
2. Crossfade full left/right → only one deck audible; middle → both.
3. EQ low to 0 on playing deck → bass gone.
4. Sync on deck B → BPMs match, beats align.
5. `H` → allow camera → green status → fist = play/pause, pinch-drag = volume.
6. `V` → holo scene renders, discs spin, particles react, hand spheres follow.
7. `Space` start/stop → `.webm` downloads and plays back.

## Known limitations / sharp edges

- **BPM detector** tuned for 4/4 electronic music (70–180). Breakbeats/rubato will misdetect — sync still works if both detections are consistently wrong by the same octave.
- **MediaPipe assets load from CDN** (jsDelivr) on first hand-tracking enable. Offline = no hands. To self-host: download the `.task` model + wasm dir, point `tracker.ts` at local paths.
- **Web MIDI**: Chrome/Edge only. Adapter no-ops elsewhere.
- **Recording** is `audio/webm;codecs=opus` — convert with ffmpeg if you need MP3/WAV.
- **Seek during loop** exits the loop (new BufferSource, loop not re-armed) — re-arm manually. Known, low priority.
- Desktop-first; mobile layout untested.

## Extension points (designed-for)

| Want | Do |
|---|---|
| New input device (Leap, depth cam, OSC) | new adapter in `src/control/` emitting ControlEvents. Touch nothing else. |
| New gesture | add recognizer fn in `hands/gestures.ts` + mapping in `hands/tracker.ts`; thresholds → `hands/config.ts`; add fixture test |
| New FX | extend chain in `src/engine/fx.ts`, expose param via ControlEvent `param` union + store + a knob |
| Vendor MIDI profile | mapping table in `src/control/midi.ts` |
| 4 decks | `Engine` holds `Deck[]` — mostly UI work + crossfader→matrix mixer |
| True holographic hardware | input side: depth-camera adapter; output side: the holo scene already renders to any display — a "pepper's ghost" pyramid or holo fan just mirrors the canvas |

## Gotchas for agents

- Engine files must stay React-free — tests construct them with the mock context.
- Every seek/play makes a NEW BufferSource (Web Audio sources are one-shot). Playhead math lives in `Deck` (`startedAt`/`offset`); don't try to pause a source.
- UI never calls engine directly — always `dispatchControl` (keeps all input paths identical).
- Windows machine, PowerShell 5.1 — see repo owner's `C:\Dev\infra\setup\SYSTEM.md` for env quirks (uv python stub blocking etc. — not relevant to this Node-only repo).
- No CLAUDE co-author trailers in commits (owner rule).
