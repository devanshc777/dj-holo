import { Mixer } from '../../src/engine/mixer';
import { MockAudioContext, MockGain, asCtx } from '../mocks/audio';

function setup() {
  const ctx = new MockAudioContext();
  const mixer = new Mixer(asCtx(ctx));
  return { ctx, mixer };
}

describe('Mixer crossfade', () => {
  it('applies equal-power gains to the two deck buses', () => {
    const { mixer } = setup();
    mixer.setCrossfade(0.5);
    expect((mixer.deckBus(0) as unknown as MockGain).gain.value).toBeCloseTo(Math.SQRT1_2, 3);
    expect((mixer.deckBus(1) as unknown as MockGain).gain.value).toBeCloseTo(Math.SQRT1_2, 3);
    mixer.setCrossfade(0);
    expect((mixer.deckBus(0) as unknown as MockGain).gain.value).toBeCloseTo(1, 3);
    expect((mixer.deckBus(1) as unknown as MockGain).gain.value).toBeCloseTo(0, 3);
  });
});

describe('Mixer master', () => {
  it('sets master gain directly', () => {
    const { mixer } = setup();
    mixer.setMaster(0.6);
    expect((mixer.master as unknown as MockGain).gain.value).toBeCloseTo(0.6);
  });

  it('routes master → analyser → destination and master → recorder tap', () => {
    const { ctx, mixer } = setup();
    const masterConns = (mixer.master as unknown as MockGain).connections;
    expect(masterConns).toContain(mixer.analyser);
    expect(masterConns).toContain(mixer.recordDest);
    expect((mixer.analyser as unknown as MockGain).connections).toContain(ctx.destination);
  });
});
