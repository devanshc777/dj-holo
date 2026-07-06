import { beforeEach, afterEach, vi } from 'vitest';
import { Deck } from '../../src/engine/deck';
import { MockAudioContext, MockGain, makeBuffer, asCtx, asBuf } from '../mocks/audio';

function setup() {
  const ctx = new MockAudioContext();
  const out = new MockGain();
  const deck = new Deck(asCtx(ctx), out as unknown as AudioNode);
  deck.load(asBuf(makeBuffer(60)), 120);
  return { ctx, deck };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Deck.brake (vinyl stop)', () => {
  it('ramps playbackRate to 0 then pauses at the coasted position', () => {
    const { ctx, deck } = setup();
    deck.play();
    ctx.currentTime = 10; // playhead 10s
    deck.brake(1.5);
    const src = ctx.sources[ctx.sources.length - 1];
    expect(src.playbackRate.value).toBe(0); // ramp scheduled (mock applies final value)
    ctx.currentTime = 11.5;
    vi.advanceTimersByTime(1600);
    expect(deck.playing).toBe(false);
    // linear ramp 1→0 over 1.5s coasts half the distance: 10 + 0.75
    expect(deck.playhead()).toBeCloseTo(10.75, 1);
  });

  it('no-op when not playing', () => {
    const { deck } = setup();
    deck.brake(1);
    expect(deck.playing).toBe(false);
  });
});

describe('Deck.backspin', () => {
  it('plays a reversed source from the mirrored position, ends paused at cue point', () => {
    const { ctx, deck } = setup();
    deck.play();
    ctx.currentTime = 5;
    deck.setCuePoint(); // cue at 5
    ctx.currentTime = 20; // playhead 20
    deck.backspin(1.2);
    const src = ctx.sources[ctx.sources.length - 1];
    expect(src.started).toBe(true);
    expect(src.startOffset).toBeCloseTo(60 - 20); // reversed buffer position
    expect(src.playbackRate.value).toBeGreaterThan(1); // spun fast
    vi.advanceTimersByTime(1300);
    expect(deck.playing).toBe(false);
    expect(deck.playhead()).toBeCloseTo(5); // back at cue
  });

  it('reversed buffer actually reverses samples', () => {
    const { ctx, deck } = setup();
    const buf = makeBuffer(1, 44100, (i) => i / 44100);
    deck.load(asBuf(buf), 120);
    deck.play();
    deck.backspin(0.5);
    const rev = ctx.sources[ctx.sources.length - 1].buffer!;
    const d = rev.getChannelData(0);
    expect(d[0]).toBeCloseTo((44100 - 1) / 44100, 3);
    expect(d[d.length - 1]).toBeCloseTo(0, 3);
  });
});

describe('Deck.echoOut', () => {
  it('boosts delay feedback + wet, pauses the deck, then relaxes feedback', () => {
    const { deck } = setup();
    deck.play();
    deck.echoOut();
    expect(deck.playing).toBe(false); // dry cut immediately, tail rings
    expect(deck.fxFeedbackValue()).toBeGreaterThan(0.7);
    vi.advanceTimersByTime(4000);
    expect(deck.fxFeedbackValue()).toBeLessThan(0.5); // restored
  });
});
