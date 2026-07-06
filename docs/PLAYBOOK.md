# Playbook — how to actually perform on dj-holo

Not a control list (that's `GESTURES.md`) — this is the flow.

## Your first real mix (5 minutes, mouse only)

1. `npm run dev` → :5199. LIBRARY → ADD TRACKS → pick 2 from `C:\Personal\inbox\music`.
2. `◀ A` one track, `B ▶` the other. Press `Q` — deck A plays.
3. When deck A is ~1 minute in: press `I` (sync B), then `P` (play B). B is silent-ish? Good — now:
4. Drag B's LOW to near-zero *before* raising B's volume. Classic bass-swap setup.
5. Drag crossfader slowly toward center. Both play, no bass clash.
6. At a phrase change (count 32 beats): swap — B LOW up, A LOW down, same moment.
7. Crossfader full right. Press `A` (echo out deck A) for the pro exit. Done — that's a real transition.
8. `Space` before step 2 next time = the whole thing gets recorded to the MIXES shelf.

## Fred Again mode (PADS strip under the waveforms)

Fred's whole trick: don't just play tracks — grab moments and rebuild them live.

- **While a deck plays, tap an empty pad** → grabs 2 beats at the playhead (left 4 pads = deck A, right 4 = deck B).
- **Tap a filled pad** → fires that slice through the master, on top of whatever's playing.
- Right-click clears.

The move: sample a vocal moment + a drum hit from your tracks early in the set, then during a breakdown, fire them rhythmically like drum pads — you're now performing, not just mixing. Stack it with a loop (`R`) on the playing deck for a base.

## Cam mode flow (AR touch)

1. CAM tab (or `V`). Allow camera. Stand back ~arm's length, light on your face/hands.
2. Move your hand — ring cursor follows your **index fingertip**. Hover any control → white outline = aimed.
3. **Pinch (thumb+index together) = click.** Pinch-and-hold on a slider = drag it. Pinch on a jog = scratch.
4. If pinch feels wrong: `src/control/hands/config.ts` → `pinchEnterRatio` (higher = easier to trigger), `oneEuro.minCutoff` (higher = snappier, noisier).
5. Both hands work at once — left hand rides deck A's fader while right crossfades.

## Practicing reproduction (the COMPARE loop)

1. Pick a reference (a downloaded remix / mix you admire) into the library.
2. Record your attempt (Space … Space).
3. LIBRARY → COMPARE: reference vs your mix. Watch **structure** (are your energy peaks in the same places?) and **tonal balance**. Scores are relative — track your improvement, don't chase 100%.

## Study loop

`dj-study` skill (any Claude session): paste a tutorial/remix URL → technique note lands in
`Aethion\knowledge\music\` + recipes here in `RECIPES.md`. `music-fetch` skill pulls practice audio.
