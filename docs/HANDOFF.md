# Handoff

State of the project for anyone (human or agent) picking it up.

## Status (2026-07-06)

Built in one session, phases per `docs/superpowers/plans/2026-07-06-dj-holo.md`:

- ✅ Engine: dual decks, EQ, equal-power crossfader, FX send, loops, hot cues, BPM detect + sync, recorder — unit-tested against mock AudioContext
- ✅ Controls: ControlEvent bus, keyboard, Web MIDI, MediaPipe hand gestures (recognizer unit-tested on landmark fixtures)
- ✅ Classic UI + Holo UI (toggle with `V`)
- ✅ Demo track generator (`npm run gen:demos`)
- ✅ v3.1 (2026-07-07): exit FX (echo out / vinyl brake / backspin — `src/engine/deck.ts`, reversed-buffer cache, keys A/S/D J/K/L, 5 fake-timer tests) + COMPARE panel (`src/engine/compare.ts` + `src/ui/ComparePanel.tsx`): one-pole band splits → 64-bin envelopes → cosine structure/band similarity + tonal-balance L1 + BPM Δ; sources = library tracks AND recorded mixes (webm decoded in-browser). Caveat: absolute scores run high between any two mastered electronic tracks — use it RELATIVELY (reference vs reproduction beats reference vs random). 49 tests total.
- ✅ v3 (same day): **Cam mode** — AR touch overlay ("invisible wall" style). Fullscreen mirrored webcam behind translucent UI; fingertip cursors (index tip, one-euro filtered), pinch = press/drag/release synthesized as real DOM events (`src/control/touchCursor.ts` + `src/ui/CamLayer.tsx`). Buttons click, ranges drag (native value setter + input event for React), jogs receive pointer events, waveforms seek. Gesture mappings auto-disabled in cam mode. Mode cycle `V`: classic→cam→holo. Verified via simulated hand-point injection (`window.__djstore` dev handle): pinch toggled play, pinch-drag set crossfader 0.5→0.9. Layout fix: `.deck-row` `flex: 1 0 auto` (was squeezing, decks overflowed onto library). New skill: `dj-study` (~\.claude\skills\) — tutorial transcripts → technique notes → dj-holo recipes.
- ✅ v2.1 (same day): AUTOMIX (`M` / mixer button — sync + smoothstep 8-bar crossfade via `src/control/automix.ts`), MIXES shelf (IndexedDB, `src/state/mixes.ts` + `src/ui/MixesShelf.tsx` — recordings auto-save, play/download/delete). Music pipeline: `music-fetch` skill (`~\.claude\skills\music-fetch\`) downloads audio via yt-vault's yt-dlp → `C:\Personal\inbox\music\`; finished mixes → `C:\Personal\exports\mixes\`. Verified end-to-end with two NCS tracks (download → BPM analysis → automix → record → shelf).
- ✅ v2 UI (same day): youdj-style layout — stacked full-width waveforms, scratchable vinyl jog wheels (pointer-drag = scrub, pauses while held), vertical pitch faders, bottom library (multi-upload, BPM analysis, load-to-deck), `?` hotkey help overlay, Unbounded/Chakra Petch typography. Recording verified end-to-end (downloaded webm during browser smoke).

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
| Echo-out / vinyl-brake / backspin exits | wanted by `docs/RECIPES.md` — echo-out = freeze delay feedback + cut dry; brake = playbackRate ramp→0; backspin = reversed-buffer burst |
| Vendor MIDI profile | mapping table in `src/control/midi.ts` |
| 4 decks | `Engine` holds `Deck[]` — mostly UI work + crossfader→matrix mixer |
| True holographic hardware | input side: depth-camera adapter; output side: the holo scene already renders to any display — a "pepper's ghost" pyramid or holo fan just mirrors the canvas |

## Gotchas for agents

- Engine files must stay React-free — tests construct them with the mock context.
- Every seek/play makes a NEW BufferSource (Web Audio sources are one-shot). Playhead math lives in `Deck` (`startedAt`/`offset`); don't try to pause a source.
- UI never calls engine directly — always `dispatchControl` (keeps all input paths identical).
- Windows machine, PowerShell 5.1 — see repo owner's `C:\Dev\infra\setup\SYSTEM.md` for env quirks (uv python stub blocking etc. — not relevant to this Node-only repo).
- No CLAUDE co-author trailers in commits (owner rule).
