import { Engine } from '../../src/engine/engine';
import { MockAudioContext, makeBuffer, asCtx, asBuf } from '../mocks/audio';

function setup() {
  const ctx = new MockAudioContext();
  const engine = new Engine(asCtx(ctx));
  engine.loadBuffer(0, asBuf(makeBuffer(60)), 120);
  engine.loadBuffer(1, asBuf(makeBuffer(60)), 128);
  return { ctx, engine };
}

describe('Engine param routing (normalized 0..1 in)', () => {
  it('volume param sets deck channel gain', () => {
    const { engine } = setup();
    engine.setParam(0, 'volume', 0.25);
    expect(engine.deck(0).channelGainValue()).toBeCloseTo(0.25);
  });

  it('tempo param maps 0..1 → 0.92..1.08 playback rate', () => {
    const { engine } = setup();
    engine.setParam(1, 'tempo', 1);
    expect(engine.deck(1).effectiveRate()).toBeCloseTo(1.08);
  });

  it('eqLow at 0 kills the low shelf (-26 dB)', () => {
    const { engine } = setup();
    engine.setParam(0, 'eqLow', 0);
    expect(engine.deck(0).eqGainDb('low')).toBeCloseTo(-26);
  });
});

describe('Engine beat sync', () => {
  it('sync(1) matches deck B effective BPM to deck A', () => {
    const { engine } = setup();
    engine.deck(0).play();
    engine.deck(1).play();
    engine.sync(1);
    const bpmA = 120 * engine.deck(0).effectiveRate();
    const bpmB = 128 * engine.deck(1).effectiveRate();
    expect(bpmB).toBeCloseTo(bpmA, 2);
  });

  it('sync is a no-op when either deck has no BPM', () => {
    const ctx = new MockAudioContext();
    const engine = new Engine(asCtx(ctx));
    engine.loadBuffer(0, asBuf(makeBuffer(60)), 120);
    engine.loadBuffer(1, asBuf(makeBuffer(60)), null);
    const before = engine.deck(1).effectiveRate();
    engine.sync(1);
    expect(engine.deck(1).effectiveRate()).toBe(before);
  });
});
