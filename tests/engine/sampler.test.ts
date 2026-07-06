import { Sampler } from '../../src/engine/sampler';
import { MockAudioContext, MockGain, makeBuffer, asCtx, asBuf } from '../mocks/audio';

function setup() {
  const ctx = new MockAudioContext();
  const out = new MockGain();
  const sampler = new Sampler(asCtx(ctx), out as unknown as AudioNode);
  return { ctx, sampler };
}

describe('Sampler', () => {
  it('captures the right slice of samples', () => {
    const { sampler } = setup();
    const buf = makeBuffer(10, 44100, (i) => i); // sample value = index
    expect(sampler.capture(0, asBuf(buf), 2, 0.5)).toBe(true);
    expect(sampler.pad(0).filled).toBe(true);
    expect(sampler.pad(0).seconds).toBeCloseTo(0.5, 2);
  });

  it('trigger plays a started source; empty pad refuses', () => {
    const { ctx, sampler } = setup();
    expect(sampler.trigger(3)).toBe(false);
    sampler.capture(3, asBuf(makeBuffer(4)), 0, 1);
    expect(sampler.trigger(3)).toBe(true);
    expect(ctx.sources[ctx.sources.length - 1].started).toBe(true);
  });

  it('clear empties a pad', () => {
    const { sampler } = setup();
    sampler.capture(1, asBuf(makeBuffer(4)), 0, 1);
    sampler.clear(1);
    expect(sampler.pad(1).filled).toBe(false);
  });

  it('capture past the end of the buffer fails cleanly', () => {
    const { sampler } = setup();
    expect(sampler.capture(0, asBuf(makeBuffer(2)), 5, 1)).toBe(false);
  });
});
