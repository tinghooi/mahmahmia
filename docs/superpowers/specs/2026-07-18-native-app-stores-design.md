# MahMahMia Native App — Design Spec

**Date:** 2026-07-18
**Goal:** Publish MahMahMia to the iOS App Store and Google Play as a native app, matching the web app feature-for-feature, plus small phone extras.
**Decided with user:** Full Expo rebuild (not a web wrapper). Copy of web features + keep-awake + haptics. User has both developer accounts (Apple + Google).

## Architecture

- **Stack:** Expo (latest SDK), React Native, TypeScript.
- **Location:** `native/` folder inside this repo. The web app at the repo root stays live and unchanged.
- **Navigation:** No navigation library. Three screens switched by a single state value (`setup | scoring | settlement`), mirroring the web app's `showScreen()`.
- **Persistence:** AsyncStorage, same shape as web localStorage state: `{ gameType, playerCount, players, rounds, gameStartTime }`.
- **Analytics:** `@supabase/supabase-js`, same `game_sessions` insert on game end. No database change: reuse the existing `device` column with values `ios-app` / `android-app`; keep `app_version` (start at `1.0`). Insert failures are logged and ignored — never block the user.

## Screens (feature parity with web)

**Setup**
- Game type toggle: Mahjong (3 players default) / Rummy (4 players default).
- Name inputs with validation: all required, must be unique.
- Resume banner when a saved game with rounds exists.
- Confirm dialog before starting a new game while one is in progress.

**Scoring**
- Standings panel sorted by net score, with fun titles (大老板 👑 / 破产王 💸 / 小赚 😏 / 惨了 😭 / 打酱油 😐) and flash animation on update.
- Loser ("who pays") and winner ("who gets") button rows; picking the same person for both is blocked.
- Points input accepting simple `+`/`-` expressions (port `evalExpr` as-is).
- Quick-amount chips: last 4 unique amounts from recent rounds.
- Add round: random fun Chinese toast + coin sound + haptic tap; selections stay for fast consecutive entries.
- Collapsible round log with per-entry delete (delete sound + haptic).
- Share standings: native share sheet with the same text format (standings, titles, transaction count, duration, mahmahmia.com plug).
- End game with confirm dialog.

**Settlement**
- Random Chinese flavor line (or 打平了 when even).
- Final scores panel.
- Minimal-transfers settle-up (port `calculateSettlement` as-is, including the sum-to-zero invariant check).
- Back to scoring, or New game (clears state).

## Phone extras (the additions)

- **Keep awake:** screen never sleeps while on the scoring screen (`expo-keep-awake`).
- **Haptics:** light impact on add-round, delete, and settle (`expo-haptics`).
- **Native share sheet** replaces the web share/clipboard fallback chain.
- **Sounds:** browsers generate tones in code; React Native can't. Bundle three small audio files matching the web tones — coin (add round), fanfare (settle), boop (delete) — played with `expo-audio`. Generate the files once with a script from the same frequencies used in the web `playTone` calls.

## Visual style

Match the web app: cream background `#f5f0e8`, brown text `#3d2e1e`, gold primary `#c4873b`, same typography feel (system font), same card/button shapes. The existing mahjong-tile 發 favicon design becomes the 1024px app icon and splash screen.

## Store submission

- **Build/submit:** EAS Build + EAS Submit.
- **iOS:** TestFlight build first, tested on the user's iPhone, then App Store review.
- **Android:** internal/closed testing track first. If the Play account is a newer personal account, Google requires a 12-tester, 14-day closed test before production — confirm at submission time; plan proceeds either way, production release just waits out the test window.
- **Required assets (part of the plan):** 1024px icon, splash, phone screenshots (both platforms), store descriptions, and a privacy policy page added to the website at `privacy.html` (→ mahmahmia.com/privacy.html) covering the anonymous game stats collected via Supabase. Both stores require the privacy URL.

## Error handling

- Same validation messages as web (names required/unique, valid point amount, pick payer + receiver).
- Supabase errors: console-logged, never surfaced to the user.
- Corrupt saved state: discard and start fresh (same as web `restoreState`).

## Testing

- Feature-parity pass on the user's physical iPhone (via dev build or TestFlight — real device, not just simulator).
- Android verified on emulator + at least one real device via Play internal testing.
- Settlement math: port the web logic unchanged; unit-test `calculateSettlement` and `evalExpr` in the native project.

## Out of scope

- Past-game history, accounts/sync, ads, in-app purchases, localization changes, any web app changes beyond adding the privacy page.
