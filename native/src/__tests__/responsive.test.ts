import { layoutFor, COMPACT_MAX, TWO_COL_MIN } from '../responsive';

describe('layoutFor — classification', () => {
  it('iPhone portrait → compact single column', () => {
    const l = layoutFor({ width: 390, height: 844 });
    expect(l.compact).toBe(true);
    expect(l.roomy).toBe(false);
    expect(l.twoCol).toBe(false);
    expect(l.isLandscape).toBe(false);
    expect(l.maxWidth).toBe(420);
  });

  it('iPad portrait (834×1194) → roomy single column, no twoCol', () => {
    const l = layoutFor({ width: 834, height: 1194 });
    expect(l.roomy).toBe(true);
    expect(l.compact).toBe(false);
    expect(l.twoCol).toBe(false);
    expect(l.maxWidth).toBe(640);
  });

  it('iPad landscape (1194×834) → twoCol', () => {
    const l = layoutFor({ width: 1194, height: 834 });
    expect(l.twoCol).toBe(true);
    expect(l.isLandscape).toBe(true);
    expect(l.roomy).toBe(true);
  });

  it('narrow iPad split-view pane (400 wide) → compact fallback', () => {
    const l = layoutFor({ width: 400, height: 1000 });
    expect(l.compact).toBe(true);
    expect(l.twoCol).toBe(false);
  });

  it('roomy landscape under twoCol width (850×500) → single column', () => {
    const l = layoutFor({ width: 850, height: 500 });
    expect(l.roomy).toBe(true);
    expect(l.twoCol).toBe(false);
  });

  it('boundaries are exact', () => {
    expect(layoutFor({ width: COMPACT_MAX - 1, height: 1000 }).compact).toBe(true);
    expect(layoutFor({ width: COMPACT_MAX, height: 1000 }).compact).toBe(false);
    expect(layoutFor({ width: TWO_COL_MIN - 1, height: 500 }).twoCol).toBe(false);
    expect(layoutFor({ width: TWO_COL_MIN, height: 500 }).twoCol).toBe(true);
    expect(layoutFor({ width: TWO_COL_MIN, height: 1500 }).twoCol).toBe(false); // portrait
  });
});

describe('scale — contract', () => {
  // NOTE: this proves the scale() CONTRACT (identity on phone, ×1.25 on tablet).
  // It does NOT prove the app's individual style values are unchanged — that
  // guarantee comes from the additive-override discipline (Global Constraints),
  // not from this test. A representative spread of the app's base sizes:
  const BASE_SIZES = [11, 12, 12.5, 13, 14, 15, 16, 17, 18, 19, 20, 22, 30, 32, 34, 40, 42, 44, 48, 52, 56, 76, 80, 132];

  it('is identity in compact (phone contract)', () => {
    const l = layoutFor({ width: 390, height: 844 });
    for (const b of BASE_SIZES) expect(l.scale(b)).toBe(b);
    expect(l.maxWidth).toBe(420);
  });

  it('scales up by 1.25 on tablet, rounded', () => {
    const l = layoutFor({ width: 1194, height: 834 });
    expect(l.scale(16)).toBe(20);
    expect(l.scale(20)).toBe(25);
    expect(l.scale(56)).toBe(70);
    expect(l.scale(15)).toBe(19);   // 15 * 1.25 = 18.75 → 19 (rounds up)
    expect(l.scale(12.5)).toBe(16); // 12.5 * 1.25 = 15.625 → 16 (real ScorePanel value)
  });
});
