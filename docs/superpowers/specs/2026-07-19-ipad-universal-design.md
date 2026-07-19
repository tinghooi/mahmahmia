# MahMahMia iPad Support — Design Spec

**Date:** 2026-07-19
**Goal:** Make the native app a proper **universal app** — one binary, one App Store listing, that looks *designed for* iPad (not a blown-up phone) on both iPhone and iPad.
**Decided with user:** Universal app (not a separate iPad app). "Proper responsive" polish level **plus** a dedicated two-column landscape layout for the Scoring screen. iPhone appearance must not change. User has a physical iPad for testing and store screenshots.

## Context / what this reverses

The 2026-07-18 store spec deliberately shipped iPhone-only (`ios.supportsTablet: false`, "runs in compatibility mode on iPad, no iPad screenshots required"). This spec reverses that: we turn on real iPad support, which means the App Store listing now **requires** iPad screenshots. Nothing else about the store submission changes.

Current layout reality (verified in code): every screen is a single vertical stack of `gap`-spaced blocks using **percentage/flex widths**, wrapped by one outer `ScrollView` in `App.tsx` capped at `maxWidth: 420`, centered. Because widths are %-based, widening the container scales the existing UI cleanly — no structural rewrite is needed for the single-column cases. Only the Scoring screen's landscape two-column layout is genuinely new structure.

## Architecture

- **Universal app:** same Expo binary, same `com.nexvancetech.mahmahmia` bundle id, same single App Store listing. No second submission, no separate codebase.
- **Layout is driven by live window size, not device type.** A small, pure, unit-testable module maps the current `{ width, height }` to a layout descriptor. This makes iPad multitasking (Split View / Stage Manager) "just work": a narrow iPad pane renders the phone layout automatically, because the decision is based on width, not on "is this an iPad".
- **iPhone output is byte-for-byte unchanged.** The layout module's "compact" branch must return exactly today's size literals, guaranteed by a unit test. iPhone stays portrait-locked and pixel-identical.
- **Blast radius:** `app.json` (tablet + iPad orientations), one new `src/responsive.ts` module (+ test), a `useLayout()` hook, and size-aware values threaded into the four screens/components. Only `App.tsx` and `ScoringScreen.tsx` gain real layout *branching*; the rest just swap fixed numbers for size-aware tokens.

## Responsive system

New pure module `src/responsive.ts` (mirrors the repo's pattern of testable pure logic like `game.ts` / `theme.ts`), plus a thin `useLayout()` hook wrapping React Native's `useWindowDimensions()` (re-renders on rotation/resize).

`layoutFor({ width, height })` returns:

| Field | Rule | Meaning |
|---|---|---|
| `isLandscape` | `width > height` | orientation |
| `compact` | `width < 700` | phone-style single column — **today's exact sizes**, `maxWidth 420` |
| `roomy` | `width >= 700` | tablet single column — `maxWidth 640`, scaled-up sizes |
| `twoCol` | `width >= 900 && isLandscape` | Scoring renders two columns, full-width frame |

- `scale(base)` helper: `compact ? base : Math.round(base * 1.25)`. Applied to font sizes, control heights, tile/keypad/avatar dimensions, and panel padding. The 1.25 factor and the 700/900 thresholds are tunable during the device pass — they live in one module.
- **Hard invariant:** when `compact` is true, `scale(x) === x` and content width stays 420 — so iPhone is untouched. Covered by a unit test asserting the compact tokens equal the current literals.
- Because static `StyleSheet.create` can't read runtime sizes, size-sensitive values move to inline styles (or a small `useMemo` style factory keyed on layout) applied **alongside** the existing inline-theme-color pattern. Color-from-theme styling stays exactly as today.

## app.json — tablet + orientation

- `ios.supportsTablet: true`.
- Keep the global `"orientation": "portrait"` (this is what keeps **iPhone and Android portrait-locked** — unchanged).
- Add `ios.infoPlist["UISupportedInterfaceOrientations~ipad"]` = all four orientations. iOS applies the `~ipad` variant only to iPad, so **iPad rotates freely while iPhone stays portrait**. Android is unaffected.
- **Do not force full-screen** (no `UIRequiresFullScreen`). The width-driven layout already adapts to any pane size, so Split View / Stage Manager work for free and we avoid fighting modern iPadOS resizability expectations.
- Suggest bumping app `version` to `1.1.0` (feature release).

## Per-screen layout

**Scoring (the screen you live in during a game) — the only screen with a two-column path.**
- **Compact / roomy (all portrait, and iPhone):** unchanged single vertical stack; just wider and scaled on `roomy`.
- **`twoCol` (iPad landscape ≥ 900pt wide):**
  - "← Back to Setup" spans full width across the top.
  - A `flexDirection: 'row'` fills the remaining height with two columns, each its own independently-scrolling `ScrollView`:
    - **Left (~42%):** Standings header + `ScorePanel` + round Log.
    - **Right (~58%):** entry panel — who pays / who gets / quick chips / points display / `Keypad` / Add — plus the win preview and the "End Game — Settle Up" button.
  - The ad banner spans **full width, pinned along the bottom**, below the columns.
  - Log may default **open** in this layout (there's vertical room); optional nicety, not required.
- To support the full-width frame, `App.tsx` renders Scoring **outside** the centered `maxWidth` ScrollView when `twoCol` (full-width container, screen owns its own scrolling). All other cases keep the existing single centered ScrollView with a responsive `maxWidth` (420 → 640).

**Setup** and **Settlement** — widened **centered single column** on iPad in both orientations (`maxWidth 640`, scaled sizes). They're short (a name form; a final-scores + who-pays-who list); two columns would leave awkward gaps. *If Settlement looks empty in iPad landscape on-device, we mirror the two-column split there too — deferred to the device pass, not built up front.*

**Splash / intro** (`SplashScreen.tsx`) — centered flex layout; scale the logo and typography up on tablet via the same helper. Native splash (`expo-splash-screen`, `resizeMode: contain`) already scales fine.

## Ads on tablet

Keep the existing anchored **adaptive** banner — it auto-sizes to the container width, returning a larger (leaderboard-class) banner on iPad. In `twoCol` it must sit full-width at the bottom, not inside a column. No SDK/config change expected; **verify real fill on the physical iPad** (creative renders, height reserved, no layout jump).

## Store submission

- **iPad screenshots are now required.** Capture the mandatory 13-inch iPad set (portrait + landscape showing the two-column scoring screen) on the user's physical iPad. This is the one net-new store deliverable.
- Same listing, same bundle id; ship as a normal version update (suggest `1.1.0`, new build number).
- **Google Play:** no change — Android tablets are not targeted or redesigned; the app continues to run on them in the phone/portrait layout. No new Android assets required.
- Re-confirm at submission that no other declaration changes (privacy, data safety, age rating) are affected — they are not; this is layout-only.

## Testing / verification

- **Unit test** `src/responsive.ts`: threshold boundaries (699/700, 899/900, portrait vs landscape) and the **compact-equals-today invariant** (`scale(x) === x`, width 420 in compact).
- **iPhone regression:** existing 41 unit tests stay green, `tsc --noEmit` clean, and compact-mode values proven identical to current literals so iPhone is unchanged.
- **Physical iPad device pass** (the real proof — no simulator on this Mac):
  - Portrait and landscape on all three screens; the Scoring two-column layout in landscape.
  - Rotate mid-game → no state loss, columns reflow, keypad usable.
  - Drag into Split View / narrow pane → falls back cleanly to the single-column layout.
  - Keypad, selection tiles, and tap targets are comfortably sized (not tiny, not absurdly huge).
  - Celebration/confetti overlay scales and performs.
  - Real AdMob banner fills full-width at the bottom.
- Carry forward all pre-existing device-pass items (haptics, keep-awake, sounds/mute, dark-mode status bar, fonts) on iPad too.

## Out of scope

- Android tablet-optimized layout (Android stays portrait phone layout).
- Two-column Setup, and two-column Settlement (Settlement only if the device pass shows it's needed).
- iPad multitasking beyond graceful reflow (no multi-window/scenes, drag-and-drop, Apple Pencil, hardware-keyboard shortcuts, pointer/hover).
- Any change to game logic, scoring, copy, fonts, colors, or the web app.
- Any new iPad-only feature.
