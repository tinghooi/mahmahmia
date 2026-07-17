import {
  evalExpr, fmt, getNetScores, getTitle, sortByScore,
  calculateSettlement, getRecentAmounts, buildShareText,
  funToast, settlementFlavor,
} from '../game';
import { Round } from '../../types';

const R = (loser: string, winner: string, points: number): Round => ({ loser, winner, points });

describe('evalExpr', () => {
  it('evaluates + and - chains', () => {
    expect(evalExpr('10+5-3')).toBe(12);
    expect(evalExpr('2.5+2.5')).toBe(5);
    expect(evalExpr('7')).toBe(7);
  });
  it('rounds to 1 decimal like the web app', () => {
    expect(evalExpr('0.1+0.2')).toBe(0.3);
  });
  it('rejects invalid input', () => {
    expect(evalExpr('')).toBeNaN();
    expect(evalExpr('abc')).toBeNaN();
    expect(evalExpr('+5')).toBeNaN();
    expect(evalExpr('-5')).toBeNaN();
  });
});

describe('fmt', () => {
  it('integers plain, decimals 2dp', () => {
    expect(fmt(12)).toBe('12');
    expect(fmt(1.5)).toBe('1.50');
  });
});

describe('getNetScores / sortByScore / getTitle', () => {
  const players = ['A', 'B', 'C'];
  const rounds = [R('A', 'B', 10), R('C', 'B', 5), R('B', 'A', 3)];
  it('nets each player', () => {
    expect(getNetScores(players, rounds)).toEqual({ A: -7, B: 12, C: -5 });
  });
  it('sorts descending by score', () => {
    expect(sortByScore(players, getNetScores(players, rounds))).toEqual(['B', 'C', 'A']);
  });
  it('titles match web logic', () => {
    expect(getTitle(0, false, false)).toEqual({ text: '打酱油', emoji: '😐' });
    expect(getTitle(12, true, false)).toEqual({ text: '大老板', emoji: '👑' });
    expect(getTitle(-7, false, true)).toEqual({ text: '破产王', emoji: '💸' });
    expect(getTitle(5, false, false)).toEqual({ text: '小赚', emoji: '😏' });
    expect(getTitle(-2, false, false)).toEqual({ text: '惨了', emoji: '😭' });
  });
});

describe('calculateSettlement', () => {
  it('produces minimal transfers that zero everyone out', () => {
    const transfers = calculateSettlement({ A: -7, B: 12, C: -5 });
    expect(transfers).toEqual([
      { from: 'A', to: 'B', amount: 7 },
      { from: 'C', to: 'B', amount: 5 },
    ]);
  });
  it('returns [] for an all-even game', () => {
    expect(calculateSettlement({ A: 0, B: 0 })).toEqual([]);
  });
  it('throws when scores do not sum to zero', () => {
    expect(() => calculateSettlement({ A: 1, B: 1 })).toThrow();
  });
});

describe('getRecentAmounts', () => {
  it('last 4 unique amounts, ascending', () => {
    const rounds = [R('A','B',5), R('A','B',10), R('A','B',5), R('A','B',20), R('A','B',15), R('A','B',10)];
    expect(getRecentAmounts(rounds)).toEqual([5, 10, 15, 20]);
  });
  it('empty when no rounds', () => {
    expect(getRecentAmounts([])).toEqual([]);
  });
});

describe('buildShareText', () => {
  it('matches the web format exactly', () => {
    const start = 1_000_000;
    const now = start + 5 * 60_000;
    const text = buildShareText('mahjong', ['A', 'B'], [R('A', 'B', 10)], start, now);
    expect(text).toBe(
      '🀄 MahMahMia - Mahjong\n\n📊 Standings:\n' +
      '1. B: +10 (👑 大老板)\n' +
      '2. A: -10 (💸 破产王)\n' +
      '\n1 transactions · 5 min' +
      '\n\n🎮 mahmahmia.com'
    );
  });
});

describe('funToast / settlementFlavor', () => {
  it('picks deterministically with injected rand', () => {
    expect(funToast('A', 'B', () => 0)).toBe('A 又送钱给 B 了');
    expect(funToast('A', 'B', () => 0.99)).toBe('B 财源滚滚');
  });
  it('flavor handles tie and transfers', () => {
    expect(settlementFlavor('A', 'B', false)).toBe('打平了...再来一局！');
    expect(settlementFlavor('A', 'B', true, () => 0)).toBe('A 今晚请客！');
  });
});
