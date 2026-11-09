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

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('decimal rounding', () => {
  it('has no phantom 0.00 transfer when float drift appears', () => {
    const players = ['A', 'B', 'C', 'D'];
    const rounds = [
      R('D', 'B', 0.1), R('D', 'B', 0.2), R('B', 'D', 0.3),
      R('A', 'B', 3), R('C', 'B', 8.9),
    ];
    const raw = rounds.reduce((acc, r) => {
      acc[r.loser] -= r.points; acc[r.winner] += r.points; return acc;
    }, { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>);
    expect(raw.D).not.toBe(0); // drift exists in the raw sum
    const scores = getNetScores(players, rounds);
    expect(scores).toEqual({ A: -3, B: 11.9, C: -8.9, D: 0 });
    expect(Object.is(scores.D, 0)).toBe(true);
    const transfers = calculateSettlement(scores);
    expect(transfers).toEqual([
      { from: 'C', to: 'B', amount: 8.9 },
      { from: 'A', to: 'B', amount: 3 },
    ]);
    expect(getTitle(scores.D, false, false).text).toBe('打酱油');
  });

  it('holds up across 5000 seeded random games', () => {
    const rand = mulberry32(12345);
    const players = ['A', 'B', 'C', 'D'];
    for (let g = 0; g < 5000; g++) {
      const n = 2 + Math.floor(rand() * 9);
      const rounds: Round[] = [];
      for (let i = 0; i < n; i++) {
        const l = Math.floor(rand() * 4);
        const w = (l + 1 + Math.floor(rand() * 3)) % 4;
        rounds.push(R(players[l], players[w], Math.floor(rand() * 501) / 10));
      }
      const scores = getNetScores(players, rounds);
      for (const p of players) {
        expect(scores[p]).toBe(Math.round(scores[p] * 10) / 10);
        expect(Object.is(scores[p], -0)).toBe(false);
      }
      const transfers = calculateSettlement(scores);
      const paid: Record<string, number> = {};
      for (const t of transfers) {
        expect(t.amount).toBeGreaterThanOrEqual(0.05);
        paid[t.from] = (paid[t.from] ?? 0) + t.amount;
      }
      for (const p of players) {
        if (scores[p] < 0) expect(Math.abs((paid[p] ?? 0) + scores[p])).toBeLessThan(1e-9);
        else expect(paid[p] ?? 0).toBe(0);
      }
    }
    expect(getTitle(0, false, false).text).toBe('打酱油');
  });
});
