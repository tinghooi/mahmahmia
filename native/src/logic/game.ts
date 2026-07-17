import { GameType, Round } from '../types';

// Direct ports from index.html — behavior must not drift from the web app.

export function evalExpr(str: string): number {
  const cleaned = str.replace(/[^0-9.+\-]/g, '');
  if (!cleaned || /^[+\-]/.test(cleaned)) return NaN;
  const parts = cleaned.match(/[+\-]?[0-9.]+/g);
  if (!parts) return NaN;
  let total = 0;
  for (const p of parts) {
    const n = parseFloat(p);
    if (isNaN(n)) return NaN;
    total += n;
  }
  return Math.round(total * 10) / 10;
}

export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function getNetScores(players: string[], rounds: Round[]): Record<string, number> {
  const scores: Record<string, number> = {};
  players.forEach(p => (scores[p] = 0));
  rounds.forEach(r => {
    scores[r.loser] -= r.points;
    scores[r.winner] += r.points;
  });
  return scores;
}

export function getTitle(score: number, isTop: boolean, isBottom: boolean): { text: string; emoji: string } {
  if (score === 0) return { text: '打酱油', emoji: '😐' };
  if (isTop && score > 0) return { text: '大老板', emoji: '👑' };
  if (isBottom && score < 0) return { text: '破产王', emoji: '💸' };
  if (score > 0) return { text: '小赚', emoji: '😏' };
  return { text: '惨了', emoji: '😭' };
}

export function sortByScore(players: string[], scores: Record<string, number>): string[] {
  return players.slice().sort((a, b) => scores[b] - scores[a]);
}

export function calculateSettlement(netScores: Record<string, number>): { from: string; to: string; amount: number }[] {
  const sum = Object.values(netScores).reduce((a, b) => a + b, 0);
  if (Math.abs(sum) > 0.01) throw new Error(`Net scores do not sum to zero (sum=${sum})`);
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];
  for (const [name, amount] of Object.entries(netScores)) {
    if (amount < 0) debtors.push({ name, amount: Math.abs(amount) });
    else if (amount > 0) creditors.push({ name, amount });
  }
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const transfers: { from: string; to: string; amount: number }[] = [];
  let d = 0, c = 0;
  while (d < debtors.length && c < creditors.length) {
    const transfer = Math.min(debtors[d].amount, creditors[c].amount);
    transfers.push({ from: debtors[d].name, to: creditors[c].name, amount: transfer });
    debtors[d].amount -= transfer;
    creditors[c].amount -= transfer;
    if (debtors[d].amount === 0) d++;
    if (creditors[c].amount === 0) c++;
  }
  return transfers;
}

export function getRecentAmounts(rounds: Round[]): number[] {
  const seen = new Set<number>();
  const amounts: number[] = [];
  for (let i = rounds.length - 1; i >= 0 && amounts.length < 4; i--) {
    const pts = rounds[i].points;
    if (!seen.has(pts)) {
      seen.add(pts);
      amounts.push(pts);
    }
  }
  return amounts.sort((a, b) => a - b);
}

export function buildShareText(gameType: GameType, players: string[], rounds: Round[], gameStartTime: number, now: number): string {
  const scores = getNetScores(players, rounds);
  const sorted = sortByScore(players, scores);
  const top = sorted[0], bottom = sorted[sorted.length - 1];
  const gameLabel = gameType === 'mahjong' ? 'Mahjong' : 'Rummy';
  const mins = Math.round((now - gameStartTime) / 60000);
  let text = `🀄 MahMahMia - ${gameLabel}\n\n📊 Standings:\n`;
  sorted.forEach((p, i) => {
    const s = scores[p];
    const prefix = s > 0 ? '+' : '';
    const t = getTitle(s, p === top, p === bottom);
    text += `${i + 1}. ${p}: ${prefix}${fmt(s)} (${t.emoji} ${t.text})\n`;
  });
  text += `\n${rounds.length} transactions · ${mins} min`;
  text += `\n\n🎮 mahmahmia.com`;
  return text;
}

const TOAST_MSGS: ((l: string, w: string) => string)[] = [
  (l, w) => `${l} 又送钱给 ${w} 了`,
  (l, w) => `${w} 发财啦！`,
  (l, w) => `${l} 的钱包在哭`,
  (l, w) => `${l} 又输了！`,
  (l, w) => `${l} 慷慨解囊`,
  (l, w) => `${w} 笑到合不拢嘴`,
  (l, w) => `${l} 破财消灾`,
  (l, w) => `${w} 财源滚滚`,
];

export function funToast(loser: string, winner: string, rand: () => number = Math.random): string {
  return TOAST_MSGS[Math.floor(rand() * TOAST_MSGS.length)](loser, winner);
}

export function settlementFlavor(topPlayer: string, bottomPlayer: string, hasTransfers: boolean, rand: () => number = Math.random): string {
  if (!hasTransfers) return '打平了...再来一局！';
  const flavors = [
    `${topPlayer} 今晚请客！`,
    `${bottomPlayer}，快还钱！别装没看到`,
    `${topPlayer} 赢麻了，${bottomPlayer} 输惨了`,
    `${bottomPlayer} 的钱包已阵亡`,
  ];
  return flavors[Math.floor(rand() * flavors.length)];
}
