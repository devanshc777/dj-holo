import { Deck } from '../../src/engine/deck';
import { MockAudioContext, MockGain, makeBuffer, asCtx, asBuf } from '../mocks/audio';

function setup() {
  const ctx = new MockAudioContext();
  const out = new MockGain();
  const deck = new Deck(asCtx(ctx), out as unknown as AudioNode);
  deck.load(asBuf(makeBuffer(60)), 120);
  return { ctx, deck };
}

describe('Deck transport', () => {
  it('play creates a started source with current playbackRate', () => {
    const { ctx, deck } = setup();
    deck.setTempo(1.05);
    deck.play();
    expect(ctx.sources.length).toBe(1);
    expect(ctx.sources[0].started).toBe(true);
    expect(ctx.sources[0].playbackRate.value).toBeCloseTo(1.05);
    expect(deck.playing).toBe(true);
  });

  it('pause stops the source and freezes the playhead', () => {
    const { ctx, deck } = setup();
    deck.play();
    ctx.currentTime = 10;
    deck.pause();
    expect(deck.playing).toBe(false);
    expect(deck.playhead()).toBeCloseTo(10);
    ctx.currentTime = 20;
    expect(deck.playhead()).toBeCloseTo(10); // frozen
  });

  it('playhead advances with time scaled by playbackRate', () => {
    const { ctx, deck } = setup();
    deck.setTempo(1.08);
    deck.play();
    ctx.currentTime = 10;
    expect(deck.playhead()).toBeCloseTo(10.8);
  });

  it('seek while playing restarts source at new offset', () => {
    const { ctx, deck } = setup();
    deck.play();
    deck.seek(30);
    expect(ctx.sources.length).toBe(2);
    expect(ctx.sources[1].startOffset).toBeCloseTo(30);
    expect(deck.playing).toBe(true);
  });

  it('cue jumps to cue point and pauses', () => {
    const { ctx, deck } = setup();
    deck.play();
    ctx.currentTime = 5;
    deck.setCuePoint(); // cue at 5s
    ctx.currentTime = 15;
    deck.cue();
    expect(deck.playing).toBe(false);
    expect(deck.playhead()).toBeCloseTo(5);
  });
});

describe('Deck loops', () => {
  it('4-beat loop at 120 BPM spans 2s of buffer time from loop start', () => {
    const { ctx, deck } = setup();
    deck.play();
    ctx.currentTime = 8;
    deck.setLoop(4);
    const src = ctx.sources[ctx.sources.length - 1];
    expect(src.loop).toBe(true);
    expect(src.loopEnd - src.loopStart).toBeCloseTo(2);
  });

  it('setLoop(null) disables looping', () => {
    const { ctx, deck } = setup();
    deck.play();
    deck.setLoop(4);
    deck.setLoop(null);
    expect(ctx.sources[ctx.sources.length - 1].loop).toBe(false);
  });
});

describe('Deck hot cues', () => {
  it('set stores current playhead; jump seeks there; clear removes', () => {
    const { ctx, deck } = setup();
    deck.play();
    ctx.currentTime = 12;
    deck.setHotCue(0);
    expect(deck.hotCues[0]).toBeCloseTo(12);
    ctx.currentTime = 40;
    deck.jumpHotCue(0);
    expect(deck.playhead()).toBeCloseTo(12);
    deck.clearHotCue(0);
    expect(deck.hotCues[0]).toBeNull();
  });
});
