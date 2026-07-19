import { getTheme } from '../theme';

describe('getTheme', () => {
  it('returns the light palette by default', () => {
    const t = getTheme(false);
    expect(t.dark).toBe(false);
    expect(t.bg).toBe('#F1E8DB');
    expect(t.green).toBe('#2E7D4F');
    expect(t.red).toBe('#C6412F');
  });

  it('returns the dark palette', () => {
    const t = getTheme(true);
    expect(t.dark).toBe(true);
    expect(t.bg).toBe('#17130F');
    expect(t.green).toBe('#63BE8A');
    expect(t.red).toBe('#E67A69');
  });
});
