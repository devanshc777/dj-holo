import { detectPose, GestureRecognizer, LM, Pt } from '../../src/control/hands/gestures';

/** Build a synthetic 21-landmark hand. Wrist at bottom, fingers point up. */
function hand(opts: { curl?: ('index' | 'middle' | 'ring' | 'pinky')[]; pinch?: boolean }): Pt[] {
  const lm: Pt[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  const wrist = { x: 0.5, y: 0.85 };
  lm[LM.WRIST] = wrist;

  const fingers = [
    { name: 'index' as const, mcp: LM.INDEX_MCP, tip: LM.INDEX_TIP, x: 0.44 },
    { name: 'middle' as const, mcp: LM.MIDDLE_MCP, tip: LM.MIDDLE_TIP, x: 0.48 },
    { name: 'ring' as const, mcp: LM.RING_MCP, tip: LM.RING_TIP, x: 0.52 },
    { name: 'pinky' as const, mcp: LM.PINKY_MCP, tip: LM.PINKY_TIP, x: 0.56 },
  ];
  for (const f of fingers) {
    lm[f.mcp] = { x: f.x, y: 0.6 }; // knuckle: 0.25 above wrist
    const curled = opts.curl?.includes(f.name);
    lm[f.tip] = curled ? { x: f.x, y: 0.72 } : { x: f.x, y: 0.25 }; // curled tip near palm, extended far
  }
  // thumb: pinched → at index tip; otherwise off to the side
  lm[LM.THUMB_TIP] = opts.pinch ? { x: lm[LM.INDEX_TIP].x + 0.01, y: lm[LM.INDEX_TIP].y } : { x: 0.3, y: 0.65 };
  return lm;
}

describe('detectPose', () => {
  it('open hand → palm', () => expect(detectPose(hand({}), false)).toBe('palm'));
  it('all curled → fist', () =>
    expect(detectPose(hand({ curl: ['index', 'middle', 'ring', 'pinky'] }), false)).toBe('fist'));
  it('index+middle up, others curled → point', () =>
    expect(detectPose(hand({ curl: ['ring', 'pinky'] }), false)).toBe('point'));
  it('thumb on index tip → pinch (beats other poses)', () =>
    expect(detectPose(hand({ pinch: true, curl: ['ring', 'pinky'] }), false)).toBe('pinch'));
  it('too few landmarks → none', () => expect(detectPose([{ x: 0, y: 0 }], false)).toBe('none'));
});

describe('GestureRecognizer', () => {
  const fist = hand({ curl: ['index', 'middle', 'ring', 'pinky'] });
  const palm = hand({});
  const point = hand({ curl: ['ring', 'pinky'] });

  it('fist fires fistHold only after hold duration, once', () => {
    const r = new GestureRecognizer();
    expect(r.update(fist, 0)).toEqual([]); // just entered
    expect(r.update(fist, 100)).toEqual([]); // still under 250ms
    expect(r.update(fist, 300)).toEqual([{ kind: 'fistHold' }]);
    expect(r.update(fist, 400)).toEqual([]); // no repeat while held
  });

  it('palm cancels a pending fist hold', () => {
    const r = new GestureRecognizer();
    r.update(fist, 0);
    r.update(palm, 100);
    expect(r.update(fist, 200)).toEqual([]); // timer restarted at 200
    expect(r.update(fist, 500)).toEqual([{ kind: 'fistHold' }]);
  });

  it('point → quick fist fires syncCombo instead of fistHold', () => {
    const r = new GestureRecognizer();
    r.update(point, 0);
    const ev = r.update(fist, 200);
    expect(ev).toEqual([{ kind: 'syncCombo' }]);
    expect(r.update(fist, 600)).toEqual([]); // combo consumed the fist
  });

  it('cooldown blocks rapid re-triggers', () => {
    const r = new GestureRecognizer();
    r.update(fist, 0);
    expect(r.update(fist, 300)).toEqual([{ kind: 'fistHold' }]);
    r.update(palm, 350);
    r.update(fist, 400);
    expect(r.update(fist, 700)).toEqual([]); // inside 600ms cooldown from t=300
    r.update(palm, 950);
    r.update(fist, 1000);
    expect(r.update(fist, 1300)).toEqual([{ kind: 'fistHold' }]); // cooldown over
  });
});
