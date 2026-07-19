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
- **Hard invariant — iPhone is byte-identical.** When `compact`, `scale(x) === x` and content width stays 420. To make this real (not just a claim about the `scale` helper), the non-compact path must be **additive overrides only**: leave every existing `StyleSheet.create` block and `panelStyle()` constant untouched, and apply scaled values inline **only when `!compact`**. So in compact mode the code executes exactly today's static styles — nothing is recomputed. This covers the many literals that would otherwise drift (`panelStyle` padding/radius/margin, `gap` values, `'31%'` widths, `letterSpacing`/`lineHeight`), which a bare `scale(x)===x` test would miss.
- **What the tests do and don't prove:** unit tests cover the `scale` contract (identity in compact, ×1.25 on tablet) and the threshold classifications. They do **not** prove every individual style literal is unchanged — that guarantee comes from the additive-override discipline above (never editing the static styles; only appending `scale()`d inline values that equal the original in compact). The discipline is the real guard; the tests catch contract/threshold regressions.

## app.json — tablet + orientation

- `ios.supportsTablet: true`.
- Keep the global `"orientation": "portrait"` (this is what keeps **iPhone and Android portrait-locked** — unchanged).
- Add **only** `ios.infoPlist["UISupportedInterfaceOrientations~ipad"]` = all four orientations. iOS applies the `~ipad` variant only to iPad, so **iPad rotates freely while iPhone stays portrait**. Android is unaffected.
- **Do not add the base `UISupportedInterfaceOrientations` key.** Verified against the installed `@expo/config-plugins@57.0.5`: `orientation: portrait` writes the base key and its guard skips (with a warning) if the base key already exists in `infoPlist` — so adding the base key would silently stop portrait-locking iPhone. The `~ipad` variant survives untouched, which is exactly what we want. (Orientation trick confirmed correct for SDK 57 by the reviewer.)
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
  - The ad banner spans **full width, pinned along the bottom**, below the columns — it must sit in the screen-level bottom slot, **not inside a scrolling column** (today `AppBannerAd` is the last item in Scoring's vertical stack; in `twoCol` it moves out of the stack).
  - Log stays **collapsed by default** here too (same as phone). Rationale: iPad mini in full-screen landscape (1133×744) is `twoCol` but short on height once header + ad are subtracted, so a default-open log would crowd it. No behavior divergence from phone.
- To support the full-width frame, `App.tsx` must **branch before the outer ScrollView**: in `twoCol` it renders Scoring as a `flex: 1` child of `KeyboardAvoidingView` (full-width, screen owns its own two-column scrolling), **not** inside the centered `maxWidth` ScrollView. This avoids nesting two vertical ScrollViews inside the outer one (which triggers "VirtualizedLists should never be nested" and broken scroll). All other cases keep the existing single centered ScrollView with a responsive `maxWidth` (420 → 640).

**Setup** and **Settlement** — widened **centered single column** on iPad in both orientations (`maxWidth 640`, scaled sizes). They're short (a name form; a final-scores + who-pays-who list); two columns would leave awkward gaps. *If Settlement looks empty in iPad landscape on-device, we mirror the two-column split there too — deferred to the device pass, not built up front.*

**Splash / intro** (`SplashScreen.tsx`) — centered flex layout; scale the logo and typography up on tablet via the same helper. Native splash (`expo-splash-screen`, `resizeMode: contain`) already scales fine.

**Celebration overlay** (`Celebration.tsx`) — the confetti fall distance is a hardcoded `outputRange: [-40, 860]` and the center glyphs are fixed sizes, so on a 1024–1366pt-tall iPad the confetti stops mid-screen. Scale the fall distance and center glyphs by layout (drive the fall distance off screen height).

**Control sizing note** — several controls use a fixed `height` (selection tiles 52, keypad keys 56, Add/Clear 56). Combined with the 1.25 scale and iOS Dynamic Type, fixed heights can clip text. Prefer `minHeight` over `height` where text sits inside, or cap with `maxFontSizeMultiplier`. Applies on tablet only; iPhone (compact) keeps today's exact values per the byte-identical invariant.

## Ads on tablet

The banner needs explicit handling — the reviewer verified against the installed `react-native-google-mobile-ads@16` source that our assumption was wrong. The adaptive banner computes a **fixed pixel size once** from the screen width at load time (from the native `onAdLoaded` event); it does **not** re-fit to its container and does **not** re-request when the window changes. So on the in-scope "rotate mid-game" flow, a banner loaded in landscape (~1024×90) keeps that stale wide box after rotating to portrait (~820pt) → horizontal overflow/clipping, and never re-fetches the portrait size.

Required handling (no SDK/config change, just how we mount it):
- **Remount on orientation change:** give the banner a `key` that flips with orientation (e.g. `key={isLandscape ? 'land' : 'port'}`) so it re-requests the correct current-orientation adaptive size.
- **Center in a full-width slot:** wrap it in a full-width `View` with `alignItems: 'center'`. The creative is a fixed-width leaderboard-class box (not truly edge-to-edge), so center it in the full-width bottom slot rather than expecting it to fill.
- **Reserve height** (`minHeight` ~50–90) so the `[0,0]→loaded` transition doesn't jump the layout.
- **Verify real fill on the physical iPad** (creative renders, height reserved, no jump, re-fits after rotation).

## Store submission

- **iPad screenshots are now required.** Capture the mandatory 13-inch iPad set (portrait + landscape showing the two-column scoring screen) on the user's physical iPad. This is the one net-new store deliverable.
- Same listing, same bundle id; ship as a normal version update (suggest `1.1.0`, new build number).
- **Google Play:** no change — Android tablets are not targeted or redesigned; the app continues to run on them in the phone/portrait layout. No new Android assets required.
- Re-confirm at submission that no other declaration changes (privacy, data safety, age rating) are affected — they are not; this is layout-only.

## Testing / verification

- **Unit tests** `src/responsive.ts`: threshold boundaries (699/700, 899/900, portrait vs landscape); the **compact-equals-today invariant** (`scale(x) === x`, width 420 in compact); and the **frozen compact-token snapshot** (full compact size set equals today's literals, so any iPhone drift fails CI).
- **State survives rotation for free** — layout is derived purely from `useWindowDimensions()` and game state already lives in `App.tsx` + AsyncStorage, so rotation just re-renders. No extra work; confirm on-device (no state loss on rotate).
- **Safe area** — `edges={['top','bottom']}` is correct on iPad (no side notch → zero left/right insets in landscape); no change needed, just confirm in the device pass.
- **iPhone regression:** existing 41 unit tests stay green, `tsc --noEmit` clean, and compact-mode values proven identical to current literals so iPhone is unchanged.
- **Physical iPad device pass** (the real proof — no simulator on this Mac):
  - Portrait and landscape on all three screens; the Scoring two-column layout in landscape.
  - Rotate mid-game → no state loss, columns reflow, keypad usable.
  - Drag into Split View / narrow pane → falls back cleanly to the single-column layout.
  - Keypad, selection tiles, and tap targets are comfortably sized (not tiny, not absurdly huge).
  - Celebration/confetti overlay scales (confetti falls the full height) and performs.
  - Real AdMob banner sits centered in the full-width bottom slot and **re-fits after rotation** (no stale-width clipping).
- Carry forward all pre-existing device-pass items (haptics, keep-awake, sounds/mute, dark-mode status bar, fonts) on iPad too.

## Out of scope

- Android tablet-optimized layout (Android stays portrait phone layout).
- Two-column Setup, and two-column Settlement (Settlement only if the device pass shows it's needed).
- iPad multitasking beyond graceful reflow (no multi-window/scenes, drag-and-drop, Apple Pencil, hardware-keyboard shortcuts, pointer/hover).
- Any change to game logic, scoring, copy, fonts, colors, or the web app.
- Any new iPad-only feature.
