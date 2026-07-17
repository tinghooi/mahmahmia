# MahMahMia Native App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship MahMahMia (Mahjong/Rummy score tracker, currently a single-file web app at repo root) to the iOS App Store and Google Play as a native Expo app with full feature parity plus keep-awake, haptics, and native share.

**Architecture:** Expo (latest SDK) + React Native + TypeScript in a new `native/` folder. No navigation library — three screens (`setup | scoring | settlement`) switched by one state value in `App.tsx`, which owns all game state and persistence. Pure game logic lives in `src/logic/game.ts` (unit-tested); screens are prop-driven components.

**Tech Stack:** Expo, React Native, TypeScript, jest-expo, `@react-native-async-storage/async-storage`, `expo-keep-awake`, `expo-haptics`, `expo-audio`, `expo-localization`, `expo-crypto`, `expo-constants`. Analytics via plain `fetch` to Supabase REST (no SDK). EAS Build/Submit for stores.

**Spec:** `docs/superpowers/specs/2026-07-18-native-app-stores-design.md` — read it before starting. It is the authority on behavior.

## Global Constraints

- All commands run from `native/` unless a step says otherwise. The web app at repo root must NOT change, except adding `privacy.html` (Task 11) and `.vercelignore` (Task 1).
- Colors (exact): bg `#f5f0e8`, text `#3d2e1e`, muted `#8a7560`, gold `#c4873b`, green `#2d7d46`, red `#c44b3f`, toggle-active `#8b5e3c`, banner bg `#fff8ee`, banner border `#e8d5b8`, loser bg `#fde8e8`, winner bg `#e8f5e9`, footer faint `#c4a882`.
- AsyncStorage keys (exact, match web localStorage): state `mahmahmia-state`, client id `mamamia_cid`.
- Bundle IDs: iOS `com.nexvancetech.mahmahmia`, Android `com.nexvancetech.mahmahmia`. App version starts `1.0.0`.
- iPhone-only: `ios.supportsTablet: false`. `ITSAppUsesNonExemptEncryption: false`.
- Supabase: URL `https://rayamhtdgqgrtsjkkhrs.supabase.co`, table `game_sessions`, anon key is public (already shipped in web `index.html:751`) — copy it from there verbatim when writing `src/analytics.ts`.
- Chinese strings must be copied byte-for-byte from `index.html` (toasts lines 314–323, titles 393–399, flavors 703–711, banner 164, confirm 826).
- Steps tagged **[NEEDS USER]** require the user's accounts/devices — pause and ask, never guess credentials.

---

### Task 1: Scaffold Expo project

**Files:**
- Create: `native/` (via create-expo-app), `native/app.json` (replace generated), repo-root `.vercelignore`
- Modify: `native/package.json` (jest config)

**Interfaces:**
- Produces: a compiling Expo TS project where `npm test` and `npx tsc --noEmit` pass; every later task builds on it.

- [ ] **Step 1: [NEEDS USER] Ask the user to check name availability now** — in App Store Connect (New App → name "MahMahMia") and Play Console (Create app). Build work proceeds regardless; if taken, fallback name "MahMahMia Scorer". Record the answer in the session, don't block.

- [ ] **Step 2: Scaffold** — from repo root:

```bash
npx create-expo-app@latest native --template blank-typescript
cd native
npx expo install expo-keep-awake expo-haptics expo-audio expo-localization expo-crypto expo-constants @react-native-async-storage/async-storage
npx expo install jest-expo jest
npm install -D @types/jest
```

- [ ] **Step 3: Replace `native/app.json` with exactly:**

```json
{
  "expo": {
    "name": "MahMahMia",
    "slug": "mahmahmia",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "ios": {
      "bundleIdentifier": "com.nexvancetech.mahmahmia",
      "supportsTablet": false,
      "infoPlist": { "ITSAppUsesNonExemptEncryption": false }
    },
    "android": {
      "package": "com.nexvancetech.mahmahmia",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#f5f0e8"
      }
    },
    "plugins": [
      ["expo-splash-screen", {
        "image": "./assets/splash-icon.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#f5f0e8"
      }]
    ]
  }
}
```

(The generated `assets/` icons stay as placeholders until Task 10.)

- [ ] **Step 4: Add jest config** — in `native/package.json` add:

```json
"scripts": { "test": "jest" },
"jest": { "preset": "jest-expo" }
```

- [ ] **Step 5: Create repo-root `.vercelignore`** (so Vercel keeps deploying only the web app):

```
native
```

- [ ] **Step 6: Verify** — in `native/`: `npx tsc --noEmit` (expect: no output, exit 0) and `npm test` (expect: "No tests found" exit 1 is fine — confirm jest itself runs, or add `--passWithNoTests`).

- [ ] **Step 7: Commit**

```bash
cd .. && git add native .vercelignore && git commit -m "feat(native): scaffold Expo app for app-store release"
```

---

### Task 2: Types + game logic module (TDD)

**Files:**
- Create: `native/src/types.ts`, `native/src/logic/game.ts`
- Test: `native/src/logic/__tests__/game.test.ts`

**Interfaces:**
- Produces (exact signatures, used by every later task):
  - `types.ts`: `type GameType = 'mahjong' | 'rummy'`; `interface Round { loser: string; winner: string; points: number }`; `interface GameState { gameType: GameType; playerCount: number; players: string[]; rounds: Round[]; gameStartTime: number }`
  - `game.ts`: `evalExpr(str: string): number` · `fmt(n: number): string` · `getNetScores(players: string[], rounds: Round[]): Record<string, number>` · `getTitle(score: number, isTop: boolean, isBottom: boolean): { text: string; emoji: string }` · `sortByScore(players: string[], scores: Record<string, number>): string[]` · `calculateSettlement(netScores: Record<string, number>): { from: string; to: string; amount: number }[]` · `getRecentAmounts(rounds: Round[]): number[]` · `buildShareText(gameType: GameType, players: string[], rounds: Round[], gameStartTime: number, now: number): string` · `funToast(loser: string, winner: string, rand?: () => number): string` · `settlementFlavor(topPlayer: string, bottomPlayer: string, hasTransfers: boolean, rand?: () => number): string`

All logic is a direct port of `index.html` (evalExpr :249, fmt :236, getNetScores :383, getTitle :393, calculateSettlement :668, getRecentAmounts :514, share text :430, toasts :314, flavors :703). Do not "improve" behavior.

- [ ] **Step 1: Write the failing test** `native/src/logic/__tests__/game.test.ts`:

```ts
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
    expect(sortByScore(players, getNetScores(players, rounds))).toEqual(['B', 'A', 'C']);
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
```

- [ ] **Step 2: Run to verify it fails** — `npm test` → expect FAIL: `Cannot find module '../game'`.

- [ ] **Step 3: Implement** `native/src/types.ts`:

```ts
export type GameType = 'mahjong' | 'rummy';

export interface Round {
  loser: string;
  winner: string;
  points: number;
}

export interface GameState {
  gameType: GameType;
  playerCount: number;
  players: string[];
  rounds: Round[];
  gameStartTime: number;
}
```

and `native/src/logic/game.ts`:

```ts
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
```

- [ ] **Step 4: Run tests** — `npm test` → expect PASS, all suites green. Also `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
cd .. && git add native/src && git commit -m "feat(native): port game logic with unit tests"
```

---

### Task 3: Storage module (TDD)

**Files:**
- Create: `native/src/storage.ts`, `native/__mocks__/@react-native-async-storage/async-storage.js`
- Test: `native/src/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `GameState`, `GameType` from Task 2.
- Produces: `saveState(state: GameState): Promise<void>` · `restoreState(): Promise<GameState | null>` (invalid/corrupt → clears and returns null) · `clearState(): Promise<void>` · `getClientId(): Promise<string>` (persistent UUID under key `mamamia_cid`).

- [ ] **Step 1: Create the AsyncStorage jest mock** (auto-applied for node_modules packages) `native/__mocks__/@react-native-async-storage/async-storage.js`:

```js
export { default } from '@react-native-async-storage/async-storage/jest/async-storage-mock';
```

- [ ] **Step 2: Write the failing test** `native/src/__tests__/storage.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveState, restoreState, clearState, getClientId } from '../storage';
import { GameState } from '../types';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid-1234' }));

const state: GameState = {
  gameType: 'rummy',
  playerCount: 4,
  players: ['A', 'B', 'C', 'D'],
  rounds: [{ loser: 'A', winner: 'B', points: 5 }],
  gameStartTime: 1_000_000,
};

beforeEach(() => AsyncStorage.clear());

describe('storage', () => {
  it('round-trips state under the web-compatible key', async () => {
    await saveState(state);
    expect(await AsyncStorage.getItem('mahmahmia-state')).toBeTruthy();
    expect(await restoreState()).toEqual(state);
  });

  it('returns null when nothing saved', async () => {
    expect(await restoreState()).toBeNull();
  });

  it('discards corrupt JSON and clears it', async () => {
    await AsyncStorage.setItem('mahmahmia-state', '{not json');
    expect(await restoreState()).toBeNull();
    expect(await AsyncStorage.getItem('mahmahmia-state')).toBeNull();
  });

  it('discards structurally invalid state', async () => {
    await AsyncStorage.setItem('mahmahmia-state', JSON.stringify({ players: 'nope' }));
    expect(await restoreState()).toBeNull();
  });

  it('clearState removes the key', async () => {
    await saveState(state);
    await clearState();
    expect(await restoreState()).toBeNull();
  });

  it('getClientId creates once then reuses, under web-compatible key', async () => {
    const id1 = await getClientId();
    const id2 = await getClientId();
    expect(id1).toBe('test-uuid-1234');
    expect(id2).toBe(id1);
    expect(await AsyncStorage.getItem('mamamia_cid')).toBe(id1);
  });
});
```

- [ ] **Step 3: Run to verify it fails** — `npm test -- storage` → FAIL: `Cannot find module '../storage'`.

- [ ] **Step 4: Implement** `native/src/storage.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { GameState } from './types';

const STATE_KEY = 'mahmahmia-state';
const CID_KEY = 'mamamia_cid';

export async function saveState(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('saveState failed', e);
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATE_KEY);
  } catch (e) {
    console.error('clearState failed', e);
  }
}

export async function restoreState(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!Array.isArray(s.players) || !Array.isArray(s.rounds)) throw new Error('invalid');
    return {
      gameType: s.gameType === 'rummy' ? 'rummy' : 'mahjong',
      playerCount: typeof s.playerCount === 'number' ? s.playerCount : s.players.length,
      players: s.players,
      rounds: s.rounds,
      gameStartTime: s.gameStartTime || Date.now(),
    };
  } catch {
    await clearState();
    return null;
  }
}

export async function getClientId(): Promise<string> {
  let id = await AsyncStorage.getItem(CID_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await AsyncStorage.setItem(CID_KEY, id);
  }
  return id;
}
```

- [ ] **Step 5: Run tests** — `npm test` → all PASS. `npx tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
cd .. && git add native && git commit -m "feat(native): AsyncStorage persistence with web-compatible keys"
```

---

### Task 4: Analytics module (TDD)

**Files:**
- Create: `native/src/analytics.ts`
- Test: `native/src/__tests__/analytics.test.ts`

**Interfaces:**
- Consumes: `getNetScores` (Task 2), `getClientId` (Task 3), `GameState`.
- Produces: `trackFeature(name: 'quick_amount' | 'log_view' | 'undo'): void` · `resetFeatures(): void` · `logGameEnd(state: GameState): Promise<void>` (fires one POST; all errors swallowed after console.error).

Field mapping is in the spec's table — implement it exactly. `device` is `ios-app`/`android-app` from `Platform.OS`; `referrer` is the literal `'app'`; `utm_source` is `null`.

- [ ] **Step 1: Write the failing test** `native/src/__tests__/analytics.test.ts`:

```ts
import { GameState } from '../types';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid-1234' }));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-MY' }],
  getCalendars: () => [{ timeZone: 'Asia/Kuala_Lumpur' }],
}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));

import { logGameEnd, trackFeature, resetFeatures } from '../analytics';

const state: GameState = {
  gameType: 'mahjong',
  playerCount: 3,
  players: ['A', 'B', 'C'],
  rounds: [{ loser: 'A', winner: 'B', points: 10 }],
  gameStartTime: Date.now() - 60_000,
};

describe('logGameEnd', () => {
  beforeEach(() => {
    resetFeatures();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
  });

  it('POSTs the mapped row to Supabase REST', async () => {
    trackFeature('undo');
    await logGameEnd(state);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://rayamhtdgqgrtsjkkhrs.supabase.co/rest/v1/game_sessions');
    expect(opts.method).toBe('POST');
    expect(opts.headers.apikey).toBeTruthy();
    expect(opts.headers.Authorization).toMatch(/^Bearer /);
    const row = JSON.parse(opts.body);
    expect(row).toMatchObject({
      client_id: 'test-uuid-1234',
      game_type: 'mahjong',
      player_count: 3,
      transaction_count: 1,
      locale: 'en-MY',
      referrer: 'app',
      app_version: '1.0.0',
      tz: 'Asia/Kuala_Lumpur',
      max_score_spread: 20,
      features_used: 'undo',
      utm_source: null,
    });
    expect(row.device).toMatch(/^(ios|android)-app$/);
    expect(typeof row.duration_sec).toBe('number');
    expect(typeof row.screen_width).toBe('number');
    expect(typeof row.hour_local).toBe('number');
  });

  it('features_used is null when nothing tracked', async () => {
    await logGameEnd(state);
    const row = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(row.features_used).toBeNull();
  });

  it('never throws on network failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(logGameEnd(state)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- analytics` → FAIL: `Cannot find module '../analytics'`.

- [ ] **Step 3: Implement** `native/src/analytics.ts` (the anon key below is copied from repo-root `index.html:751` — it is public by design, same as the web app):

```ts
import { Dimensions, Platform } from 'react-native';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import { GameState } from './types';
import { getNetScores } from './logic/game';
import { getClientId } from './storage';

const SUPABASE_URL = 'https://rayamhtdgqgrtsjkkhrs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWFtaHRkZ3FncnRzamtraHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNTkyMDgsImV4cCI6MjA4OTczNTIwOH0.Sq_YAu5Vgj57X4bDZiLwnTPey2jNDitKUKkybN7bA90';

const featuresUsed = new Set<string>();

export function trackFeature(name: 'quick_amount' | 'log_view' | 'undo'): void {
  featuresUsed.add(name);
}

export function resetFeatures(): void {
  featuresUsed.clear();
}

export async function logGameEnd(state: GameState): Promise<void> {
  try {
    const scores = Object.values(getNetScores(state.players, state.rounds));
    const row = {
      client_id: await getClientId(),
      game_type: state.gameType,
      player_count: state.players.length,
      transaction_count: state.rounds.length,
      duration_sec: Math.round((Date.now() - state.gameStartTime) / 1000),
      device: Platform.OS === 'ios' ? 'ios-app' : 'android-app',
      locale: Localization.getLocales()[0]?.languageTag ?? 'unknown',
      screen_width: Math.round(Dimensions.get('window').width),
      referrer: 'app',
      app_version: Constants.expoConfig?.version ?? '1.0.0',
      tz: Localization.getCalendars()[0]?.timeZone ?? 'unknown',
      hour_local: new Date().getHours(),
      max_score_spread: scores.length
        ? Math.round((Math.max(...scores) - Math.min(...scores)) * 100) / 100
        : 0,
      features_used: [...featuresUsed].join(',') || null,
      utm_source: null,
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/game_sessions`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) console.error('analytics insert failed', res.status, await res.text());
  } catch (e) {
    console.error('analytics insert failed', e);
  }
}
```

- [ ] **Step 4: Run tests** — `npm test` → all PASS. `npx tsc --noEmit` → clean. Sanity-check the key against `index.html:751` — a typo here would silently break analytics (errors are swallowed by design).

- [ ] **Step 5: Commit**

```bash
cd .. && git add native/src && git commit -m "feat(native): game-end analytics via Supabase REST"
```

---

### Task 5: Sound assets + sounds module

**Files:**
- Create: `native/scripts/generate-sounds.mjs`, `native/assets/sounds/{coin,settle,delete}.wav`, `native/src/sounds.ts`

**Interfaces:**
- Produces: `initSounds(): Promise<void>` (call once at app start) · `soundCoin(): void` · `soundSettle(): void` · `soundDelete(): void`. All no-throw.

The web tones (index.html:278–311, gain 0.15 with exponential decay to 0.001): coin = square 880Hz/0.1s@0s, 1175/0.1@0.08, 1397/0.15@0.16 · settle = square 523/0.15@0, 659/0.15@0.15, 784/0.15@0.3, 1047/0.3@0.45 · delete = sine 400/0.1@0, 250/0.15@0.08.

- [ ] **Step 1: Write the generator** `native/scripts/generate-sounds.mjs` (pure Node, no deps):

```js
import { writeFileSync, mkdirSync } from 'node:fs';

const RATE = 44100;

function synth(tones) {
  const total = Math.max(...tones.map(t => t.delay + t.dur)) + 0.05;
  const n = Math.ceil(total * RATE);
  const buf = new Float64Array(n);
  for (const { freq, dur, type, delay } of tones) {
    const start = Math.floor(delay * RATE);
    const len = Math.floor(dur * RATE);
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      // Matches WebAudio: gain 0.15 → exponentialRampToValueAtTime(0.001) over dur
      const gain = 0.15 * Math.pow(0.001 / 0.15, i / len);
      const phase = Math.sin(2 * Math.PI * freq * t);
      const wave = type === 'square' ? Math.sign(phase) : phase;
      buf[start + i] += wave * gain;
    }
  }
  return buf;
}

function toWav(samples) {
  const n = samples.length;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);      // PCM
  header.writeUInt16LE(1, 22);      // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const sounds = {
  coin: [
    { freq: 880, dur: 0.1, type: 'square', delay: 0 },
    { freq: 1175, dur: 0.1, type: 'square', delay: 0.08 },
    { freq: 1397, dur: 0.15, type: 'square', delay: 0.16 },
  ],
  settle: [
    { freq: 523, dur: 0.15, type: 'square', delay: 0 },
    { freq: 659, dur: 0.15, type: 'square', delay: 0.15 },
    { freq: 784, dur: 0.15, type: 'square', delay: 0.3 },
    { freq: 1047, dur: 0.3, type: 'square', delay: 0.45 },
  ],
  delete: [
    { freq: 400, dur: 0.1, type: 'sine', delay: 0 },
    { freq: 250, dur: 0.15, type: 'sine', delay: 0.08 },
  ],
};

mkdirSync('assets/sounds', { recursive: true });
for (const [name, tones] of Object.entries(sounds)) {
  writeFileSync(`assets/sounds/${name}.wav`, toWav(synth(tones)));
  console.log(`wrote assets/sounds/${name}.wav`);
}
```

- [ ] **Step 2: Generate and listen** — `node scripts/generate-sounds.mjs` (expect 3 "wrote" lines), then `afplay assets/sounds/coin.wav && afplay assets/sounds/settle.wav && afplay assets/sounds/delete.wav` — verify: coin = quick ascending cha-ching, settle = 4-note rising fanfare, delete = descending boop.

- [ ] **Step 3: Implement** `native/src/sounds.ts`:

```ts
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

let players: { coin: AudioPlayer; settle: AudioPlayer; del: AudioPlayer } | null = null;

export async function initSounds(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    players = {
      coin: createAudioPlayer(require('../assets/sounds/coin.wav')),
      settle: createAudioPlayer(require('../assets/sounds/settle.wav')),
      del: createAudioPlayer(require('../assets/sounds/delete.wav')),
    };
  } catch (e) {
    console.error('sound init failed', e);
  }
}

function play(p: AudioPlayer | undefined): void {
  if (!p) return;
  try {
    p.seekTo(0);
    p.play();
  } catch (e) {
    console.error('sound play failed', e);
  }
}

export const soundCoin = (): void => play(players?.coin);
export const soundSettle = (): void => play(players?.settle);
export const soundDelete = (): void => play(players?.del);
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` → clean. (Audible check happens in the Task 9 simulator pass.)

- [ ] **Step 5: Commit**

```bash
cd .. && git add native && git commit -m "feat(native): generated sound effects matching web tones"
```

---

### Task 6: Theme + shared components (Snackbar, ScorePanel)

**Files:**
- Create: `native/src/theme.ts`, `native/src/components/Snackbar.tsx`, `native/src/components/ScorePanel.tsx`

**Interfaces:**
- Consumes: logic from Task 2.
- Produces:
  - `theme.ts`: `export const colors = {...}` (exact hex values from Global Constraints), `export const panelStyle` (white card: borderRadius 10, padding 12, marginBottom 16, subtle shadow).
  - `Snackbar.tsx`: `export interface SnackbarHandle { show(fun: string, detail: string): void }`, `export const Snackbar = forwardRef<SnackbarHandle>(...)` — green bottom banner, main line + smaller detail line, auto-hides after 2.5s.
  - `ScorePanel.tsx`: `export function ScorePanel({ players, rounds, showTitles, flashKey }: { players: string[]; rounds: Round[]; showTitles: boolean; flashKey?: number })` — sorted rows, +green/−red/0-muted, gold top border, titles+emoji under names when `showTitles && rounds.length > 0`, brief gold border flash when `flashKey` changes.

- [ ] **Step 1: Implement** `native/src/theme.ts`:

```ts
import { ViewStyle } from 'react-native';

export const colors = {
  bg: '#f5f0e8',
  text: '#3d2e1e',
  muted: '#8a7560',
  gold: '#c4873b',
  green: '#2d7d46',
  red: '#c44b3f',
  panel: '#ffffff',
  border: '#dddddd',
  toggleActive: '#8b5e3c',
  banner: '#fff8ee',
  bannerBorder: '#e8d5b8',
  loserBg: '#fde8e8',
  winnerBg: '#e8f5e9',
  faint: '#c4a882',
  divider: '#eeeeee',
  rowDivider: '#f0ebe3',
};

export const panelStyle: ViewStyle = {
  backgroundColor: colors.panel,
  borderRadius: 10,
  padding: 12,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};
```

- [ ] **Step 2: Implement** `native/src/components/Snackbar.tsx`:

```tsx
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export interface SnackbarHandle {
  show(fun: string, detail: string): void;
}

export const Snackbar = forwardRef<SnackbarHandle>((_props, ref) => {
  const [msg, setMsg] = useState<{ fun: string; detail: string } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => ({
    show(fun: string, detail: string) {
      setMsg({ fun, detail });
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
          () => setMsg(null)
        );
      }, 2500);
    },
  }));

  if (!msg) return null;
  return (
    <Animated.View style={[styles.bar, { opacity }]} pointerEvents="none">
      {msg.fun ? <Text style={styles.fun}>{msg.fun}</Text> : null}
      <Text style={styles.detail}>{msg.detail}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 100,
  },
  fun: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  detail: { color: '#fff', fontSize: 12, opacity: 0.8, marginTop: 2, textAlign: 'center' },
});
```

- [ ] **Step 3: Implement** `native/src/components/ScorePanel.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { fmt, getNetScores, getTitle, sortByScore } from '../logic/game';
import { Round } from '../types';
import { colors, panelStyle } from '../theme';

interface Props {
  players: string[];
  rounds: Round[];
  showTitles: boolean;
  flashKey?: number;
}

export function ScorePanel({ players, rounds, showTitles, flashKey }: Props) {
  const flash = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 800, useNativeDriver: false }).start();
  }, [flashKey, flash]);

  const scores = getNetScores(players, rounds);
  const sorted = sortByScore(players, scores);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const borderColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(196,135,59,0)', 'rgba(196,135,59,1)'],
  });

  const scoreColor = (s: number) => (s > 0 ? colors.green : s < 0 ? colors.red : colors.muted);

  return (
    <Animated.View style={[panelStyle, styles.panel, { borderColor }]}>
      {sorted.map((p, i) => {
        const s = scores[p];
        const t = getTitle(s, p === top, p === bottom);
        return (
          <View key={p} style={[styles.row, i < sorted.length - 1 && styles.rowBorder]}>
            <View style={styles.rowTop}>
              <Text style={[styles.name, { color: scoreColor(s) }]}>{p}</Text>
              <Text style={[styles.score, { color: scoreColor(s) }]}>
                {s > 0 ? '+' : ''}{fmt(s)}
              </Text>
            </View>
            {showTitles && rounds.length > 0 && (
              <Text style={[styles.title, { color: scoreColor(s) }]}>
                {t.emoji} {t.text}
              </Text>
            )}
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 3, borderTopColor: colors.gold, borderWidth: 2, borderColor: 'transparent' },
  row: { paddingVertical: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.rowDivider },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '600', fontSize: 16 },
  score: { fontWeight: '700', fontSize: 18 },
  title: { fontSize: 12, marginTop: 2, opacity: 0.65 },
});
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` → clean. `npm test` → still green.

- [ ] **Step 5: Commit**

```bash
cd .. && git add native/src && git commit -m "feat(native): theme, snackbar, score panel components"
```

---

### Task 7: Setup screen

**Files:**
- Create: `native/src/screens/SetupScreen.tsx`

**Interfaces:**
- Consumes: theme, types.
- Produces: `export function SetupScreen(props: SetupScreenProps)` with

```ts
export interface SetupScreenProps {
  initialGameType: GameType;
  resume: { gameType: GameType; players: string[]; roundCount: number } | null;
  hasActiveGame: boolean; // rounds.length > 0
  onStart(names: string[], gameType: GameType, playerCount: number): void;
  onResume(): void;
}
```

Behavior (parity with web): toggle Mahjong (3) / Rummy (4) resets the name fields to the new count with empty values; validation "All names are required." then "Names must be unique."; starting while a game is active first shows the confirm `有游戏还在进行中，确定要开新游戏吗？`; resume banner shows `继续游戏 Resume` + `{Mahjong|Rummy} · names · N transactions` only when `resume` is non-null; return key advances fields, last field submits.

- [ ] **Step 1: Implement** `native/src/screens/SetupScreen.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import {
  Alert, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { GameType } from '../types';
import { colors } from '../theme';

export interface SetupScreenProps {
  initialGameType: GameType;
  resume: { gameType: GameType; players: string[]; roundCount: number } | null;
  hasActiveGame: boolean;
  onStart(names: string[], gameType: GameType, playerCount: number): void;
  onResume(): void;
}

export function SetupScreen({ initialGameType, resume, hasActiveGame, onStart, onResume }: SetupScreenProps) {
  const [gameType, setGameType] = useState<GameType>(initialGameType);
  const playerCount = gameType === 'mahjong' ? 3 : 4;
  const [names, setNames] = useState<string[]>(Array(playerCount).fill(''));
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const switchType = (type: GameType) => {
    setGameType(type);
    setNames(Array(type === 'mahjong' ? 3 : 4).fill(''));
    setError('');
  };

  const setName = (i: number, v: string) => {
    setNames(prev => prev.map((n, j) => (j === i ? v : n)));
  };

  const start = () => {
    const trimmed = names.map(n => n.trim());
    if (trimmed.some(n => n === '')) {
      setError('All names are required.');
      return;
    }
    if (new Set(trimmed).size !== trimmed.length) {
      setError('Names must be unique.');
      return;
    }
    setError('');
    const go = () => onStart(trimmed, gameType, playerCount);
    if (hasActiveGame) {
      Alert.alert('', '有游戏还在进行中，确定要开新游戏吗？', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: go },
      ]);
    } else {
      go();
    }
  };

  return (
    <View>
      <Text style={styles.label}>Game Type</Text>
      <View style={styles.toggleRow}>
        {(['mahjong', 'rummy'] as GameType[]).map(t => (
          <Pressable
            key={t}
            onPress={() => switchType(t)}
            style={[styles.toggle, gameType === t && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, gameType === t && styles.toggleTextActive]}>
              {t === 'mahjong' ? 'Mahjong (3)' : 'Rummy (4)'}
            </Text>
          </Pressable>
        ))}
      </View>

      {names.map((n, i) => (
        <TextInput
          key={`${gameType}-${i}`}
          ref={r => { inputRefs.current[i] = r; }}
          style={styles.input}
          placeholder={`Player ${i + 1} name`}
          placeholderTextColor="#bbb"
          value={n}
          autoFocus={i === 0}
          autoCorrect={false}
          onChangeText={v => setName(i, v)}
          returnKeyType={i === playerCount - 1 ? 'done' : 'next'}
          onSubmitEditing={() => {
            if (i === playerCount - 1) start();
            else inputRefs.current[i + 1]?.focus();
          }}
        />
      ))}

      <Text style={styles.error}>{error}</Text>

      {resume && (
        <Pressable style={styles.resumeBanner} onPress={onResume}>
          <Text style={styles.resumeTitle}>继续游戏 Resume</Text>
          <Text style={styles.resumeDetail}>
            {resume.gameType === 'mahjong' ? 'Mahjong' : 'Rummy'} · {resume.players.join(', ')} · {resume.roundCount} transactions
          </Text>
        </Pressable>
      )}

      <Pressable style={styles.startBtn} onPress={start}>
        <Text style={styles.startBtnText}>Start Game →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12, textTransform: 'uppercase', color: colors.muted,
    letterSpacing: 0.5, marginBottom: 6,
  },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggle: {
    flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, backgroundColor: '#fff', alignItems: 'center',
  },
  toggleActive: { backgroundColor: colors.toggleActive, borderColor: colors.toggleActive },
  toggleText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8,
    minHeight: 48, color: colors.text,
  },
  error: { color: colors.red, fontSize: 14, minHeight: 20, marginTop: 4 },
  resumeBanner: {
    backgroundColor: colors.banner, borderWidth: 1.5, borderColor: colors.bannerBorder,
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  resumeTitle: { fontWeight: '700', color: colors.text },
  resumeDetail: { fontSize: 13, color: colors.muted, marginTop: 4 },
  startBtn: {
    backgroundColor: colors.green, borderRadius: 10, padding: 14,
    minHeight: 48, alignItems: 'center', marginTop: 12,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
cd .. && git add native/src && git commit -m "feat(native): setup screen"
```

---

### Task 8: Scoring screen

**Files:**
- Create: `native/src/screens/ScoringScreen.tsx`

**Interfaces:**
- Consumes: `ScorePanel` (Task 6), logic (Task 2), `trackFeature` (Task 4). Sounds and haptics are NOT called here — they fire inside App's `onAddRound`/`onDeleteRound`/`onEndGame` callbacks (Task 9); this screen only calls `trackFeature`.
- Produces: `export function ScoringScreen(props: ScoringScreenProps)` with

```ts
export interface ScoringScreenProps {
  players: string[];
  gameType: GameType;
  rounds: Round[];
  gameStartTime: number;
  onAddRound(loser: string, winner: string, points: number): void;
  onDeleteRound(index: number): void;
  onBack(): void;
  onEndGame(): void;
}
```

Behavior (parity): `useKeepAwake()`; share button visible only when rounds exist, opens native share sheet with `buildShareText`; loser/winner selection (winner button for the selected loser is disabled at 25% opacity; selecting the loser who is currently winner clears winner); errors "Select who pays and who gets." / "Enter a valid point amount."; points field clears + keyboard dismisses on successful add; quick chips call `trackFeature('quick_amount')` and fill the field; log toggle calls `trackFeature('log_view')`; delete calls `trackFeature('undo')` then `onDeleteRound`; log shows newest first, numbered `#N`, with ✕ delete; End Game asks `End the game and settle up?` then `onEndGame()`.

- [ ] **Step 1: Implement** `native/src/screens/ScoringScreen.tsx`:

```tsx
import React, { useState } from 'react';
import {
  Alert, Keyboard, Pressable, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { ScorePanel } from '../components/ScorePanel';
import { buildShareText, evalExpr, fmt, getRecentAmounts } from '../logic/game';
import { trackFeature } from '../analytics';
import { GameType, Round } from '../types';
import { colors, panelStyle } from '../theme';

export interface ScoringScreenProps {
  players: string[];
  gameType: GameType;
  rounds: Round[];
  gameStartTime: number;
  onAddRound(loser: string, winner: string, points: number): void;
  onDeleteRound(index: number): void;
  onBack(): void;
  onEndGame(): void;
}

export function ScoringScreen({
  players, gameType, rounds, gameStartTime,
  onAddRound, onDeleteRound, onBack, onEndGame,
}: ScoringScreenProps) {
  useKeepAwake();
  const [loser, setLoser] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [points, setPoints] = useState('');
  const [error, setError] = useState('');
  const [logOpen, setLogOpen] = useState(false);

  const selectLoser = (name: string) => {
    setLoser(name);
    if (winner === name) setWinner(null);
  };

  const selectWinner = (name: string) => {
    if (name === loser) return;
    setWinner(name);
  };

  const add = () => {
    if (!loser || !winner) {
      setError('Select who pays and who gets.');
      return;
    }
    const pts = evalExpr(points);
    if (!pts || pts <= 0 || isNaN(pts)) {
      setError('Enter a valid point amount.');
      return;
    }
    setError('');
    setPoints('');
    Keyboard.dismiss();
    onAddRound(loser, winner, pts);
  };

  const share = async () => {
    if (rounds.length === 0) return;
    try {
      await Share.share({ message: buildShareText(gameType, players, rounds, gameStartTime, Date.now()) });
    } catch {
      // user cancelled — nothing to do
    }
  };

  const confirmEnd = () => {
    Alert.alert('', 'End the game and settle up?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onEndGame },
    ]);
  };

  const quickAmounts = getRecentAmounts(rounds);

  return (
    <View>
      <Pressable onPress={onBack} style={styles.ghostBtn}>
        <Text style={styles.ghostText}>← Back to Setup</Text>
      </Pressable>

      <View style={styles.standingsHeader}>
        <Text style={styles.label}>Standings</Text>
        {rounds.length > 0 && (
          <Pressable onPress={share} style={styles.shareBtn}>
            <Text style={styles.shareText}>↗ Share</Text>
          </Pressable>
        )}
      </View>
      <ScorePanel players={players} rounds={rounds} showTitles flashKey={rounds.length} />

      <View style={panelStyle}>
        <Text style={styles.label}>Who pays?</Text>
        <View style={styles.playerRow}>
          {players.map(p => (
            <Pressable
              key={`l-${p}`}
              onPress={() => selectLoser(p)}
              style={[styles.playerBtn, loser === p && styles.loserSelected]}
            >
              <Text style={[styles.playerBtnText, loser === p && { color: colors.red }]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Who gets?</Text>
        <View style={styles.playerRow}>
          {players.map(p => (
            <Pressable
              key={`w-${p}`}
              onPress={() => selectWinner(p)}
              disabled={p === loser}
              style={[
                styles.playerBtn,
                winner === p && styles.winnerSelected,
                p === loser && { opacity: 0.25 },
              ]}
            >
              <Text style={[styles.playerBtnText, winner === p && { color: colors.green }]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {quickAmounts.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 10 }]}>Quick</Text>
            <View style={styles.playerRow}>
              {quickAmounts.map(a => (
                <Pressable
                  key={a}
                  onPress={() => { trackFeature('quick_amount'); setPoints(String(a)); }}
                  style={styles.quickBtn}
                >
                  <Text style={styles.quickText}>{a}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={styles.addRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Points</Text>
            <TextInput
              style={styles.input}
              value={points}
              onChangeText={setPoints}
              keyboardType="decimal-pad"
              onSubmitEditing={add}
            />
          </View>
          <Pressable onPress={add} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>
        <Text style={styles.error}>{error}</Text>
      </View>

      <Pressable
        onPress={() => { trackFeature('log_view'); setLogOpen(o => !o); }}
        style={styles.logHeader}
      >
        <Text style={styles.label}>Log ({rounds.length})</Text>
        <Text style={[styles.chevron, logOpen && { transform: [{ rotate: '90deg' }] }]}>▸</Text>
      </Pressable>
      {logOpen && (
        <View style={panelStyle}>
          {rounds.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 14 }}>No entries yet</Text>
          ) : (
            rounds.slice().reverse().map((r, i) => {
              const index = rounds.length - 1 - i;
              return (
                <View key={index} style={styles.logRow}>
                  <Text style={styles.logText}>
                    #{index + 1}: {r.loser} → {r.winner}: {fmt(r.points)} pts
                  </Text>
                  <Pressable
                    onPress={() => { trackFeature('undo'); onDeleteRound(index); }}
                    hitSlop={8}
                  >
                    <Text style={styles.deleteX}>✕</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      )}

      <Pressable onPress={confirmEnd} style={[styles.ghostBtn, { marginTop: 16, alignItems: 'center' }]}>
        <Text style={[styles.ghostText, { color: colors.red }]}>End Game — Settle Up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12, textTransform: 'uppercase', color: colors.muted,
    letterSpacing: 0.5, marginBottom: 6,
  },
  ghostBtn: { padding: 8 },
  ghostText: { color: colors.muted, fontSize: 14, textDecorationLine: 'underline' },
  standingsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  shareBtn: {
    backgroundColor: colors.banner, borderWidth: 1.5, borderColor: colors.bannerBorder,
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
  },
  shareText: { fontSize: 14, color: colors.muted },
  playerRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  playerBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderWidth: 2,
    borderColor: colors.border, borderRadius: 10, backgroundColor: '#fff',
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  playerBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  loserSelected: { backgroundColor: colors.loserBg, borderColor: colors.red },
  winnerSelected: { backgroundColor: colors.winnerBg, borderColor: colors.green },
  quickBtn: {
    flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, backgroundColor: '#fff', minHeight: 38, alignItems: 'center',
  },
  quickText: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 10 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 16, minHeight: 48, color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.gold, borderRadius: 10, paddingVertical: 14,
    paddingHorizontal: 24, minHeight: 48, justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: colors.red, fontSize: 14, minHeight: 20, marginTop: 4 },
  logHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  chevron: { color: colors.muted, fontSize: 14 },
  logRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  logText: { fontSize: 14, color: colors.text, flex: 1 },
  deleteX: { color: colors.red, fontSize: 18, paddingHorizontal: 8 },
});
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Commit**

```bash
cd .. && git add native/src && git commit -m "feat(native): scoring screen with keep-awake and native share"
```

---

### Task 9: Settlement screen + App root wiring + simulator parity pass

**Files:**
- Create: `native/src/screens/SettlementScreen.tsx`
- Modify: `native/App.tsx` (replace template content entirely)

**Interfaces:**
- Consumes: everything from Tasks 2–8.
- Produces: `SettlementScreen({ players, rounds, onBackToScoring, onNewGame })`; `App.tsx` owning `GameState` + `screen`, matching the spec's launch behavior and Android back policy.

- [ ] **Step 1: Implement** `native/src/screens/SettlementScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScorePanel } from '../components/ScorePanel';
import { calculateSettlement, fmt, getNetScores, settlementFlavor, sortByScore } from '../logic/game';
import { Round } from '../types';
import { colors, panelStyle } from '../theme';

export interface SettlementScreenProps {
  players: string[];
  rounds: Round[];
  onBackToScoring(): void;
  onNewGame(): void;
}

export function SettlementScreen({ players, rounds, onBackToScoring, onNewGame }: SettlementScreenProps) {
  const scores = getNetScores(players, rounds);
  const sorted = sortByScore(players, scores);
  const transfers = calculateSettlement(scores);
  // Pick once per settlement visit, like the web's renderSettlement
  const [flavor] = useState(() =>
    settlementFlavor(sorted[0], sorted[sorted.length - 1], transfers.length > 0)
  );

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.gameOver}>Game Over!</Text>
        <Text style={styles.flavor}>{flavor}</Text>
      </View>

      <Text style={styles.label}>Final Scores</Text>
      <ScorePanel players={players} rounds={rounds} showTitles={false} />

      <Text style={styles.label}>Who Pays Who</Text>
      <View style={panelStyle}>
        {transfers.length === 0 ? (
          <Text style={styles.even}>大家打平了！</Text>
        ) : (
          transfers.map((t, i) => (
            <View key={i} style={[styles.transferRow, i < transfers.length - 1 && styles.transferBorder]}>
              <Text style={styles.from}>{t.from}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.to}>{t.to}</Text>
              <Text style={styles.amount}>{fmt(t.amount)} pts</Text>
            </View>
          ))
        )}
      </View>

      <Pressable style={[styles.btn, { backgroundColor: colors.gold }]} onPress={onBackToScoring}>
        <Text style={styles.btnText}>← Back to Scoring</Text>
      </Pressable>
      <Pressable style={[styles.btn, { backgroundColor: colors.red }]} onPress={onNewGame}>
        <Text style={styles.btnText}>New Game</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 16 },
  gameOver: { fontSize: 20, fontWeight: 'bold', color: colors.gold },
  flavor: { color: colors.gold, fontSize: 14, marginTop: 6 },
  label: {
    fontSize: 12, textTransform: 'uppercase', color: colors.muted,
    letterSpacing: 0.5, marginBottom: 6,
  },
  even: { color: colors.green, textAlign: 'center', padding: 8 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  transferBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  from: { color: colors.red, fontWeight: '600', fontSize: 16 },
  arrow: { color: colors.muted },
  to: { color: colors.green, fontWeight: '600', fontSize: 16 },
  amount: { marginLeft: 'auto', fontWeight: '800', fontSize: 18, color: colors.text },
  btn: {
    borderRadius: 10, padding: 14, minHeight: 48, alignItems: 'center', marginTop: 12,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2: Replace `native/App.tsx` entirely with:**

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SetupScreen } from './src/screens/SetupScreen';
import { ScoringScreen } from './src/screens/ScoringScreen';
import { SettlementScreen } from './src/screens/SettlementScreen';
import { Snackbar, SnackbarHandle } from './src/components/Snackbar';
import { funToast, fmt } from './src/logic/game';
import { saveState, restoreState, clearState } from './src/storage';
import { logGameEnd, resetFeatures } from './src/analytics';
import { initSounds, soundCoin, soundDelete, soundSettle } from './src/sounds';
import { GameState, GameType } from './src/types';
import { colors } from './src/theme';

type Screen = 'loading' | 'setup' | 'scoring' | 'settlement';

const FRESH: GameState = {
  gameType: 'mahjong', playerCount: 3, players: [], rounds: [], gameStartTime: Date.now(),
};

export default function App() {
  const [game, setGame] = useState<GameState>(FRESH);
  const [screen, setScreen] = useState<Screen>('loading');
  const snackbar = useRef<SnackbarHandle>(null);

  // Launch: valid saved game (players AND rounds) opens directly on scoring.
  useEffect(() => {
    (async () => {
      await initSounds();
      const saved = await restoreState();
      if (saved) setGame(saved);
      setScreen(saved && saved.players.length > 0 && saved.rounds.length > 0 ? 'scoring' : 'setup');
    })();
  }, []);

  // Android hardware back: scoring → setup (game preserved), settlement → scoring, setup → exit.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'scoring') { setScreen('setup'); return true; }
      if (screen === 'settlement') { setScreen('scoring'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const startGame = useCallback((names: string[], gameType: GameType, playerCount: number) => {
    const next: GameState = { gameType, playerCount, players: names, rounds: [], gameStartTime: Date.now() };
    resetFeatures();
    setGame(next);
    setScreen('scoring');
    saveState(next);
  }, []);

  const addRound = useCallback((loser: string, winner: string, points: number) => {
    setGame(prev => {
      const next = { ...prev, rounds: [...prev.rounds, { loser, winner, points }] };
      saveState(next);
      return next;
    });
    soundCoin();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    snackbar.current?.show(funToast(loser, winner), `${loser} → ${winner}: ${fmt(points)} pts`);
  }, []);

  const deleteRound = useCallback((index: number) => {
    setGame(prev => {
      const rounds = prev.rounds.filter((_, i) => i !== index);
      const next = { ...prev, rounds };
      saveState(next);
      return next;
    });
    soundDelete();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const endGame = useCallback(() => {
    setScreen('settlement');
    soundSettle();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logGameEnd(game); // fire-and-forget, same trigger as web
  }, [game]);

  const newGame = useCallback(() => {
    clearState();
    setGame({ ...FRESH, gameStartTime: Date.now() });
    setScreen('setup');
  }, []);

  const hasActiveGame = game.rounds.length > 0 && game.players.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.h1}>🀄 MahMahMia</Text>
          <Text style={styles.subtitle}>Score Tracker</Text>

          {screen === 'setup' && (
            <SetupScreen
              initialGameType={game.gameType}
              hasActiveGame={hasActiveGame}
              resume={hasActiveGame
                ? { gameType: game.gameType, players: game.players, roundCount: game.rounds.length }
                : null}
              onStart={startGame}
              onResume={() => setScreen('scoring')}
            />
          )}
          {screen === 'scoring' && (
            <ScoringScreen
              players={game.players}
              gameType={game.gameType}
              rounds={game.rounds}
              gameStartTime={game.gameStartTime}
              onAddRound={addRound}
              onDeleteRound={deleteRound}
              onBack={() => setScreen('setup')}
              onEndGame={endGame}
            />
          )}
          {screen === 'settlement' && (
            <SettlementScreen
              players={game.players}
              rounds={game.rounds}
              onBackToScoring={() => setScreen('scoring')}
              onNewGame={newGame}
            />
          )}

          {screen !== 'loading' && (
            <Text style={styles.footer}>Built for game nights · © 2026 NexvanceTech</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Snackbar ref={snackbar} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, maxWidth: 420, width: '100%', alignSelf: 'center' },
  h1: { textAlign: 'center', fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  subtitle: { textAlign: 'center', color: colors.muted, fontSize: 14, marginBottom: 20 },
  footer: { textAlign: 'center', paddingVertical: 24, fontSize: 11, color: colors.faint },
});
```

- [ ] **Step 3: Verify** — `npm test` → all green; `npx tsc --noEmit` → clean.

- [ ] **Step 4: Simulator parity pass** — `npx expo start --ios`, then walk this checklist against the live site (mahmahmia.com) side by side:
  - Setup: toggle switches 3↔4 inputs; empty-name error; duplicate-name error; start works.
  - Scoring: add rounds (hear coin, see Chinese toast + detail, standings flash, titles correct); same-person pay/get blocked; quick chips appear after adds, ascending; log opens, newest first, delete works (boop sound); share sheet shows the exact text format; screen does not sleep (leave idle > auto-lock interval).
  - End game: confirm dialog → fanfare → flavor line, final scores, transfers match hand-checked math.
  - Kill the app mid-game, relaunch → opens directly on scoring with state intact.
  - Back to Setup → resume banner shows correct detail → resume returns.
  - New Game → clean setup, Mahjong/3 selected.
  - Record any mismatch and fix before committing.

- [ ] **Step 5: Commit**

```bash
cd .. && git add native && git commit -m "feat(native): settlement screen and app wiring — feature parity complete"
```

---

### Task 10: App icon, adaptive icon, splash

**Files:**
- Create: `native/scripts/generate-icons.mjs`
- Replace: `native/assets/icon.png`, `native/assets/adaptive-icon.png`, `native/assets/splash-icon.png`

**Interfaces:**
- Consumes: repo-root `favicon.svg` (mahjong tile with 發) and fallback `icon-512.png`.
- Produces: the three asset files `app.json` already references.

- [ ] **Step 1: Install sharp (dev-only)** — in `native/`: `npm install -D sharp`

- [ ] **Step 2: Write** `native/scripts/generate-icons.mjs`:

```js
import sharp from 'sharp';

// Primary source: the SVG tile. If the 發 glyph renders wrong (CJK font issue
// in librsvg), switch SRC to the fallback raster and re-run.
const SRC = '../favicon.svg';
// const SRC = '../icon-512.png'; // fallback

// 1024 app icon (full-bleed tile)
await sharp(SRC, { density: 512 }).resize(1024, 1024).png().toFile('assets/icon.png');

// Android adaptive foreground: tile at 66% inside safe zone, transparent around
const tile = await sharp(SRC, { density: 512 }).resize(676, 676).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: tile, gravity: 'centre' }])
  .png().toFile('assets/adaptive-icon.png');

// Splash icon: tile at 512 on transparent (app.json sets bg #f5f0e8)
await sharp(SRC, { density: 512 }).resize(512, 512).png().toFile('assets/splash-icon.png');

console.log('wrote icon.png, adaptive-icon.png, splash-icon.png');
```

- [ ] **Step 3: Generate and visually verify** — `node scripts/generate-icons.mjs`, then `open assets/icon.png assets/adaptive-icon.png assets/splash-icon.png`. Check: the 發 character renders crisp and centered, colors match the favicon. If the glyph is missing/tofu, switch to the fallback source line and re-run.

- [ ] **Step 4: Verify in simulator** — `npx expo start --ios` (`npx expo prebuild --clean` NOT needed for Expo Go; icon shows on dev-build/EAS builds — at minimum confirm no bundler errors and splash bg color shows). Full icon check happens on the Task 12 device build.

- [ ] **Step 5: Commit**

```bash
cd .. && git add native && git commit -m "feat(native): app icons and splash from favicon tile"
```

---

### Task 11: Privacy policy page (website)

**Files:**
- Create: repo-root `privacy.html`

**Interfaces:**
- Produces: `https://mahmahmia.com/privacy.html` — the URL both store listings will reference.

- [ ] **Step 1: Create repo-root `privacy.html`:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - MahMahMia</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #f5f0e8; color: #3d2e1e; max-width: 640px;
      margin: 0 auto; padding: 24px 16px; line-height: 1.6;
    }
    h1 { color: #c4873b; font-size: 24px; }
    h2 { font-size: 18px; margin-top: 28px; }
    a { color: #c4873b; }
    .muted { color: #8a7560; font-size: 14px; }
  </style>
</head>
<body>
  <h1>🀄 MahMahMia — Privacy Policy</h1>
  <p class="muted">Last updated: 18 July 2026</p>

  <p>MahMahMia is a score tracker for Mahjong and Rummy, available at mahmahmia.com and as a mobile app. There are no accounts and no sign-up. It is built to collect as little as possible.</p>

  <h2>What stays on your device</h2>
  <p>Your game data — player names, scores, and round history — is stored only on your device. It is never uploaded anywhere.</p>

  <h2>What we collect</h2>
  <p>When a game ends, the app sends one anonymous statistics record so we can understand how MahMahMia is used: a random app-generated ID (not linked to you or your device identity), game type, player count, number of transactions, game duration, device type, language, screen width, app version, time zone, hour of day, score spread, and which features were used. Player names and scores are <strong>not</strong> included.</p>

  <h2>What we don't do</h2>
  <ul>
    <li>No advertising, no tracking across apps or websites</li>
    <li>No selling or sharing of data with third parties</li>
    <li>No personal information collected — no names, emails, contacts, or location</li>
  </ul>

  <h2>Where statistics are stored</h2>
  <p>Anonymous statistics are stored with Supabase, our database provider, on secure servers.</p>

  <h2>Data deletion</h2>
  <p>Uninstalling the app removes all local game data and the random ID. Because statistics records contain no personal information, they cannot be traced back to you; if you would still like records associated with your random ID removed, contact us.</p>

  <h2>Contact</h2>
  <p><a href="mailto:sootinghooi@gmail.com">sootinghooi@gmail.com</a></p>

  <p class="muted">© 2026 NexvanceTech · <a href="/">Back to MahMahMia</a></p>
</body>
</html>
```

- [ ] **Step 2: Commit and push** (push deploys via Vercel — this repo's normal flow):

```bash
git add privacy.html && git commit -m "feat: privacy policy page for app store listings" && git push
```

- [ ] **Step 3: Verify live** — `curl -s -o /dev/null -w "%{http_code}" https://mahmahmia.com/privacy.html` → expect `200` (wait ~1 min for deploy; retry).

---

### Task 12: EAS setup + dev build on real iPhone + real-path QA

**Files:**
- Create: `native/eas.json`
- Modify: `native/app.json` (eas projectId added automatically by `eas init`)

**Interfaces:**
- Produces: working EAS project, a development build installed on the user's iPhone, QA sign-off, RLS verification.

- [ ] **Step 1: Create `native/eas.json`:**

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 2: [NEEDS USER] Log in and init** — in `native/`: `npx eas-cli login` (user's Expo account; create a free one at expo.dev if none — ask), then `npx eas-cli init` (accept creating the project). Commit the projectId change to app.json afterwards.

- [ ] **Step 3: [NEEDS USER] Register the user's iPhone and build** — `npx eas-cli device:create` (sends the user a link to open on their iPhone to register its UDID; needs their Apple Developer login), then:

```bash
npx eas-cli build --profile development --platform ios
```

Expect: build queued on EAS servers (~15–25 min). When done, the user opens the build link on their iPhone to install, then run `npx expo start` and connect. (For the exact hand-holding flow, follow the `mykerja-native-local-test` skill — same pattern, this project.)

- [ ] **Step 4: [NEEDS USER] Real-device QA** — run the full Task 9 Step 4 checklist on the physical iPhone, plus phone-only items: haptic taps felt on add/delete/settle; screen stays awake on scoring past the auto-lock interval; share sheet posts correctly into WhatsApp; sounds audible with the mute switch on (playsInSilentMode).

- [ ] **Step 5: Verify RLS is insert-only** — anon key must not be able to read:

```bash
curl -s -w "\n%{http_code}" "https://rayamhtdgqgrtsjkkhrs.supabase.co/rest/v1/game_sessions?select=*&limit=1" \
  -H "apikey: $(grep -o 'eyJ[A-Za-z0-9._-]*' index.html | head -1)" \
  -H "Authorization: Bearer $(grep -o 'eyJ[A-Za-z0-9._-]*' index.html | head -1)"
```

(run from repo root). Expect: an empty array `[]` WITH row-level security silently filtering (acceptable only if table has no readable rows policy — since `[]` is also what an empty-but-readable table returns, prefer the definitive check) or a `401`/`42501` permission error. **Definitive check [NEEDS USER]:** in the Supabase dashboard → Authentication → Policies → `game_sessions`: confirm the only anon policy is INSERT. If a SELECT policy exists, ask the user before changing anything.

- [ ] **Step 6: [NEEDS USER] Verify one real analytics row** — end one real game on the iPhone build, then user checks Supabase dashboard → Table editor → `game_sessions` for a row with `device = 'ios-app'`, `referrer = 'app'`. Per the spec: a mocked insert proves nothing; this step is the proof.

- [ ] **Step 7: Commit**

```bash
cd .. && git add native && git commit -m "chore(native): EAS project setup"
```

---

### Task 13: Production builds, store listings, submission

**Files:**
- Create: `native/scripts/generate-feature-graphic.mjs`, store screenshots (out of repo, in `native/store-assets/` — gitignored or committed, either fine)

**Interfaces:**
- Consumes: everything prior; both store consoles [NEEDS USER throughout].
- Produces: app live in TestFlight + App Store review, and Play internal testing + promotion path.

- [ ] **Step 1: Screenshots** — seed a demo game (Mahjong; names `Ah Hock`, `Mei Ling`, `Uncle Lim`; rounds: Ah Hock→Mei Ling 20, Uncle Lim→Mei Ling 10, Mei Ling→Ah Hock 5, Uncle Lim→Ah Hock 15). Capture on the largest-screen iPhone simulator (e.g. iPhone Pro Max class, 6.9") with Cmd+S: setup screen, scoring with standings+titles, log open, settlement. Repeat on an Android emulator (any phone profile) for Play. Store files in `native/store-assets/ios/` and `native/store-assets/android/`.

- [ ] **Step 2: Feature graphic (Play, 1024×500)** — `native/scripts/generate-feature-graphic.mjs`:

```js
import sharp from 'sharp';

const icon = await sharp('assets/icon.png').resize(300, 300).png().toBuffer();
const text = Buffer.from(`<svg width="1024" height="500">
  <rect width="1024" height="500" fill="#f5f0e8"/>
  <text x="400" y="230" font-family="Helvetica, Arial" font-size="72" font-weight="bold" fill="#3d2e1e">MahMahMia</text>
  <text x="400" y="290" font-family="Helvetica, Arial" font-size="30" fill="#8a7560">Mahjong &amp; Rummy Score Tracker</text>
</svg>`);
await sharp(text)
  .composite([{ input: icon, left: 60, top: 100 }])
  .png().toFile('store-assets/android/feature-graphic.png');
console.log('wrote feature-graphic.png');
```

Run `mkdir -p store-assets/android store-assets/ios && node scripts/generate-feature-graphic.mjs`, `open` it to verify.

- [ ] **Step 3: Production builds:**

```bash
npx eas-cli build --platform all --profile production
```

Expect: `.ipa` and `.aab` builds on EAS (~20–30 min).

- [ ] **Step 4: [NEEDS USER] iOS — create app + submit** — `npx eas-cli submit -p ios --latest` (interactive; can create the App Store Connect app record — name **MahMahMia**, bundle `com.nexvancetech.mahmahmia`). Then in App Store Connect fill:
  - **Listing:** Name `MahMahMia`; Subtitle `Track wins. Settle up fast.`; Category Utilities; Price Free.
  - **Description:**

    > Score tracker for Mahjong and Rummy nights. Tap who pays, who gets, how much — MahMahMia keeps the standings, crowns the 大老板, and works out exactly who pays who at the end. No signup, no ads. Your screen stays awake through the whole game, every point lands with a satisfying cha-ching, and one tap shares the final standings to your group chat. Built for game nights.
  - **Keywords:** `mahjong,rummy,score,tracker,scorekeeper,points,settle up,game night,mahjong scorer`
  - **Privacy policy URL:** `https://mahmahmia.com/privacy.html`
  - **Privacy nutrition label (App Privacy section):** Collects: *Identifiers → User ID* and *Usage Data → Product Interaction*; both "used for Analytics", **not linked to identity**, **not used for tracking**. Nothing else collected.
  - **Age rating questionnaire:** answer **No** to all gambling questions (simulated and real) — the app is a score tracker: no gameplay, no wagering, no money handled. Expect rating 4+.
  - **Export compliance:** already declared in the binary (`ITSAppUsesNonExemptEncryption: false`) — no prompt should appear.
  - Add TestFlight → user smoke-tests the production build on their iPhone → Submit for review with the screenshots.

- [ ] **Step 5: [NEEDS USER] Android — create app + upload** — in Play Console: Create app (name **MahMahMia**, free, app not game — Tools category). Download the `.aab` from the EAS build page. Play Console → Testing → Internal testing → Create release → upload `.aab`. Fill:
  - **Store listing:** Short description (≤80): `Score tracker for Mahjong & Rummy nights. Track points, settle up at the end.` Full description: same text as iOS. Screenshots + feature graphic + 512px icon (export from `assets/icon.png` — Play accepts 512×512: `npx sharp-cli` not needed, run `node -e "import('sharp').then(s=>s.default('assets/icon.png').resize(512,512).toFile('store-assets/android/icon-512.png'))"`).
  - **Privacy policy:** `https://mahmahmia.com/privacy.html`
  - **Data safety form:** Collects *Device or other IDs* (app-generated random ID) and *App activity → App interactions*; purpose Analytics; **not shared**; **not required**; user can request deletion (contact email). Everything else: not collected.
  - **Content rating questionnaire:** category Utility; **No** to all gambling questions (same reasoning as iOS). Expect Everyone.
  - Roll out internal testing → user installs via the testing link on an Android device (or verified emulator) and smoke-tests.

- [ ] **Step 6: [NEEDS USER] Android production path** — attempt Production release promotion. If Play Console blocks with the closed-testing requirement (personal accounts created after Nov 13 2023: 12 testers for 14 days), set up the closed track, and the user recruits 12 testers (family/friends/kaki mahjong group — they just install and keep it 14 days). Document the date it started; promote to production when Play allows.

- [ ] **Step 7: Commit store assets + record status**

```bash
cd .. && git add native && git commit -m "chore(native): store assets and submission collateral"
```

Then report to the user: both review states, expected review times (Apple typically 1–3 days; Play new-app review up to 7 days, plus the possible 14-day closed test), and what emails to watch for.

---

## Post-plan verification (maps to spec Testing section)

| Spec requirement | Where verified |
|---|---|
| Unit tests: settlement, evalExpr, corrupt restore | Tasks 2, 3 |
| Real iPhone feature-parity pass | Task 12 Step 4 |
| Android real device | Task 13 Step 5 |
| Real analytics insert in real table | Task 12 Step 6 |
| RLS insert-only | Task 12 Step 5 |
