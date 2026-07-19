# iPad Universal Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the iPhone-only Expo app into a universal app that looks designed for iPad — scaled-up single column on iPhone/iPad-portrait, and a two-column landscape layout on the Scoring screen — without changing iPhone appearance.

**Architecture:** One pure, unit-tested module (`src/responsive.ts`) maps the live window size to a layout descriptor (`compact` / `roomy` / `twoCol`) and a `scale()` helper that is the **identity function on iPhone** (so iPhone is byte-identical). Components read it via a `useLayout()` hook and apply scaled values as additive inline overrides on top of the existing static styles. `App.tsx` widens its centered content on tablet and, for wide iPad landscape only, renders the Scoring screen full-width outside its ScrollView so Scoring can lay out two independently-scrolling columns. iPad rotation is enabled via an iPad-only Info.plist key; iPhone and Android stay portrait-locked.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, Jest (jest-expo preset), react-native-google-mobile-ads 16.

## Global Constraints

- **Expo SDK is v57** — read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before touching config; do not assume older APIs (`native/AGENTS.md`).
- **iPhone must stay byte-identical.** The `scale()` helper returns its input unchanged when `compact` (width < 700), and `maxWidth` stays 420. All tablet sizing is additive inline overrides — never edit or remove existing `StyleSheet.create` values or `panelStyle()` constants.
- **Orientation:** keep global `"orientation": "portrait"` in `app.json`. Add **only** `ios.infoPlist["UISupportedInterfaceOrientations~ipad"]`. **Never** add the base `UISupportedInterfaceOrientations` key — `@expo/config-plugins@57` skips portrait-locking iPhone if the base key exists.
- **No game-logic / copy / color / font changes.** Layout only.
- **Every component reads size via `useLayout()` internally** — no `layout` prop threading. `App.tsx` also calls `useLayout()` to pick the two-column branch; all calls agree within a render.
- **Thresholds live only in `src/responsive.ts`:** `compact` width < 700; `roomy` width ≥ 700; `twoCol` width ≥ 900 **and** landscape. Scale factor 1.25.
- **Commit after each task.** Repo convention is commit straight to `main`; the executing session may branch if it prefers. TypeScript check is `npx tsc --noEmit` (run from `native/`); tests are `npm test`.
- **UI correctness is proven on a physical iPad (Task 9), not by unit tests.** For UI tasks, "passing" means `npx tsc --noEmit` clean + existing `npm test` suite green (no regressions) — not visual verification.

All commands below run from the `native/` directory.

---

## File Structure

- **Create** `native/src/responsive.ts` — pure `layoutFor()` + `scale`, thresholds, and the `useLayout()` hook. Foundation; imported everywhere.
- **Create** `native/src/__tests__/responsive.test.ts` — unit tests incl. the iPhone byte-identical invariant.
- **Modify** `native/app.json` — `supportsTablet: true`, iPad orientations, version bump.
- **Modify** `native/src/ads/AppBannerAd.tsx` — remount on rotation, center in full-width slot, reserve height.
- **Modify** `native/src/components/{Keypad,ScorePanel,Header}.tsx` — scale sizes.
- **Modify** `native/src/screens/SplashScreen.tsx`, `native/src/components/Celebration.tsx` — scale sizes + confetti fall distance from screen height.
- **Modify** `native/src/screens/{SetupScreen,SettlementScreen}.tsx` — scale sizes.
- **Modify** `native/src/screens/ScoringScreen.tsx` — scale sizes + two-column landscape layout.
- **Modify** `native/App.tsx` — responsive `maxWidth`; render Scoring full-width in `twoCol`.

---

### Task 1: Responsive module + iPhone-identical invariant

**Files:**
- Create: `native/src/responsive.ts`
- Test: `native/src/__tests__/responsive.test.ts`

**Interfaces:**
- Produces:
  - `interface Layout { width; height; isLandscape; compact; roomy; twoCol; maxWidth; scale(base: number): number }`
  - `function layoutFor(win: { width: number; height: number }): Layout` (pure)
  - `function useLayout(): Layout` (wraps `useWindowDimensions()`)
  - consts `COMPACT_MAX = 700`, `TWO_COL_MIN = 900`, `TABLET_SCALE = 1.25`

- [ ] **Step 1: Write the failing test**

Create `native/src/__tests__/responsive.test.ts`:

```ts
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

describe('scale — iPhone byte-identical invariant', () => {
  // Frozen snapshot: every fixed size the app renders. scale() must not change
  // any of these on iPhone (compact). If this list drifts, iPhone drifted.
  const BASE_SIZES = [11, 12, 12.5, 13, 14, 15, 16, 17, 18, 19, 20, 22, 30, 32, 34, 40, 42, 48, 52, 56, 76, 132];

  it('is identity in compact (iPhone unchanged)', () => {
    const l = layoutFor({ width: 390, height: 844 });
    for (const b of BASE_SIZES) expect(l.scale(b)).toBe(b);
    expect(l.maxWidth).toBe(420);
  });

  it('scales up by 1.25 on tablet, rounded', () => {
    const l = layoutFor({ width: 1194, height: 834 });
    expect(l.scale(16)).toBe(20);
    expect(l.scale(20)).toBe(25);
    expect(l.scale(56)).toBe(70);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- responsive`
Expected: FAIL — `Cannot find module '../responsive'`.

- [ ] **Step 3: Write the module**

Create `native/src/responsive.ts`:

```ts
import { useWindowDimensions } from 'react-native';

export const COMPACT_MAX = 700; // width < this → phone-style single column
export const TWO_COL_MIN = 900; // width ≥ this AND landscape → two columns
export const TABLET_SCALE = 1.25;

export interface Layout {
  width: number;
  height: number;
  isLandscape: boolean;
  compact: boolean;
  roomy: boolean;
  twoCol: boolean;
  maxWidth: number;
  /** Identity on phone (compact); ×1.25 rounded on tablet. */
  scale(base: number): number;
}

export function layoutFor(win: { width: number; height: number }): Layout {
  const { width, height } = win;
  const isLandscape = width > height;
  const compact = width < COMPACT_MAX;
  const roomy = !compact;
  const twoCol = width >= TWO_COL_MIN && isLandscape;
  const maxWidth = compact ? 420 : 640;
  const scale = (base: number) => (compact ? base : Math.round(base * TABLET_SCALE));
  return { width, height, isLandscape, compact, roomy, twoCol, maxWidth, scale };
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return layoutFor({ width, height });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- responsive`
Expected: PASS (all cases).

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/responsive.ts src/__tests__/responsive.test.ts
git commit -m "feat(native): add responsive layout module (iPad breakpoints + scale)"
```

Expected: `tsc` prints nothing (clean).

---

### Task 2: Enable iPad — tablet support + orientation

**Files:**
- Modify: `native/app.json`

**Interfaces:** none (config only).

- [ ] **Step 1: Edit `ios` block**

In `native/app.json`, replace the `ios` block:

```json
    "ios": {
      "bundleIdentifier": "com.nexvancetech.mahmahmia",
      "supportsTablet": false,
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
```

with:

```json
    "ios": {
      "bundleIdentifier": "com.nexvancetech.mahmahmia",
      "supportsTablet": true,
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ]
      }
    },
```

Leave the top-level `"orientation": "portrait"` line unchanged. Do **not** add a base `UISupportedInterfaceOrientations` key.

- [ ] **Step 2: Bump the app version**

In `native/app.json`, change `"version": "1.0.0"` to `"version": "1.1.0"` (feature release).

- [ ] **Step 3: Verify the config resolves**

Run: `npx expo config --type public > /dev/null && echo OK`
Expected: prints `OK` (config parses; no schema error). If `expo config` is unavailable offline, instead run `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8')); console.log('valid json')"` and confirm `valid json`.

- [ ] **Step 4: Commit**

```bash
git add app.json
git commit -m "feat(native): enable iPad support + iPad-only rotation, bump to 1.1.0"
```

> Orientation behavior (iPhone/Android portrait-locked, iPad rotates) is confirmed at the config layer; verify visually on the physical iPad in Task 9.

---

### Task 3: Banner ad — re-fit on rotation, center full-width

**Files:**
- Modify: `native/src/ads/AppBannerAd.tsx`

**Interfaces:**
- Consumes: nothing new (`AppBannerAd` keeps its zero-prop signature).

Rationale: the adaptive banner computes a fixed pixel size once at load from the current screen width and never re-requests. Remounting it (via a `key` that flips with orientation) forces a fresh request at the new width; the wrapper centers the fixed-width creative and reserves height so the load doesn't jump the layout.

- [ ] **Step 1: Replace the component**

Replace the entire body of `native/src/ads/AppBannerAd.tsx`:

```tsx
import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_UNIT_ID } from './config';

export function AppBannerAd() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  return (
    <View style={{ alignItems: 'center', minHeight: 50 }}>
      <BannerAd
        // Remount on rotation so the adaptive banner re-requests the correct
        // width — it caches a fixed pixel size from its first load otherwise.
        key={isLandscape ? 'land' : 'port'}
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
```

- [ ] **Step 2: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` clean; existing test suite green (no new tests — banner rendering is verified on-device in Task 9).

- [ ] **Step 3: Commit**

```bash
git add src/ads/AppBannerAd.tsx
git commit -m "fix(native): re-fit banner ad on rotation, center in full-width slot"
```

---

### Task 4: Scale shared components (Keypad, ScorePanel, Header)

**Files:**
- Modify: `native/src/components/Keypad.tsx`, `native/src/components/ScorePanel.tsx`, `native/src/components/Header.tsx`

**Interfaces:**
- Consumes: `useLayout` from `../responsive`.

Recipe for every file below: add `import { useLayout } from '../responsive';`, add `const s = useLayout();` as the first line of the component body, then wrap each listed size with `s.scale(...)` as an **inline override** appended to the existing style array. Do not modify the `StyleSheet.create` blocks. In compact, `s.scale(x) === x`, so iPhone is unchanged.

- [ ] **Step 1: Keypad** — in `Keypad.tsx`, the key `Pressable` and its `Text`:

```tsx
// add s = useLayout() at top of Keypad(); then:
style={[styles.key, { height: s.scale(56), borderColor: t.line, backgroundColor: t.card }]}
// key text:
style={[styles.keyText, { color: t.ink, fontFamily: fontFamily.displayBold, fontSize: s.scale(22) }]}
```

(Leave `width: '31%'` in `styles.key` — percentage widths are already responsive.)

- [ ] **Step 2: ScorePanel** — in `ScorePanel.tsx`, scale the two font sizes and the panel padding. **Shadowing note:** ScorePanel already uses `s` as the per-player score number inside `.map`, so name the layout hook `sz` here: add `const sz = useLayout();` at top and use `sz.scale(...)`. Change:
  - the outer `Animated.View`: append `padding: sz.scale(16)` to override `panelStyle(t)`'s padding.
  - name `Text`: append `fontSize: sz.scale(20)`.
  - score `Text`: append `fontSize: sz.scale(22)`.
  - title `Text`: append `fontSize: sz.scale(12.5)` (leave the existing `color: scoreColor(s)` — `s` there is the per-player score, unchanged).

- [ ] **Step 3: Header** — in `Header.tsx`, add `const s = useLayout();` at top, then:
  - `<TileIcon size={34} />` → `<TileIcon size={s.scale(34)} />`
  - title `Text`: append `fontSize: s.scale(19), lineHeight: s.scale(22)`
  - subtitle `Text`: append `fontSize: s.scale(11)`
  - both icon `Pressable`s: append `width: s.scale(40), height: s.scale(40)` to the inline style
  - both `iconGlyph` `Text`s: `style={[styles.iconGlyph, { fontSize: s.scale(16) }]}`

- [ ] **Step 4: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` clean; suite green (Keypad's `pressKey` test unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/components/Keypad.tsx src/components/ScorePanel.tsx src/components/Header.tsx
git commit -m "feat(native): scale shared components on tablet"
```

---

### Task 5: Scale Splash + fix Celebration for tall screens

**Files:**
- Modify: `native/src/screens/SplashScreen.tsx`, `native/src/components/Celebration.tsx`

**Interfaces:**
- Consumes: `useLayout` from `../responsive`.

- [ ] **Step 1: SplashScreen** — add `const s = useLayout();` at top, then:
  - `<TileIcon size={132} />` → `<TileIcon size={s.scale(132)} />`
  - title `Text`: append `fontSize: s.scale(42)`
  - subtitle `Text`: append `fontSize: s.scale(15)`
  - `startText` `Text`: append `fontSize: s.scale(18)`
  - each `tag` `Text`: append `fontSize: s.scale(12)`

- [ ] **Step 2: Celebration — scale confetti fall distance from screen height + glyphs**

The confetti fall distance is hardcoded to `860`, so on a tall iPad it stops mid-screen. In `Celebration.tsx`:
  - add `import { useLayout } from '../responsive';` and `const s = useLayout();` at the top of `Celebration()`.
  - change the piece `translateY` interpolation to fall past the real screen height:

```tsx
const translateY = p.fall.interpolate({ inputRange: [0, 1], outputRange: [-40, s.height + 80] });
```

  - scale the center block glyphs: emoji `Text` append `fontSize: s.scale(76), lineHeight: s.scale(80)`; `text` (赢麻了!) append `fontSize: s.scale(48)`; `sub` append `fontSize: s.scale(20)`.
  - scale each piece's size at creation is unnecessary (already random 20–38); leave `makePieces()` untouched.

- [ ] **Step 3: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` clean; suite green (`isBigWin` test unaffected).

- [ ] **Step 4: Commit**

```bash
git add src/screens/SplashScreen.tsx src/components/Celebration.tsx
git commit -m "feat(native): scale splash + make confetti fall full iPad height"
```

---

### Task 6: Scale Setup + Settlement

**Files:**
- Modify: `native/src/screens/SetupScreen.tsx`, `native/src/screens/SettlementScreen.tsx`

**Interfaces:**
- Consumes: `useLayout` from `../responsive`.

These stay single-column; `App.tsx` (Task 8) widens the column to 640 on tablet, and these size overrides scale their contents.

- [ ] **Step 1: SetupScreen** — add `const s = useLayout();` at top, then append `fontSize: s.scale(N)` to the inline style of each text/element (current value → scaled):
  - `tabLabel` 16, `tabSub` 11, `avatarText` 18, `input` 16, `hint` 12, `startBtnText` 18, `error` 14, `resumeTitle` (append `fontSize: s.scale(15)`), `resumeDetail` 13.
  - avatar box: append `width: s.scale(40), height: s.scale(40)` to the avatar `View` inline style.
  - `input` minHeight: append `minHeight: s.scale(44)`.

- [ ] **Step 2: SettlementScreen** — add `const s = useLayout();` at top, then:
  - `gameOver` 32, `flavor` 15, `from` 18, `to` 18, `amount` 19, `btnText` 17, `even` 14 → append `fontSize: s.scale(N)` to each element's inline style.
  - the `panelStyle(t)` `View`: append `padding: s.scale(16)`.

- [ ] **Step 3: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` clean; suite green.

- [ ] **Step 4: Commit**

```bash
git add src/screens/SetupScreen.tsx src/screens/SettlementScreen.tsx
git commit -m "feat(native): scale setup + settlement on tablet"
```

---

### Task 7: Scoring screen — scale + two-column landscape layout

**Files:**
- Modify: `native/src/screens/ScoringScreen.tsx`

**Interfaces:**
- Consumes: `useLayout` from `../responsive`.
- Produces: Scoring renders a full-height two-column layout when `layout.twoCol`, and a scaled single-column stack otherwise. In `twoCol` it owns its own scrolling (two `ScrollView`s) and pins the ad full-width at the bottom.

The single-column path stays today's structure (just scaled). The two-column path reuses the same inner JSX pieces, rearranged. Extract the inner pieces into local variables so both paths share them (DRY).

- [ ] **Step 1: Add the hook + scale the single-column sizes**

At the top of `ScoringScreen()` add `const s = useLayout();`. Append `fontSize: s.scale(N)` (current → scaled) to the inline styles of: `ghostText` 14, `eyebrow` 12 (all instances), `shareText` 14, `selBtnText` 17, `quickText` 16, `pointsText` 30, `clearText` 19, `addBtnText` 19, `previewName` 16, `previewSub` 13, `logText` 14, `empty` 14, `deleteX` 18, `endText` 15. Scale control heights: `selBtn` append `height: s.scale(52)`; `clearBtn`/`addBtn` append `height: s.scale(56)`; `pointsDisplay` append `padding: s.scale(16)`. Leave `width: '31%'` percentages alone.

- [ ] **Step 2: Extract inner blocks into locals**

Refactor the `return` so these are local `const` JSX values built once (cut them from the current single return, keep their existing JSX + the Step-1 scaling):
  - `backButton` — the "← Back to Setup" `Pressable`.
  - `standingsBlock` — the `standingsHeader` `View` + `<ScorePanel .../>`.
  - `entryBlock` — the big `panelStyle(t)` `View` (WHO PAYS / WHO GETS / QUICK / POINTS / keypad / entryActions / error).
  - `previewBlock` — the `{valid && (...)}` preview `View` (keep the `valid &&` guard inside the variable: `const previewBlock = valid ? (<View .../>) : null;`).
  - `logBlock` — the log header `Pressable` + `{logOpen && (...)}` card.
  - `endButton` — the End Game `Pressable`.
  - `celebrationOverlay` — the `{celebration && (<Celebration .../>) }`.

- [ ] **Step 3: Compose both layouts**

Replace the `return` with a branch:

```tsx
if (s.twoCol) {
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>{backButton}</View>
      <View style={{ flex: 1, flexDirection: 'row', gap: 16, paddingHorizontal: 16 }}>
        <ScrollView style={{ flex: 42 }} contentContainerStyle={{ gap: 18, paddingBottom: 16 }}>
          {standingsBlock}
          {logBlock}
        </ScrollView>
        <ScrollView
          style={{ flex: 58 }}
          contentContainerStyle={{ gap: 18, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {entryBlock}
          {previewBlock}
          {endButton}
        </ScrollView>
      </View>
      <View style={{ paddingBottom: 4 }}>
        <AppBannerAd />
      </View>
      {celebrationOverlay}
    </View>
  );
}

return (
  <View style={[styles.wrap, { backgroundColor: t.bg }]}>
    {backButton}
    {standingsBlock}
    {entryBlock}
    {previewBlock}
    {logBlock}
    {endButton}
    <AppBannerAd />
    {celebrationOverlay}
  </View>
);
```

Add `ScrollView` to the `react-native` import in this file. The single-column `return` is exactly today's order (back, standings, entry, preview, log, end, ad, celebration) — verify block-for-block against the current file so the phone layout is unchanged.

- [ ] **Step 4: Typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` clean; suite green.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ScoringScreen.tsx
git commit -m "feat(native): two-column iPad-landscape scoring layout + tablet scaling"
```

> The two-column layout renders inside App's centered ScrollView until Task 8 wires the full-width branch — that intermediate state looks cramped and is expected. Real verification is after Task 8, on-device (Task 9).

---

### Task 8: App.tsx — responsive width + full-width two-column branch

**Files:**
- Modify: `native/App.tsx`

**Interfaces:**
- Consumes: `useLayout` from `./src/responsive`.

- [ ] **Step 1: Add the hook + responsive maxWidth**

In `App.tsx`, add `import { useLayout } from './src/responsive';`. Inside `App()`, after `const theme = getTheme(dark);` add:

```tsx
const layout = useLayout();
```

Change the main `ScrollView`'s `contentContainerStyle` to widen on tablet:

```tsx
contentContainerStyle={[styles.content, { maxWidth: layout.maxWidth }]}
```

Remove the hardcoded `maxWidth: 420` from `styles.content` (keep `padding`, `width: '100%'`, `alignSelf`); the value now comes from `layout.maxWidth` (420 on phone, 640 on tablet).

- [ ] **Step 2: Branch Scoring full-width in twoCol**

The Splash early-return is unchanged. In the main `return`, compute the branch and render Scoring outside the ScrollView when two-column. Replace the `KeyboardAvoidingView` body:

```tsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
  {screen === 'scoring' && layout.twoCol ? (
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
  ) : (
    <ScrollView
      contentContainerStyle={[styles.content, { maxWidth: layout.maxWidth }]}
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
  )}
</KeyboardAvoidingView>
```

(ScoringScreen appears twice — once full-width for twoCol, once inside the ScrollView for single-column — with identical props. Its own `useLayout()` renders the matching internal layout.)

- [ ] **Step 3: Update the stylesheet**

In `App.tsx` `styles`, change:

```tsx
content: { padding: 16, maxWidth: 420, width: '100%', alignSelf: 'center' },
```

to:

```tsx
content: { padding: 16, width: '100%', alignSelf: 'center' },
```

- [ ] **Step 4: Full-project typecheck + tests**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` clean; **all** tests green (target: the pre-existing 41 + the new responsive suite).

- [ ] **Step 5: Commit**

```bash
git add App.tsx
git commit -m "feat(native): widen content on tablet + full-width two-column scoring"
```

---

### Task 9: Physical-iPad verification + store (user-driven)

**Files:** none (verification + store assets).

This is the real proof — there is no iOS simulator on this Mac, so nothing above is visually verified until here. The build/screenshots are done by the user on their physical iPad.

- [ ] **Step 1: Build & install a dev client on the iPad**

Follow the repo's existing dev-client flow (`native/eas.json`): `eas build --profile development --platform ios`, install on the iPad, run `npx expo start --dev-client`.

- [ ] **Step 2: Device checklist** — verify on the physical iPad:
  - Portrait and landscape on all three screens; Scoring shows two columns in landscape (standings/log left, entry/keypad right), single column in portrait.
  - Rotate mid-game → no state loss; columns reflow; keypad usable.
  - Drag into Split View / a narrow pane → falls back cleanly to the single-column phone layout.
  - Tiles, keypad keys, and text are comfortably sized (not tiny, not oversized) and nothing clips.
  - Celebration confetti falls the full screen height and performs smoothly.
  - Real AdMob banner sits centered in the full-width bottom slot and re-fits after rotation (no stale-width clipping).
  - Carry-over device items still hold on iPad: haptics, keep-awake, sounds with mute switch, dark-mode status bar, fonts.

- [ ] **Step 3: iPhone regression** — confirm on an iPhone (or narrow pane) that the app looks identical to before (compact path unchanged).

- [ ] **Step 4: Store** — capture the required **13-inch iPad** screenshot set (portrait + a landscape two-column shot) on the iPad; add them to the existing App Store listing; submit as version 1.1.0 (new build number). No Google Play change (Android tablets not targeted). No privacy/data-safety/age-rating change (layout-only).

- [ ] **Step 5: Update memory** — record that iPad universal support shipped (reverses the earlier `supportsTablet: false` decision; iPad screenshots now required) in the MahMahMia project memory.

---

## Self-Review

**Spec coverage:**
- Universal app / supportsTablet / iPad orientation → Task 2. ✓
- Responsive module (thresholds, scale, useLayout) + iPhone-identical invariant + snapshot test → Task 1. ✓
- Two-column landscape Scoring; Setup/Settlement widened single column → Tasks 6, 7, 8. ✓
- Ad remount on rotation / center / minHeight → Task 3. ✓
- Splash scaling; Celebration confetti full-height → Task 5. ✓
- Control minHeight/scaling; safe-area (no change needed) → Tasks 4–7; safe-area confirmed in Task 9. ✓
- Store iPad screenshots (13-inch), version bump, no Play/declaration change → Tasks 2, 9. ✓
- iPhone byte-identical guarantee → Global Constraints + Task 1 invariant test + additive-override recipe. ✓
- Rotation state survival → Task 9 check (free, no code). ✓

**Placeholder scan:** No TBD/TODO; every code step shows exact code or an enumerated list of exact edits.

**Type consistency:** `Layout`, `layoutFor`, `useLayout`, `scale`, `COMPACT_MAX`, `TWO_COL_MIN`, `TABLET_SCALE` used identically across tasks. `useLayout()` bound to `s` everywhere except `ScorePanel.tsx` where it's `sz` (documented, to avoid the existing `s` score variable). `AppBannerAd` keeps its zero-prop signature (used unchanged by ScoringScreen).
