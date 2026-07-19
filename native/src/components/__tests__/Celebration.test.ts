import { isBigWin } from '../Celebration';

describe('isBigWin', () => {
  it('is false under the default 3000 threshold', () => {
    expect(isBigWin(2999)).toBe(false);
  });
  it('is true at or above the default threshold', () => {
    expect(isBigWin(3000)).toBe(true);
    expect(isBigWin(5000)).toBe(true);
  });
  it('honors a custom threshold', () => {
    expect(isBigWin(500, 500)).toBe(true);
    expect(isBigWin(499, 500)).toBe(false);
  });
});
