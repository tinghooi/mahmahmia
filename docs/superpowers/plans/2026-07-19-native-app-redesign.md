# Native App Visual Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the MahMahMia native app (Expo, `native/`) to match the approved design at claude.ai/design project `78731331-8997-4b28-acf9-9ba686c0f095` (`MahMahMia.dc.html` + `TileIcon.dc.html`) — new palette, fonts, dark mode, splash screen, redesigned Setup/Scoring/Settlement screens, celebration animation, and a new app icon. Native app only; the web app (`index.html`) is untouched.

**Architecture:** Theme becomes a plain data object (`getTheme(dark): Theme`) passed as a prop down the existing component tree — no React Context, matching this codebase's existing prop-drilling convention (nothing else here uses Context). Layout/typography stay in static `StyleSheet.create` blocks; theme-dependent colors are applied as inline style overrides merged via the array `style` prop (`style={[styles.card, { backgroundColor: t.card }]}`) — the same pattern the source design itself uses (`{{ t.xxx }}` inline). Game logic in `src/logic/game.ts` is NOT touched — its header comment says "Direct ports from index.html — behavior must not drift from the web app," and that constraint pre-dates and overrides anything in the new visual design that would imply different scoring/title copy.

**Tech Stack:** Expo ~57, React Native 0.86, TypeScript. New deps: `expo-font`, `expo-linear-gradient`, `@expo-google-fonts/manrope`, `@expo-google-fonts/sora`, `@expo-google-fonts/noto-serif-sc`. No new testing library — this repo only unit-tests pure logic (see `src/logic/__tests__`, `src/__tests__`); screens/visual components have zero test files today and this plan does not introduce component tests, only jest tests for new pure functions.

## Global Constraints

- **Do not touch `src/logic/game.ts` behavior** (scoring, titles, settlement, `evalExpr`, `funToast`, `settlementFlavor`, `getRecentAmounts`) — it must stay byte-identical to the web app's logic. Only its *presentation* (colors/fonts/layout of the text it returns) changes.
- **Do not touch the web app** (`index.html`, `sw.js`, anything at repo root) — native-only scope, confirmed with the user.
- **Read `native/AGENTS.md` before writing Expo API code** — "Expo HAS CHANGED, read https://docs.expo.dev/versions/v57.0.0/ before writing any code." All package APIs below (`expo-font`, `expo-linear-gradient`) must be checked against that version's docs if anything below looks off, since training data may predate v57.
- **Theme values are exact, copied from `MahMahMia.dc.html`'s `theme()` method** — do not invent new colors:
  - Light: `bg:'#F1E8DB' card:'#FFFFFF' ink:'#2B231E' mut:'#93826F' line:'rgba(0,0,0,0.07)' field:'#FBF8F2' red:'#C6412F' redT:'#F9E9E5' green:'#2E7D4F' greenT:'#E7F1EB' gold:'#BE842A' sub:'#B4A38F'`
  - Dark: `bg:'#17130F' card:'#241E18' ink:'#F3EADD' mut:'#9C8B79' line:'rgba(255,255,255,0.09)' field:'#1C1712' red:'#E67A69' redT:'#3A211C' green:'#63BE8A' greenT:'#1E2E24' gold:'#D8A64E' sub:'#7C6E60'`
- **Fonts:** Manrope (UI body, weights 400/500/600/700/800), Sora (display/headers, weights 600/700/800), Noto Serif SC (the 中 glyph + celebration text, weights 700/900). Chinese UI copy elsewhere (labels, buttons) has no explicit font in the source design — it inherits Manrope, which has no CJK glyphs, so the OS does automatic system-font fallback per character. This is expected and matches the source design; do not try to force a CJK font onto every Chinese string.
- **Design behavior change to implement, not a bug:** Setup screen now allows blank player names (defaults to letter A/B/C/D) instead of requiring all names filled. This is explicit in the source design's helper copy "Leave blank to use A · B · C · D" and its `dispName()` fallback — implement it as specified.
- **Verification:** No iOS simulator on this machine (only CLI tools, no full Xcode — see project memory). Verify screens visually via `npx expo start --web` in a browser during development (fonts/gradients/haptics will differ slightly from native, but layout/color/copy are representative). Final confirmation on a real device is the user's job before store resubmission — say so plainly, don't claim device-verified.

---

### Task 1: Install dependencies and wire font loading

**Files:**
- Modify: `native/package.json`
- Create: `native/src/fonts.ts`
- Modify: `native/App.tsx` (font-loading gate only, in this task — full rewrite is Task 13)

**Interfaces:**
- Produces: `useAppFonts(): boolean` (true once all fonts are loaded), `fontFamily` object `{ uiRegular, uiMedium, uiSemiBold, uiBold, uiExtraBold, displaySemiBold, displayBold, displayExtraBold, cjkBold, cjkBlack }` — every later task's `fontFamily:` style values reference these exact keys.

- [ ] **Step 1: Install packages**

```bash
cd "/Users/tinghooi/Work/In Progress/mahmahmia/native"
npx expo install expo-font expo-linear-gradient @expo-google-fonts/manrope @expo-google-fonts/sora @expo-google-fonts/noto-serif-sc
```

`expo install` (not plain `npm install`) so Expo pins versions compatible with SDK 57.

- [ ] **Step 2: Verify the exact export names the google-fonts packages ship**

```bash
grep -o "export const [A-Za-z0-9_]*" node_modules/@expo-google-fonts/manrope/index.js | sort
grep -o "export const [A-Za-z0-9_]*" node_modules/@expo-google-fonts/sora/index.js | sort
grep -o "export const [A-Za-z0-9_]*" node_modules/@expo-google-fonts/noto-serif-sc/index.js | sort
```

Expected: `Manrope_400Regular Manrope_500Medium Manrope_600SemiBold Manrope_700Bold Manrope_800ExtraBold`, `Sora_600SemiBold Sora_700Bold Sora_800ExtraBold`, `NotoSerifSC_700Bold NotoSerifSC_900Black`. If any name differs, use the actual name in Step 3 instead.

- [ ] **Step 3: Create `native/src/fonts.ts`**

```ts
import { useFonts } from 'expo-font';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { NotoSerifSC_700Bold, NotoSerifSC_900Black } from '@expo-google-fonts/noto-serif-sc';

export const fontFamily = {
  uiRegular: 'Manrope_400Regular',
  uiMedium: 'Manrope_500Medium',
  uiSemiBold: 'Manrope_600SemiBold',
  uiBold: 'Manrope_700Bold',
  uiExtraBold: 'Manrope_800ExtraBold',
  displaySemiBold: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  displayExtraBold: 'Sora_800ExtraBold',
  cjkBold: 'NotoSerifSC_700Bold',
  cjkBlack: 'NotoSerifSC_900Black',
} as const;

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold,
    NotoSerifSC_700Bold, NotoSerifSC_900Black,
  });
  return loaded;
}
```

- [ ] **Step 4: Gate `App.tsx` on fonts loading (minimal change, full rewrite comes in Task 13)**

In `native/App.tsx`, add near the top of the imports:

```tsx
import { useAppFonts } from './src/fonts';
```

Inside `export default function App() {`, as the very first line of the body:

```tsx
const fontsLoaded = useAppFonts();
```

Immediately after the existing `const [game, setGame] = useState<GameState>(FRESH);` line, add an early return so nothing else in the tree renders (and therefore no CJK/Sora fonts are referenced) before they exist:

```tsx
if (!fontsLoaded) return null;
```

- [ ] **Step 5: Manual verification**

```bash
cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx expo start --web
```

Open the printed `localhost` URL. Expected: the app still renders (plain, unstyled-looking — restyling is later tasks) with no red-screen error about missing fonts or missing native modules. If `expo-linear-gradient` throws on web, that's fine — it isn't used until Task 4.

- [ ] **Step 6: Commit**

```bash
git add native/package.json native/package-lock.json native/src/fonts.ts native/App.tsx
git commit -m "feat(native): add font loading infra for redesign"
```

---

### Task 2: Rewrite the theme module (light + dark palettes)

**Files:**
- Modify: `native/src/theme.ts` (full rewrite — this file currently exports static `colors`/`panelStyle`; every consumer of those two names is touched in later tasks, not this one)
- Test: `native/src/__tests__/theme.test.ts`

**Interfaces:**
- Produces: `Theme` interface, `getTheme(isDark: boolean): Theme`, `panelStyle(t: Theme): ViewStyle`. Every later task imports `getTheme`/`Theme`/`panelStyle` from `../theme` with these exact names.

- [ ] **Step 1: Write the failing test**

```ts
// native/src/__tests__/theme.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx jest theme.test.ts`
Expected: FAIL — `getTheme` is not exported (current `theme.ts` only exports `colors`/`panelStyle`).

- [ ] **Step 3: Replace `native/src/theme.ts` entirely**

```ts
import { ViewStyle } from 'react-native';

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  ink: string;
  mut: string;
  line: string;
  field: string;
  red: string;
  redT: string;
  green: string;
  greenT: string;
  gold: string;
  sub: string;
}

const LIGHT: Theme = {
  dark: false,
  bg: '#F1E8DB', card: '#FFFFFF', ink: '#2B231E', mut: '#93826F', line: 'rgba(0,0,0,0.07)', field: '#FBF8F2',
  red: '#C6412F', redT: '#F9E9E5', green: '#2E7D4F', greenT: '#E7F1EB', gold: '#BE842A', sub: '#B4A38F',
};

const DARK: Theme = {
  dark: true,
  bg: '#17130F', card: '#241E18', ink: '#F3EADD', mut: '#9C8B79', line: 'rgba(255,255,255,0.09)', field: '#1C1712',
  red: '#E67A69', redT: '#3A211C', green: '#63BE8A', greenT: '#1E2E24', gold: '#D8A64E', sub: '#7C6E60',
};

export function getTheme(isDark: boolean): Theme {
  return isDark ? DARK : LIGHT;
}

export function panelStyle(t: Theme): ViewStyle {
  return {
    backgroundColor: t.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: t.line,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest theme.test.ts`
Expected: PASS (2 tests). Note: `npx jest` (whole suite) will now show many TS errors from every file still importing the old `colors`/`panelStyle` named export as a value — that's expected and fixed screen-by-screen in Tasks 9–12. Run scoped `theme.test.ts` only for this task's gate.

- [ ] **Step 5: Commit**

```bash
git add native/src/theme.ts native/src/__tests__/theme.test.ts
git commit -m "feat(native): light/dark theme palettes from the new design"
```

---

### Task 3: Preference persistence (dark mode + sound mute)

**Files:**
- Modify: `native/src/storage.ts` (add `Prefs`, `savePrefs`, `restorePrefs`)
- Modify: `native/src/sounds.ts` (add mute gate)
- Modify: `native/src/__tests__/storage.test.ts`
- Test: `native/src/__tests__/sounds.test.ts`

**Interfaces:**
- Produces: `Prefs { dark: boolean; sound: boolean }`, `savePrefs(p: Prefs): Promise<void>`, `restorePrefs(): Promise<Prefs>` from `./storage`; `setSoundEnabled(v: boolean): void`, `isSoundEnabled(): boolean` from `./sounds`.

- [ ] **Step 1: Write the failing tests — append to `native/src/__tests__/storage.test.ts`**

Add this import alongside the existing ones at the top:

```ts
import { savePrefs, restorePrefs } from '../storage';
```

Add this `describe` block at the end of the file, inside the existing structure (after the closing `});` of the `describe('storage', ...)` block, as a sibling top-level block):

```ts
describe('prefs', () => {
  it('returns defaults when nothing saved', async () => {
    expect(await restorePrefs()).toEqual({ dark: false, sound: true });
  });

  it('round-trips saved prefs', async () => {
    await savePrefs({ dark: true, sound: false });
    expect(await restorePrefs()).toEqual({ dark: true, sound: false });
  });

  it('falls back to defaults on corrupt JSON', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await AsyncStorage.setItem('mahmahmia-prefs', '{not json');
    expect(await restorePrefs()).toEqual({ dark: false, sound: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx jest storage.test.ts`
Expected: FAIL — `savePrefs`/`restorePrefs` not exported.

- [ ] **Step 3: Add to `native/src/storage.ts`**

Add this constant near the top, alongside `STATE_KEY`/`CID_KEY`:

```ts
const PREFS_KEY = 'mahmahmia-prefs';
```

Add this interface and the two functions at the end of the file:

```ts
export interface Prefs {
  dark: boolean;
  sound: boolean;
}

const DEFAULT_PREFS: Prefs = { dark: false, sound: true };

export async function savePrefs(prefs: Prefs): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('savePrefs failed', e);
  }
}

export async function restorePrefs(): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw);
    return {
      dark: typeof p.dark === 'boolean' ? p.dark : DEFAULT_PREFS.dark,
      sound: typeof p.sound === 'boolean' ? p.sound : DEFAULT_PREFS.sound,
    };
  } catch (e) {
    console.error('restorePrefs failed', e);
    return DEFAULT_PREFS;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest storage.test.ts`
Expected: PASS (all storage + prefs tests).

- [ ] **Step 5: Write the failing sound-mute test — create `native/src/__tests__/sounds.test.ts`**

```ts
import { setSoundEnabled, isSoundEnabled } from '../sounds';

describe('sound mute flag', () => {
  it('defaults to enabled', () => {
    expect(isSoundEnabled()).toBe(true);
  });

  it('toggles', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx jest sounds.test.ts`
Expected: FAIL — `setSoundEnabled`/`isSoundEnabled` not exported.

- [ ] **Step 7: Add mute gate to `native/src/sounds.ts`**

Add near the top, after the `let players` line:

```ts
let soundEnabled = true;

export function setSoundEnabled(v: boolean): void {
  soundEnabled = v;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}
```

Change the existing `play` function to gate on it:

```ts
function play(p: AudioPlayer | undefined): void {
  if (!p || !soundEnabled) return;
  try {
    p.seekTo(0);
    p.play();
  } catch (e) {
    console.error('sound play failed', e);
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest sounds.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add native/src/storage.ts native/src/sounds.ts native/src/__tests__/storage.test.ts native/src/__tests__/sounds.test.ts
git commit -m "feat(native): persist dark-mode/sound prefs, add sound mute gate"
```

---

### Task 4: TileIcon component (the app's mark, used in Header/Splash/anywhere the icon appears in-app)

**Files:**
- Create: `native/src/components/TileIcon.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TileIcon` component, props `{ size: number; variant?: 'green' | 'ruby' | 'gold' | 'dark' | 'mono' }` (default `'green'`). Task 5 (Header) and Task 8 (Splash) render `<TileIcon size={N} />`.

This is a direct port of `TileIcon.dc.html`'s math: `r = size*0.225` (outer corner radius), `tileW = size*0.5`, `tileH = size*0.66`, `tileR = size*0.1` (inner tile card), `charSize = size*0.38`.

- [ ] **Step 1: Create `native/src/components/TileIcon.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fontFamily } from '../fonts';

export interface TileIconProps {
  size: number;
  variant?: 'green' | 'ruby' | 'gold' | 'dark' | 'mono';
}

const GRADIENTS: Record<NonNullable<TileIconProps['variant']>, [string, string]> = {
  green: ['#41946A', '#1C6440'],
  ruby: ['#C6533F', '#932619'],
  gold: ['#D8A852', '#AE7A1F'],
  dark: ['#2C2620', '#12100C'],
  mono: ['#EEE7D9', '#DBD1BD'],
};

export function TileIcon({ size, variant = 'green' }: TileIconProps) {
  const r = Math.round(size * 0.225);
  const tileW = Math.round(size * 0.5);
  const tileH = Math.round(size * 0.66);
  const tileR = Math.round(size * 0.1);
  const charSize = Math.round(size * 0.38);

  return (
    <LinearGradient
      colors={GRADIENTS[variant]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: r },
      ]}
    >
      <View
        style={[
          styles.tile,
          { width: tileW, height: tileH, borderRadius: tileR },
        ]}
      >
        <Text style={[styles.char, { fontSize: charSize, fontFamily: fontFamily.cjkBlack }]}>中</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tile: {
    backgroundColor: '#FCF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  char: {
    color: '#C0392B',
    lineHeight: undefined,
  },
});
```

Note: RN `Text` has no CSS `text-shadow` equivalent beyond `textShadowColor`/`textShadowOffset`/`textShadowRadius` — the source design's subtle `0 1px 0 rgba(255,255,255,.5)` glyph highlight is a nice-to-have, skip it (not worth the visual complexity for a 1px highlight that won't read at small icon sizes).

- [ ] **Step 2: Manual verification**

```bash
cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx expo start --web
```

Temporarily render `<TileIcon size={120} />` at the top of `App.tsx`'s returned tree (anywhere visible) to eyeball it: a jade-gradient rounded square with a cream tile card and red 中 centered. Remove the temporary render before moving on — Task 5/8 wire it in for real.

- [ ] **Step 3: Commit**

```bash
git add native/src/components/TileIcon.tsx
git commit -m "feat(native): add TileIcon brand mark component"
```

---

### Task 5: Header component (icon + title + dark/sound toggles)

**Files:**
- Create: `native/src/components/Header.tsx`

**Interfaces:**
- Consumes: `Theme` from `../theme`, `TileIcon` from `./TileIcon`.
- Produces: `Header` component, props `{ theme: Theme; dark: boolean; sound: boolean; onToggleDark(): void; onToggleSound(): void }`. Task 13 (`App.tsx`) renders this once, above the active screen, on every screen except Splash.

- [ ] **Step 1: Create `native/src/components/Header.tsx`**

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';
import { TileIcon } from './TileIcon';

export interface HeaderProps {
  theme: Theme;
  dark: boolean;
  sound: boolean;
  onToggleDark(): void;
  onToggleSound(): void;
}

export function Header({ theme: t, dark, sound, onToggleDark, onToggleSound }: HeaderProps) {
  return (
    <View style={[styles.row, { backgroundColor: t.bg, borderBottomColor: t.line }]}>
      <TileIcon size={34} />
      <View style={styles.titles}>
        <Text style={[styles.title, { color: t.ink, fontFamily: fontFamily.displayExtraBold }]}>MahMahMia</Text>
        <Text style={[styles.subtitle, { color: t.mut }]}>记分 · Score Tracker</Text>
      </View>
      <Pressable onPress={onToggleSound} style={[styles.iconBtn, { borderColor: t.line, backgroundColor: t.card }]}>
        <Text style={styles.iconGlyph}>{sound ? '🔊' : '🔇'}</Text>
      </Pressable>
      <Pressable onPress={onToggleDark} style={[styles.iconBtn, { borderColor: t.line, backgroundColor: t.card }]}>
        <Text style={styles.iconGlyph}>{dark ? '☀️' : '🌙'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  titles: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, lineHeight: 22, letterSpacing: -0.2 },
  subtitle: { fontSize: 11, marginTop: 2, letterSpacing: 0.2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  iconGlyph: { fontSize: 16 },
});
```

- [ ] **Step 2: Commit**

```bash
git add native/src/components/Header.tsx
git commit -m "feat(native): add Header component with dark/sound toggles"
```

(Wired into `App.tsx` and visually verified together with the rest of the tree in Task 13 — a header with no screen beneath it isn't independently meaningful to eyeball.)

---

### Task 6: Numeric keypad component (replaces the `TextInput` points field)

**Files:**
- Create: `native/src/components/Keypad.tsx`
- Test: `native/src/components/__tests__/Keypad.test.ts`

**Interfaces:**
- Produces: pure function `pressKey(current: string, key: string): string` (exported for testing and reuse), and `Keypad` component with props `{ theme: Theme; value: string; onChange(next: string): void }`. Task 10 (ScoringScreen) replaces its `TextInput` with `<Keypad theme={t} value={points} onChange={setPoints} />`.

`pressKey` is a direct port of the source design's `press(k)` method (digits append, `.` inserts once — prefixing `0` if empty, `⌫` backspaces, 12-digit cap on the digit-only length).

- [ ] **Step 1: Write the failing test**

```ts
// native/src/components/__tests__/Keypad.test.ts
import { pressKey } from '../Keypad';

describe('pressKey', () => {
  it('appends digits', () => {
    expect(pressKey('', '5')).toBe('5');
    expect(pressKey('5', '3')).toBe('53');
  });
  it('replaces a leading 0', () => {
    expect(pressKey('0', '7')).toBe('7');
  });
  it('inserts a single decimal point, prefixing 0 if empty', () => {
    expect(pressKey('', '.')).toBe('0.');
    expect(pressKey('12', '.')).toBe('12.');
    expect(pressKey('12.5', '.')).toBe('12.5');
  });
  it('backspaces', () => {
    expect(pressKey('123', '⌫')).toBe('12');
    expect(pressKey('', '⌫')).toBe('');
  });
  it('caps digit length at 12', () => {
    const twelve = '123456789012';
    expect(pressKey(twelve, '3')).toBe(twelve);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx jest Keypad.test.ts`
Expected: FAIL — module `../Keypad` doesn't exist yet.

- [ ] **Step 3: Create `native/src/components/Keypad.tsx`**

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';

export function pressKey(current: string, key: string): string {
  if (key === '⌫') return current.slice(0, -1);
  if (key === '.') return current.includes('.') ? current : (current || '0') + '.';
  const next = current === '0' ? key : current + key;
  return next.replace('.', '').length > 12 ? current : next;
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

export interface KeypadProps {
  theme: Theme;
  value: string;
  onChange(next: string): void;
}

export function Keypad({ theme: t, value, onChange }: KeypadProps) {
  return (
    <View style={styles.grid}>
      {KEYS.map(k => (
        <Pressable
          key={k}
          onPress={() => onChange(pressKey(value, k))}
          style={[styles.key, { borderColor: t.line, backgroundColor: t.card }]}
        >
          <Text style={[styles.keyText, { color: t.ink, fontFamily: fontFamily.displayBold }]}>{k}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: {
    width: '31%', height: 56, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 22 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest Keypad.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add native/src/components/Keypad.tsx native/src/components/__tests__/Keypad.test.ts
git commit -m "feat(native): add numeric Keypad component with pressKey reducer"
```

---

### Task 7: Celebration overlay (confetti on a big win)

**Files:**
- Create: `native/src/components/Celebration.tsx`
- Test: `native/src/components/__tests__/Celebration.test.ts`

**Interfaces:**
- Produces: pure function `isBigWin(points: number, threshold?: number): boolean` (default threshold 3000, matching the source design's `bigWinThreshold` default), and `Celebration` component with props `{ theme: Theme; winnerName: string; points: number; onDone(): void }`. Task 10 (ScoringScreen) renders `{celebration && <Celebration .../>}` conditionally, and calls `onDone` to clear it (2.3s auto-dismiss, ported from the source design's `setTimeout(..., 2300)`).

This is new functionality — nothing like it exists in the current app. It reuses the existing `soundCoin()` effect (there's no Web-Audio-oscillator equivalent bundled for the source design's synthesized 3-tone chime, and fabricating new `.wav` assets is out of scope — one existing "coin" sound on trigger is the pragmatic substitute).

- [ ] **Step 1: Write the failing test**

```ts
// native/src/components/__tests__/Celebration.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx jest Celebration.test.ts`
Expected: FAIL — module `../Celebration` doesn't exist yet.

- [ ] **Step 3: Create `native/src/components/Celebration.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';
import { fmt } from '../logic/game';

export function isBigWin(points: number, threshold = 3000): boolean {
  return points >= threshold;
}

const CHARS = ['🀄', '💰', '🧧', '💵', '🪙', '✨', '🎉', '👑'];
const PIECE_COUNT = 16;
const DURATION_MS = 2300;

interface Piece {
  left: string;
  size: number;
  char: string;
  delay: number;
  fall: Animated.Value;
  rotate: number;
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    left: `${Math.round(Math.random() * 96)}%`,
    size: 20 + Math.random() * 18,
    char: CHARS[i % CHARS.length],
    delay: Math.random() * 350,
    fall: new Animated.Value(0),
    rotate: 360 + Math.random() * 540,
  }));
}

export interface CelebrationProps {
  theme: Theme;
  winnerName: string;
  points: number;
  onDone(): void;
}

export function Celebration({ theme: t, winnerName, points, onDone }: CelebrationProps) {
  const pieces = useRef(makePieces()).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }).start();
    const anims = pieces.map(p =>
      Animated.timing(p.fall, {
        toValue: 1,
        duration: 1300 + Math.random() * 900,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      })
    );
    Animated.parallel(anims).start();
    const timer = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {pieces.map((p, i) => {
        const translateY = p.fall.interpolate({ inputRange: [0, 1], outputRange: [-40, 860] });
        const rotate = p.fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotate}deg`] });
        const opacity = p.fall.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 1, 0] });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.piece,
              { left: p.left, fontSize: p.size, opacity, transform: [{ translateY }, { rotate }] },
            ]}
          >
            {p.char}
          </Animated.Text>
        );
      })}
      <Animated.View style={[styles.center, { transform: [{ scale: pop }], opacity: pop }]}>
        <Text style={styles.emoji}>🤑</Text>
        <Text style={[styles.text, { color: t.gold, fontFamily: fontFamily.cjkBlack }]}>赢麻了!</Text>
        <Text style={[styles.sub, { fontFamily: fontFamily.displayExtraBold }]}>
          {winnerName} +{fmt(points)}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  piece: { position: 'absolute', top: 0 },
  center: { alignItems: 'center' },
  emoji: { fontSize: 76, lineHeight: 80 },
  text: { fontSize: 48, marginTop: 4 },
  sub: { fontSize: 20, color: '#fff', marginTop: 6 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest Celebration.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add native/src/components/Celebration.tsx native/src/components/__tests__/Celebration.test.ts
git commit -m "feat(native): add Celebration confetti overlay for big wins"
```

---

### Task 8: Splash screen

**Files:**
- Create: `native/src/screens/SplashScreen.tsx`

**Interfaces:**
- Consumes: `TileIcon`, `Theme`.
- Produces: `SplashScreen` component, props `{ theme: Theme; onStart(): void }`. Task 13 wires this as the app's initial screen.

- [ ] **Step 1: Create `native/src/screens/SplashScreen.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';
import { TileIcon } from '../components/TileIcon';

export interface SplashScreenProps {
  theme: Theme;
  onStart(): void;
}

export function SplashScreen({ theme: t, onStart }: SplashScreenProps) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const scale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TileIcon size={132} />
      </Animated.View>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: t.ink, fontFamily: fontFamily.displayExtraBold }]}>MahMahMia</Text>
        <Text style={[styles.subtitle, { color: t.mut }]}>记分神器 · Game-night score tracker</Text>
      </View>
      <View style={styles.tags}>
        <Text style={[styles.tag, { color: t.gold, backgroundColor: t.field, borderColor: t.line }]}>麻将 Mahjong</Text>
        <Text style={[styles.tag, { color: t.gold, backgroundColor: t.field, borderColor: t.line }]}>拉米 Rummy</Text>
      </View>
      <Pressable onPress={onStart} style={[styles.startBtn, { backgroundColor: t.green }]}>
        <Text style={[styles.startText, { fontFamily: fontFamily.uiBold }]}>开局 · Start  →</Text>
      </Pressable>
      <Text style={[styles.footer, { color: t.sub }]}>Built for game nights · © 2026 NexvanceTech</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 32 },
  titleBlock: { alignItems: 'center' },
  title: { fontSize: 42, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 10, letterSpacing: 0.4, textAlign: 'center' },
  tags: { flexDirection: 'row', gap: 8 },
  tag: { fontSize: 12, fontWeight: '600', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  startBtn: {
    marginTop: 14, paddingVertical: 17, paddingHorizontal: 54, borderRadius: 16,
    shadowColor: '#2E7D4F', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  startText: { color: '#fff', fontSize: 18 },
  footer: { position: 'absolute', bottom: 40, fontSize: 12 },
});
```

- [ ] **Step 2: Commit**

```bash
git add native/src/screens/SplashScreen.tsx
git commit -m "feat(native): add SplashScreen"
```

(Verified visually together with the full app flow in Task 13.)

---

### Task 9: Restyle SetupScreen (segmented tabs, tile-avatar rows, blank-name default)

**Files:**
- Modify: `native/src/screens/SetupScreen.tsx` (full rewrite of the file's JSX/styles; the `start()`/`switchType()`/`setName()` logic changes only for the blank-name behavior called out below)

**Interfaces:**
- Consumes: `Theme`, `panelStyle` from `../theme`; `fontFamily` from `../fonts`.
- Produces: unchanged public props (`SetupScreenProps` gains one field: `theme: Theme`).

Behavior change from the source design (documented in Global Constraints): blank names default to the letter (A/B/C/D) instead of being required. Uniqueness validation now only applies to names the user actually typed (non-blank) — two blank fields both silently become distinct letters, never a collision.

- [ ] **Step 1: Replace `native/src/screens/SetupScreen.tsx`**

```tsx
import React, { useRef, useState } from 'react';
import {
  Alert, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { GameType } from '../types';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';

const LETTERS = ['A', 'B', 'C', 'D'];
const CN_ORDINAL = ['一', '二', '三', '四'];

export interface SetupScreenProps {
  theme: Theme;
  initialGameType: GameType;
  resume: { gameType: GameType; players: string[]; roundCount: number } | null;
  hasActiveGame: boolean;
  onStart(names: string[], gameType: GameType, playerCount: number): void;
  onResume(): void;
}

export function SetupScreen({ theme: t, initialGameType, resume, hasActiveGame, onStart, onResume }: SetupScreenProps) {
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

  const dispName = (i: number) => names[i].trim() || LETTERS[i];

  const start = () => {
    const resolved = names.slice(0, playerCount).map((_, i) => dispName(i));
    const typed = resolved.filter((_, i) => names[i].trim() !== '');
    if (new Set(typed).size !== typed.length) {
      setError('Names must be unique.');
      return;
    }
    if (new Set(resolved).size !== resolved.length) {
      setError('Names must be unique.');
      return;
    }
    setError('');
    const go = () => onStart(resolved, gameType, playerCount);
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
    <View style={styles.wrap}>
      <View>
        <Text style={[styles.eyebrow, { color: t.mut }]}>GAME TYPE · 玩法</Text>
        <View style={[styles.tabRow, { backgroundColor: t.field, borderColor: t.line }]}>
          {(['mahjong', 'rummy'] as GameType[]).map(type => {
            const active = gameType === type;
            return (
              <Pressable
                key={type}
                onPress={() => switchType(type)}
                style={[
                  styles.tab,
                  active && { backgroundColor: t.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
                ]}
              >
                <Text style={[styles.tabLabel, { color: active ? t.green : t.mut, fontFamily: fontFamily.uiBold }]}>
                  {type === 'mahjong' ? 'Mahjong' : 'Rummy'}
                </Text>
                <Text style={[styles.tabSub, { color: active ? t.green : t.mut }]}>
                  {type === 'mahjong' ? '麻将 · 3 players' : '拉米 · 4 players'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.eyebrow, { color: t.mut }]}>PLAYERS · 玩家</Text>
        <View style={styles.playerList}>
          {names.map((n, i) => (
            <View key={`${gameType}-${i}`} style={[styles.playerRow, { backgroundColor: t.card, borderColor: t.line }]}>
              <View style={[styles.avatar, { backgroundColor: t.greenT }]}>
                <Text style={[styles.avatarText, { color: t.green, fontFamily: fontFamily.displayExtraBold }]}>
                  {LETTERS[i]}
                </Text>
              </View>
              <TextInput
                ref={r => { inputRefs.current[i] = r; }}
                style={[styles.input, { color: t.ink, fontFamily: fontFamily.uiSemiBold }]}
                placeholder={`Player ${i + 1} · 玩家${CN_ORDINAL[i]}`}
                placeholderTextColor={t.sub}
                value={n}
                autoCorrect={false}
                onChangeText={v => setName(i, v)}
                returnKeyType={i === playerCount - 1 ? 'done' : 'next'}
                onSubmitEditing={() => {
                  if (i === playerCount - 1) start();
                  else inputRefs.current[i + 1]?.focus();
                }}
              />
            </View>
          ))}
        </View>
        <Text style={[styles.hint, { color: t.sub }]}>Leave blank to use A · B · C · D</Text>
      </View>

      {!!error && <Text style={[styles.error, { color: t.red }]}>{error}</Text>}

      {resume && (
        <Pressable style={[styles.resumeBanner, { backgroundColor: t.greenT, borderColor: t.green }]} onPress={onResume}>
          <Text style={[styles.resumeTitle, { color: t.ink, fontFamily: fontFamily.uiBold }]}>继续游戏 Resume</Text>
          <Text style={[styles.resumeDetail, { color: t.mut }]}>
            {resume.gameType === 'mahjong' ? 'Mahjong' : 'Rummy'} · {resume.players.join(', ')} · {resume.roundCount} transactions
          </Text>
        </Pressable>
      )}

      <Pressable style={[styles.startBtn, { backgroundColor: t.green }]} onPress={start}>
        <Text style={[styles.startBtnText, { fontFamily: fontFamily.uiBold }]}>Start Game · 开局  →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 22 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  tabRow: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 16, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center' },
  tabLabel: { fontSize: 16, lineHeight: 18 },
  tabSub: { fontSize: 11, marginTop: 3, fontWeight: '600' },
  playerList: { gap: 10 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 8 },
  avatar: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  input: { flex: 1, fontSize: 16, paddingVertical: 8, paddingHorizontal: 4, minHeight: 44 },
  hint: { fontSize: 12, marginTop: 10, paddingLeft: 4 },
  error: { fontSize: 14, marginTop: -8 },
  resumeBanner: { borderWidth: 1.5, borderRadius: 12, padding: 14 },
  resumeTitle: { fontWeight: '700' },
  resumeDetail: { fontSize: 13, marginTop: 4 },
  startBtn: {
    borderRadius: 16, padding: 18, minHeight: 48, alignItems: 'center',
    shadowColor: '#2E7D4F', shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  startBtnText: { color: '#fff', fontSize: 18 },
});
```

- [ ] **Step 2: Manual verification**

Deferred to Task 13 (needs `App.tsx` wired with the `theme` prop to render at all — this file alone won't compile standalone since `App.tsx` still passes the old prop shape until then). Proceed to commit.

- [ ] **Step 3: Commit**

```bash
git add native/src/screens/SetupScreen.tsx
git commit -m "feat(native): restyle SetupScreen — tabs, tile avatars, blank-name default"
```

---

### Task 10: Restyle ScoringScreen (standings, payer/receiver grid, keypad, preview, log, celebration)

**Files:**
- Modify: `native/src/screens/ScoringScreen.tsx` (full rewrite)

**Interfaces:**
- Consumes: `Theme`, `panelStyle` from `../theme`; `Keypad` from `../components/Keypad`; `Celebration`, `isBigWin` from `../components/Celebration`; `ScorePanel` (restyled in Task 11 — this task assumes `ScorePanel` already takes a `theme` prop, per Task 11's interface).
- Produces: `ScoringScreenProps` gains `theme: Theme`. Everything else in the prop signature (`onAddRound`, `onDeleteRound`, `onBack`, `onEndGame`) is unchanged — `App.tsx` (Task 13) doesn't need new wiring beyond passing `theme`.

Point entry keeps using `evalExpr` as the parser (still correct for plain digit strings the Keypad produces) — only the input *widget* changes from `TextInput` to `Keypad`, per the plan header's rationale. The payer/receiver/quick-amount/log logic is unchanged from the current file, only restyled.

- [ ] **Step 1: Replace `native/src/screens/ScoringScreen.tsx`**

```tsx
import React, { useState } from 'react';
import {
  Alert, Pressable, Share, StyleSheet, Text, View,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { ScorePanel } from '../components/ScorePanel';
import { Keypad } from '../components/Keypad';
import { Celebration, isBigWin } from '../components/Celebration';
import { AppBannerAd } from '../ads/AppBannerAd';
import { buildShareText, evalExpr, fmt, getRecentAmounts } from '../logic/game';
import { trackFeature } from '../analytics';
import { GameType, Round } from '../types';
import { Theme, panelStyle } from '../theme';
import { fontFamily } from '../fonts';

export interface ScoringScreenProps {
  theme: Theme;
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
  theme: t, players, gameType, rounds, gameStartTime,
  onAddRound, onDeleteRound, onBack, onEndGame,
}: ScoringScreenProps) {
  useKeepAwake();
  const [loser, setLoser] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [points, setPoints] = useState('');
  const [error, setError] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [celebration, setCelebration] = useState<{ name: string; points: number } | null>(null);

  const selectLoser = (name: string) => {
    setLoser(name);
    if (winner === name) setWinner(null);
  };

  const selectWinner = (name: string) => {
    if (name === loser) return;
    setWinner(name);
  };

  const pts = evalExpr(points);
  const valid = !!loser && !!winner && loser !== winner && pts > 0 && !isNaN(pts);

  const add = () => {
    if (!loser || !winner) {
      setError('Select who pays and who gets.');
      return;
    }
    if (!pts || pts <= 0 || isNaN(pts)) {
      setError('Enter a valid point amount.');
      return;
    }
    setError('');
    const winnerName = winner;
    setPoints('');
    onAddRound(loser, winner, pts);
    if (isBigWin(pts)) setCelebration({ name: winnerName, points: pts });
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
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <Pressable onPress={onBack} style={styles.ghostBtn}>
        <Text style={[styles.ghostText, { color: t.gold, fontFamily: fontFamily.uiSemiBold }]}>← Back to Setup</Text>
      </Pressable>

      <View style={styles.standingsHeader}>
        <Text style={[styles.eyebrow, { color: t.mut }]}>STANDINGS · 排名</Text>
        {rounds.length > 0 && (
          <Pressable onPress={share} style={[styles.shareBtn, { backgroundColor: t.field, borderColor: t.line }]}>
            <Text style={[styles.shareText, { color: t.mut }]}>↗ Share</Text>
          </Pressable>
        )}
      </View>
      <ScorePanel theme={t} players={players} rounds={rounds} showTitles flashKey={rounds.length} />

      <View style={panelStyle(t)}>
        <Text style={[styles.eyebrow, { color: t.mut }]}>WHO PAYS? · 谁付</Text>
        <View style={styles.grid3}>
          {players.map(p => (
            <Pressable
              key={`l-${p}`}
              onPress={() => selectLoser(p)}
              style={[
                styles.selBtn,
                { borderColor: t.line, backgroundColor: t.card },
                loser === p && { borderColor: t.red, backgroundColor: t.redT },
              ]}
            >
              <Text style={[styles.selBtnText, { color: loser === p ? t.red : t.ink, fontFamily: fontFamily.displayBold }]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.eyebrow, { color: t.mut, marginTop: 14 }]}>WHO GETS? · 谁收</Text>
        <View style={styles.grid3}>
          {players.map(p => (
            <Pressable
              key={`w-${p}`}
              onPress={() => selectWinner(p)}
              disabled={p === loser}
              style={[
                styles.selBtn,
                { borderColor: t.line, backgroundColor: t.card },
                winner === p && { borderColor: t.green, backgroundColor: t.greenT },
                p === loser && { opacity: 0.35 },
              ]}
            >
              <Text style={[styles.selBtnText, { color: winner === p ? t.green : t.ink, fontFamily: fontFamily.displayBold }]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {quickAmounts.length > 0 && (
          <>
            <Text style={[styles.eyebrow, { color: t.mut, marginTop: 14 }]}>QUICK · 快捷</Text>
            <View style={styles.grid3}>
              {quickAmounts.map(a => (
                <Pressable
                  key={a}
                  onPress={() => { trackFeature('quick_amount'); setPoints(String(a)); }}
                  style={[styles.quickChip, { backgroundColor: t.field, borderColor: t.line }]}
                >
                  <Text style={[styles.quickText, { color: t.gold, fontFamily: fontFamily.uiBold }]}>{a}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.eyebrow, { color: t.mut, marginTop: 14 }]}>POINTS · 点数</Text>
        <View style={[styles.pointsDisplay, { backgroundColor: t.field, borderColor: t.line }]}>
          <Text style={[styles.pointsText, { color: points ? t.ink : t.sub, fontFamily: fontFamily.displayExtraBold }]}>
            {points === '' ? '0' : points}
          </Text>
        </View>
        <View style={styles.keypadRow}>
          <Keypad theme={t} value={points} onChange={setPoints} />
        </View>
        <View style={styles.entryActions}>
          <Pressable onPress={() => setPoints('')} style={[styles.clearBtn, { borderColor: t.line, backgroundColor: t.card }]}>
            <Text style={[styles.clearText, { color: t.red }]}>C</Text>
          </Pressable>
          <Pressable
            onPress={add}
            disabled={!valid}
            style={[styles.addBtn, { backgroundColor: valid ? t.green : t.mut, opacity: valid ? 1 : 0.55 }]}
          >
            <Text style={[styles.addBtnText, { fontFamily: fontFamily.uiExtraBold }]}>Add · 记一笔</Text>
          </Pressable>
        </View>
        {!!error && <Text style={[styles.error, { color: t.red }]}>{error}</Text>}
      </View>

      {valid && (
        <View style={[styles.preview, { backgroundColor: t.green }]}>
          <Text style={[styles.previewName, { fontFamily: fontFamily.uiExtraBold }]}>{winner} 发财啦!</Text>
          <Text style={styles.previewSub}>{loser} → {winner} · {fmt(pts)} pts</Text>
        </View>
      )}

      <Pressable
        onPress={() => { trackFeature('log_view'); setLogOpen(o => !o); }}
        style={styles.logHeader}
      >
        <Text style={[styles.eyebrow, { color: t.mut, marginBottom: 0 }]}>LOG · 记录 ({rounds.length})</Text>
        <Text style={[styles.chevron, { color: t.mut }, logOpen && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
      </Pressable>
      {logOpen && (
        <View style={[styles.logCard, { backgroundColor: t.card, borderColor: t.line }]}>
          {rounds.length === 0 ? (
            <Text style={[styles.empty, { color: t.sub }]}>No entries yet · 还没有记录</Text>
          ) : (
            rounds.slice().reverse().map((r, i) => {
              const index = rounds.length - 1 - i;
              return (
                <View key={index} style={[styles.logRow, { borderBottomColor: t.line }]}>
                  <Text style={[styles.logText, { color: t.ink }]}>
                    #{index + 1}: {r.loser} → {r.winner}: {fmt(r.points)} pts
                  </Text>
                  <Pressable
                    onPress={() => { trackFeature('undo'); onDeleteRound(index); }}
                    hitSlop={8}
                  >
                    <Text style={[styles.deleteX, { color: t.red }]}>✕</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      )}

      <Pressable onPress={confirmEnd} style={styles.endBtn}>
        <Text style={[styles.endText, { color: t.red, fontFamily: fontFamily.uiBold }]}>End Game — Settle Up · 结算</Text>
      </Pressable>

      <AppBannerAd />

      {celebration && (
        <Celebration
          theme={t}
          winnerName={celebration.name}
          points={celebration.points}
          onDone={() => setCelebration(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  ghostBtn: { alignSelf: 'flex-start' },
  ghostText: { fontSize: 14 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  standingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  shareBtn: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  shareText: { fontSize: 14 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selBtn: { width: '31%', height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  selBtnText: { fontSize: 17 },
  quickChip: { flex: 1, minWidth: 80, paddingVertical: 12, borderRadius: 13, borderWidth: 1, alignItems: 'center' },
  quickText: { fontSize: 16 },
  pointsDisplay: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  pointsText: { fontSize: 30, letterSpacing: 0.4 },
  keypadRow: { marginTop: 10 },
  entryActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  clearBtn: { width: 72, height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 19, fontWeight: '800' },
  addBtn: { flex: 1, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 19 },
  error: { fontSize: 14, marginTop: 8 },
  preview: { borderRadius: 16, padding: 14, alignItems: 'center' },
  previewName: { color: '#fff', fontSize: 16 },
  previewSub: { color: '#fff', opacity: 0.9, fontSize: 13, marginTop: 3 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chevron: { fontSize: 14 },
  logCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginTop: -8 },
  empty: { padding: 24, textAlign: 'center', fontSize: 14 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  logText: { fontSize: 14, fontWeight: '600', flex: 1 },
  deleteX: { fontSize: 18, width: 30, height: 30, textAlign: 'center', textAlignVertical: 'center' },
  endBtn: { alignItems: 'center', paddingVertical: 8 },
  endText: { fontSize: 15 },
});
```

Note: the "Add" action's coin sound is already triggered by `App.tsx`'s `addRound` callback (see current `App.tsx:68`, unchanged in Task 13) — `ScoringScreen` itself doesn't need to play a sound, including on a big win; `addRound`'s existing `soundCoin()` already fires on every round.

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx tsc --noEmit`
Expected: no errors originating from `ScoringScreen.tsx` itself (errors from `ScorePanel.tsx`/`App.tsx` not yet updated are expected and resolved in Tasks 11/13 — re-run this same command after those to confirm zero errors project-wide).

- [ ] **Step 3: Commit**

```bash
git add native/src/screens/ScoringScreen.tsx
git commit -m "feat(native): restyle ScoringScreen — grid selectors, keypad, celebration"
```

---

### Task 11: Restyle ScorePanel + SettlementScreen

**Files:**
- Modify: `native/src/components/ScorePanel.tsx` (full rewrite)
- Modify: `native/src/screens/SettlementScreen.tsx` (full rewrite)

**Interfaces:**
- `ScorePanel` gains a `theme: Theme` prop (used by Task 10 already, per its call site above).
- `SettlementScreen` gains a `theme: Theme` prop.

- [ ] **Step 1: Replace `native/src/components/ScorePanel.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { fmt, getNetScores, getTitle, sortByScore } from '../logic/game';
import { Round } from '../types';
import { Theme, panelStyle } from '../theme';
import { fontFamily } from '../fonts';

interface Props {
  theme: Theme;
  players: string[];
  rounds: Round[];
  showTitles: boolean;
  flashKey?: number;
}

export function ScorePanel({ theme: t, players, rounds, showTitles, flashKey }: Props) {
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
    outputRange: [t.gold + '00', t.gold],
  });

  const scoreColor = (s: number) => (s > 0 ? t.green : s < 0 ? t.red : t.ink);

  return (
    <Animated.View style={[panelStyle(t), styles.panel, { borderTopColor: t.gold, borderColor }]}>
      {sorted.map((p, i) => {
        const s = scores[p];
        const title = getTitle(s, p === top, p === bottom);
        return (
          <View key={p} style={[styles.row, i < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.line }]}>
            <View style={styles.rowTop}>
              <Text style={[styles.name, { color: scoreColor(s), fontFamily: fontFamily.displayExtraBold }]}>{p}</Text>
              <Text style={[styles.score, { color: scoreColor(s), fontFamily: fontFamily.displayExtraBold }]}>
                {s > 0 ? '+' : ''}{fmt(s)}
              </Text>
            </View>
            {showTitles && rounds.length > 0 && (
              <Text style={[styles.title, { color: scoreColor(s) }]}>
                {title.emoji} {title.text}
              </Text>
            )}
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 3, borderWidth: 2 },
  row: { paddingVertical: 10 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 20 },
  score: { fontSize: 22 },
  title: { fontSize: 12.5, marginTop: 3, opacity: 0.9, fontWeight: '600' },
});
```

Note: `t.gold + '00'` produces a transparent variant only when `t.gold` is a 7-char `#RRGGBB` hex (true for both palettes here — `#BE842A` → `#BE842A00`, `#D8A64E` → `#D8A64E00`), giving an 8-digit `#RRGGBBAA` RN accepts for a fully-transparent starting border. This replaces the old hardcoded `rgba(196,135,59,0)` which encoded the pre-redesign gold value.

- [ ] **Step 2: Replace `native/src/screens/SettlementScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScorePanel } from '../components/ScorePanel';
import { calculateSettlement, fmt, getNetScores, settlementFlavor, sortByScore } from '../logic/game';
import { Round } from '../types';
import { Theme, panelStyle } from '../theme';
import { fontFamily } from '../fonts';

export interface SettlementScreenProps {
  theme: Theme;
  players: string[];
  rounds: Round[];
  onBackToScoring(): void;
  onNewGame(): void;
}

export function SettlementScreen({ theme: t, players, rounds, onBackToScoring, onNewGame }: SettlementScreenProps) {
  const scores = getNetScores(players, rounds);
  const sorted = sortByScore(players, scores);
  const transfers = calculateSettlement(scores);
  const [flavor] = useState(() =>
    settlementFlavor(sorted[0], sorted[sorted.length - 1], transfers.length > 0)
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.gameOver, { color: t.gold, fontFamily: fontFamily.displayExtraBold }]}>Game Over! · 收工</Text>
        <Text style={[styles.flavor, { color: t.mut }]}>{flavor}</Text>
      </View>

      <Text style={[styles.eyebrow, { color: t.mut }]}>FINAL SCORES · 最终得分</Text>
      <ScorePanel theme={t} players={players} rounds={rounds} showTitles={false} />

      <Text style={[styles.eyebrow, { color: t.mut }]}>WHO PAYS WHO · 谁付谁</Text>
      <View style={panelStyle(t)}>
        {transfers.length === 0 ? (
          <Text style={[styles.even, { color: t.green }]}>大家打平了！</Text>
        ) : (
          transfers.map((tr, i) => (
            <View key={i} style={[styles.transferRow, i < transfers.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.line }]}>
              <Text style={[styles.from, { color: t.red, fontFamily: fontFamily.displayBold }]}>{tr.from}</Text>
              <Text style={[styles.arrow, { color: t.mut }]}>→</Text>
              <Text style={[styles.to, { color: t.green, fontFamily: fontFamily.displayBold }]}>{tr.to}</Text>
              <Text style={[styles.amount, { color: t.ink, fontFamily: fontFamily.displayExtraBold }]}>{fmt(tr.amount)} pts</Text>
            </View>
          ))
        )}
      </View>

      <Pressable style={[styles.btn, { backgroundColor: t.gold }]} onPress={onBackToScoring}>
        <Text style={[styles.btnText, { fontFamily: fontFamily.uiBold }]}>← Back to Scoring</Text>
      </Pressable>
      <Pressable style={[styles.btn, { backgroundColor: t.red }]} onPress={onNewGame}>
        <Text style={[styles.btnText, { fontFamily: fontFamily.uiBold }]}>New Game · 再来一局</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  header: { alignItems: 'center', marginBottom: 8 },
  gameOver: { fontSize: 32, letterSpacing: -0.2 },
  flavor: { fontSize: 15, marginTop: 6 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: -4 },
  even: { textAlign: 'center', padding: 8, fontSize: 14 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  from: { fontSize: 18 },
  arrow: {},
  to: { fontSize: 18 },
  amount: { marginLeft: 'auto', fontSize: 19 },
  btn: { borderRadius: 16, padding: 17, minHeight: 48, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17 },
});
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx tsc --noEmit`
Expected: no errors from these two files or `ScoringScreen.tsx`. Remaining errors, if any, come only from `App.tsx` — resolved next task.

- [ ] **Step 4: Commit**

```bash
git add native/src/components/ScorePanel.tsx native/src/screens/SettlementScreen.tsx
git commit -m "feat(native): restyle ScorePanel and SettlementScreen"
```

---

### Task 12: Restyle Snackbar

**Files:**
- Modify: `native/src/components/Snackbar.tsx`

**Interfaces:**
- `Snackbar` gains a `theme: Theme` prop. `SnackbarHandle` (the imperative `.show()` API) is unchanged — `App.tsx` keeps calling `snackbar.current?.show(...)` exactly as today.

- [ ] **Step 1: Modify `native/src/components/Snackbar.tsx`**

Replace the import line and component signature:

```tsx
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Theme } from '../theme';

export interface SnackbarHandle {
  show(fun: string, detail: string): void;
}

interface Props {
  theme: Theme;
}

export const Snackbar = forwardRef<SnackbarHandle, Props>(({ theme: t }, ref) => {
```

(the body of the function — `msg`/`opacity`/`hideTimer` state, `useImperativeHandle`, and the `if (!msg) return null;` guard — is unchanged from the current file). Replace only the final `return` JSX and the `styles.bar` color:

```tsx
  if (!msg) return null;
  return (
    <Animated.View style={[styles.bar, { opacity, backgroundColor: t.green }]} pointerEvents="none">
      {msg.fun ? <Text style={styles.fun}>{msg.fun}</Text> : null}
      <Text style={styles.detail}>{msg.detail}</Text>
    </Animated.View>
  );
});
```

And drop `backgroundColor: colors.green` from the `bar` entry in `StyleSheet.create` (now applied inline above) — the rest of `styles` is unchanged.

- [ ] **Step 2: Commit**

```bash
git add native/src/components/Snackbar.tsx
git commit -m "feat(native): theme-aware Snackbar"
```

---

### Task 13: Wire it all together in App.tsx

**Files:**
- Modify: `native/App.tsx` (full rewrite)

**Interfaces:**
- Consumes everything produced by Tasks 1–12.

- [ ] **Step 1: Replace `native/App.tsx`**

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { SplashScreen } from './src/screens/SplashScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { ScoringScreen } from './src/screens/ScoringScreen';
import { SettlementScreen } from './src/screens/SettlementScreen';
import { Header } from './src/components/Header';
import { Snackbar, SnackbarHandle } from './src/components/Snackbar';
import { funToast, fmt } from './src/logic/game';
import { saveState, restoreState, clearState, savePrefs, restorePrefs } from './src/storage';
import { logGameEnd, resetFeatures } from './src/analytics';
import { initSounds, soundCoin, soundDelete, soundSettle, setSoundEnabled } from './src/sounds';
import { loadInterstitial, showInterstitial } from './src/ads/interstitial';
import { GameState, GameType } from './src/types';
import { getTheme } from './src/theme';
import { useAppFonts } from './src/fonts';

type Screen = 'loading' | 'splash' | 'setup' | 'scoring' | 'settlement';

const FRESH: GameState = {
  gameType: 'mahjong', playerCount: 3, players: [], rounds: [], gameStartTime: Date.now(),
};

export default function App() {
  const fontsLoaded = useAppFonts();
  const [game, setGame] = useState<GameState>(FRESH);
  const [screen, setScreen] = useState<Screen>('loading');
  const [dark, setDark] = useState(false);
  const [sound, setSound] = useState(true);
  const snackbar = useRef<SnackbarHandle>(null);
  const theme = getTheme(dark);

  useEffect(() => {
    initSounds(); // fire-and-forget: play functions no-op until ready
    loadInterstitial(); // fire-and-forget: preload so an ad is ready before it's needed
    (async () => {
      const [saved, prefs] = await Promise.all([restoreState(), restorePrefs()]);
      setDark(prefs.dark);
      setSound(prefs.sound);
      setSoundEnabled(prefs.sound);
      if (saved) setGame(saved);
      setScreen('splash');
    })().catch(() => setScreen('splash'));
  }, []);

  const resolvedDestination: Screen = game.players.length > 0 && game.rounds.length > 0 ? 'scoring' : 'setup';

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'scoring') { setScreen('setup'); return true; }
      if (screen === 'settlement') { setScreen('scoring'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const toggleDark = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      savePrefs({ dark: next, sound });
      return next;
    });
  }, [sound]);

  const toggleSound = useCallback(() => {
    setSound(prev => {
      const next = !prev;
      setSoundEnabled(next);
      savePrefs({ dark, sound: next });
      return next;
    });
  }, [dark]);

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
    showInterstitial(); // fire-and-forget: no-ops silently if not preloaded yet
  }, [game]);

  const newGame = useCallback(() => {
    clearState();
    setGame({ ...FRESH, gameStartTime: Date.now() });
    setScreen('setup');
    showInterstitial(); // fire-and-forget: no-ops silently if not preloaded yet
  }, []);

  if (!fontsLoaded || screen === 'loading') return null;

  if (screen === 'splash') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <SplashScreen theme={theme} onStart={() => setScreen(resolvedDestination)} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const hasActiveGame = game.rounds.length > 0 && game.players.length > 0;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Header theme={theme} dark={dark} sound={sound} onToggleDark={toggleDark} onToggleSound={toggleSound} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.screenBody}>
              {screen === 'setup' && (
                <SetupScreen
                  theme={theme}
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
                  theme={theme}
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
                  theme={theme}
                  players={game.players}
                  rounds={game.rounds}
                  onBackToScoring={() => setScreen('scoring')}
                  onNewGame={newGame}
                />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <Snackbar theme={theme} ref={snackbar} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, maxWidth: 420, width: '100%', alignSelf: 'center' },
  screenBody: { paddingBottom: 24 },
});
```

Notes on behavior preserved vs. changed from the current file:
- Cold-launch flow changes from `loading → setup|scoring` to `loading → splash`, and tapping Start on the splash screen goes to whatever `resolvedDestination` would have been (`scoring` if a valid saved game exists, else `setup`) — same effective destination as today, just gated behind the new intro screen.
- The AdMob banner (`<AppBannerAd />`) moved from being rendered by `App.tsx` only on the scoring screen to being rendered by `ScoringScreen` itself (Task 10) — same effective placement (only visible during scoring), now colocated with the screen that owns it. Remove the now-unused `AppBannerAd` import from `App.tsx` if your editor flags it (it's intentionally no longer imported here).
- `Text`/`h1`/`subtitle`/`footer` styles are gone — replaced by `Header` (Task 5) and `SplashScreen`'s footer (Task 8).

- [ ] **Step 2: Typecheck the whole project**

Run: `cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx tsc --noEmit`
Expected: zero errors. If any remain, they name the exact file/line — fix before proceeding (most likely cause: a stray prop rename or missed `theme` prop on a call site introduced in Tasks 9–12).

- [ ] **Step 3: Run the full test suite**

Run: `npx jest`
Expected: all suites pass — `game.test.ts`, `storage.test.ts` (incl. new prefs tests), `analytics.test.ts`, `theme.test.ts`, `sounds.test.ts`, `Keypad.test.ts`, `Celebration.test.ts`.

- [ ] **Step 4: Manual verification — full flow, both themes**

```bash
npx expo start --web
```

Walk through, in the browser:
1. Splash screen renders (icon, title, two pill tags, green Start button). Tap Start → lands on Setup.
2. Setup: tap Rummy tab (4 rows appear), tap Mahjong tab (back to 3). Leave one name blank, fill the others, tap Start Game → lands on Scoring, blank slot shows its letter (A/B/C/D) in Standings.
3. Scoring: tap a "Who pays" button, tap a different "Who gets" button, enter points on the keypad, tap Add. Row appears in Standings, a preview banner appeared before adding, log count increments. Enter a value ≥ 3000 and Add → confetti overlay appears and auto-dismisses after ~2.3s.
4. Tap the moon icon in the header → whole app switches to the dark palette (bg near-black, text cream). Tap the speaker icon → toggles between 🔊/🔇 (no way to hear sound in a browser, just confirm the icon and the state persists across the toggle).
5. End Game → Settlement screen shows final scores + who-pays-who, styled to match. New Game → back to Setup with a fresh game.

Report which of these you could and couldn't verify — this is a browser preview of a native app; haptics, real AdMob creatives, and true font rendering only exist on-device.

- [ ] **Step 5: Commit**

```bash
git add native/App.tsx
git commit -m "feat(native): wire redesigned screens into App.tsx — splash flow, dark/sound toggles"
```

---

### Task 14: Regenerate app icon, adaptive icon, and splash image

**Files:**
- Modify: `native/scripts/generate-icons.mjs`
- Modify: `native/app.json` (background colors only)
- Modify (generated, binary): `native/assets/icon.png`, `native/assets/adaptive-icon.png`, `native/assets/splash-icon.png`

**Interfaces:** none (build-time asset generation, no runtime code consumes this task's output besides Expo's own icon/splash pipeline reading `app.json` paths, which are unchanged).

CJK glyph rendering via `sharp`/librsvg was confirmed working on this machine during planning (a `中` character rendered correctly at 300px in a quick throwaway test) — no fallback-raster path is needed for the new icon, unlike the old `favicon.svg`-based one.

- [ ] **Step 1: Replace `native/scripts/generate-icons.mjs`**

```js
import sharp from 'sharp';

// New brand mark: a cream mahjong tile bearing the 中 (zhōng) character, on a
// jade gradient. See docs/superpowers/plans/2026-07-19-native-app-redesign.md
// and the TileIcon.dc.html source design for the origin of these proportions.

// App Store / home-screen icon: Apple and Google both require this file to be a
// fully opaque, edge-to-edge square with NO transparency and no self-rounded
// corners — the OS applies its own mask on top. So this variant fills the full
// canvas with the gradient (no squircle rounding of its own).
const ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#41946A"/>
      <stop offset="100%" stop-color="#1C6440"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <rect x="256" y="176" width="512" height="676" rx="102" fill="#FCF8EF"/>
  <text x="512" y="614" text-anchor="middle" font-size="390" font-family="serif" font-weight="900" fill="#C0392B">中</text>
</svg>`;

// Android adaptive foreground: just the tile card + character, transparent
// around it — the system composites this over a solid background color
// (set in app.json) and masks the combined result to the launcher's shape.
const FOREGROUND_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect x="286" y="196" width="452" height="596" rx="90" fill="#FCF8EF"/>
  <text x="512" y="590" text-anchor="middle" font-size="344" font-family="serif" font-weight="900" fill="#C0392B">中</text>
</svg>`;

// Splash icon: the full rounded squircle mark (matches the in-app TileIcon
// component), sitting on the splash background color set in app.json.
const SPLASH_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="15%" y1="0%" x2="85%" y2="100%">
      <stop offset="0%" stop-color="#41946A"/>
      <stop offset="100%" stop-color="#1C6440"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#g)"/>
  <rect x="128" y="88" width="256" height="338" rx="51" fill="#FCF8EF"/>
  <text x="256" y="307" text-anchor="middle" font-size="195" font-family="serif" font-weight="900" fill="#C0392B">中</text>
</svg>`;

await sharp(Buffer.from(ICON_SVG), { density: 384 })
  .resize(1024, 1024)
  .flatten({ background: '#1C6440' })
  .png()
  .toFile('assets/icon.png');

await sharp(Buffer.from(FOREGROUND_SVG), { density: 384 })
  .resize(1024, 1024)
  .png()
  .toFile('assets/adaptive-icon.png');

await sharp(Buffer.from(SPLASH_SVG), { density: 384 })
  .resize(512, 512)
  .png()
  .toFile('assets/splash-icon.png');

console.log('wrote icon.png, adaptive-icon.png, splash-icon.png');
```

- [ ] **Step 2: Run the generator**

```bash
cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && node scripts/generate-icons.mjs
```

Expected output: `wrote icon.png, adaptive-icon.png, splash-icon.png`.

- [ ] **Step 3: Eyeball the three generated files**

Open `native/assets/icon.png`, `native/assets/adaptive-icon.png`, `native/assets/splash-icon.png` (e.g. via the Read tool, or Finder quick-look). Expected: `icon.png` is a full-bleed jade-gradient square with a centered cream tile and a clean red 中 (no tofu/blank boxes — if the glyph is missing, sharp/librsvg on this machine can't rasterize CJK text and the icon SVGs need to switch to vector paths, same issue the old script's comment already flags for 發). `adaptive-icon.png` is the tile+character on a transparent background. `splash-icon.png` is the same mark as a self-rounded squircle.

- [ ] **Step 4: Update `native/app.json` background colors to match the new palette**

Change:
```json
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#f5f0e8"
      },
```
to:
```json
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2E7D4F"
      },
```

Change:
```json
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#f5f0e8"
        }
      ],
```
to:
```json
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#F1E8DB"
        }
      ],
```

(Android adaptive-icon background is jade `#2E7D4F` because the foreground artwork has no background of its own, per Step 1's comment — this reproduces the gradient's midtone as a flat color, since Android adaptive icons don't support gradients. The OS-level splash screen background is the new cream `#F1E8DB` to match the in-app `bg` token.)

- [ ] **Step 5: Commit**

```bash
git add native/scripts/generate-icons.mjs native/app.json native/assets/icon.png native/assets/adaptive-icon.png native/assets/splash-icon.png
git commit -m "feat(native): regenerate app icon/splash for the new jade tile brand mark"
```

---

### Task 15: Final full-suite verification and handoff notes

**Files:** none — verification only.

- [ ] **Step 1: Full test suite**

```bash
cd "/Users/tinghooi/Work/In Progress/mahmahmia/native" && npx jest && npx tsc --noEmit
```

Expected: all tests pass, zero type errors.

- [ ] **Step 2: Confirm no web-app files changed**

```bash
cd "/Users/tinghooi/Work/In Progress/mahmahmia" && git status --short . ':!native'
```

Expected: empty output — nothing outside `native/` touched, per the "native only" scope decision.

- [ ] **Step 3: Tell the user explicitly what is and isn't verified**

State plainly (this is not a code step, it's the required handoff message): all of this was checked via `expo start --web` in a browser and `jest`/`tsc` — neither exercises real device fonts, haptics, real AdMob ad creatives, dark-mode status-bar behavior, or how the new confetti animation performs on actual hardware. Per the existing project memory, there's no iOS simulator on this machine either. The user needs to run this on their physical iPhone/Android (EAS dev build, same as the pending Task 12 from the original store-submission plan) before treating the redesign as store-ready.
