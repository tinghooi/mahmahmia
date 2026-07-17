# MahMahMia Native App — Design Spec

**Date:** 2026-07-18 (rev 2, after expert review)
**Goal:** Publish MahMahMia to the iOS App Store and Google Play as a native app, matching the web app feature-for-feature, plus small phone extras.
**Decided with user:** Full Expo rebuild (not a web wrapper). Copy of web features + keep-awake + haptics. User has both developer accounts (Apple + Google).

## Architecture

- **Stack:** Expo (latest SDK), React Native, TypeScript.
- **Location:** `native/` folder inside this repo. The web app at the repo root stays live and unchanged (except adding `privacy.html`).
- **Targets:** iPhone-only on iOS (`ios.supportsTablet: false` — runs in compatibility mode on iPad, no iPad screenshots required). Standard phone support on Android.
- **Navigation:** No navigation library. Three screens switched by a single state value (`setup | scoring | settlement`), mirroring the web app's `showScreen()`. Android hardware back: scoring → setup (game preserved), settlement → scoring, setup → exit app (via `BackHandler`).
- **Persistence:** AsyncStorage, same shape as web localStorage state: `{ gameType, playerCount, players, rounds, gameStartTime }`. Corrupt saved state is discarded (same as web `restoreState`).
- **Analytics:** no Supabase SDK — a single plain `fetch` POST to the Supabase REST endpoint (`/rest/v1/game_sessions`) with the anon key headers. The app makes exactly one kind of insert; shipping an SDK for it is unnecessary. Failures are logged and ignored — never block the user. Fires every time End Game is confirmed (same as web, including end → back → end again).

### Analytics field mapping (all 15 web fields)

| Field | Web today | Native app sends |
|---|---|---|
| `client_id` | UUID in localStorage `mamamia_cid` | UUID persisted in AsyncStorage (same key) |
| `game_type` | `mahjong` / `rummy` | same |
| `player_count` | count | same |
| `transaction_count` | rounds count | same |
| `duration_sec` | elapsed | same |
| `device` | `mobile` / `desktop` | `ios-app` / `android-app` (no DB change) |
| `locale` | `navigator.language` | `expo-localization` locale |
| `screen_width` | `window.innerWidth` | `Dimensions.get('window').width` |
| `referrer` | referrer or `direct` | literal `app` |
| `app_version` | `1.0` | native binary version string (e.g. `1.0.0`) |
| `tz` | Intl timezone | `expo-localization` timezone |
| `hour_local` | local hour | same |
| `max_score_spread` | max−min score | same |
| `features_used` | Set: `quick_amount`, `log_view`, `undo` | same tracking ported, same values |
| `utm_source` | URL param | `null` |

## Screens (feature parity with web)

**Launch behavior:** with a valid saved game (players AND rounds present), the app opens **directly on the scoring screen** — this is the reopen-mid-game flow and must not land on setup. Otherwise the app opens on setup. The resume banner appears only on the setup screen after "Back to Setup" during a live game.

**Setup**
- Game type toggle: Mahjong (3 players default) / Rummy (4 players default).
- Name inputs with validation: all required, must be unique. Return key advances to next field; last field's return key starts the game (`returnKeyType`).
- Resume banner (game type · players · transaction count) when a game with rounds exists; tapping it returns to scoring.
- Confirm dialog before starting a new game while one is in progress.

**Scoring**
- "← Back to Setup" ghost button at top (game preserved).
- Standings panel sorted by net score, with fun titles (大老板 👑 / 破产王 💸 / 小赚 😏 / 惨了 😭 / 打酱油 😐) and flash animation on update.
- Share button hidden until at least one round exists.
- Loser ("who pays") and winner ("who gets") button rows; picking the same person for both is blocked; selections persist after adding for fast consecutive entries.
- Points input accepting simple `+`/`-` expressions (port `evalExpr` as-is); clears and dismisses keyboard after a successful add.
- Quick-amount chips: last 4 unique amounts from recent rounds, sorted ascending; tapping fills the points field.
- Add round: random fun Chinese toast with detail line (`loser → winner: N pts`) + coin sound + haptic tap; newest log entry gets a flash animation.
- Collapsible round log with count in header and per-entry delete (delete sound + haptic).
- Share standings: native share sheet with the same text format (ranked standings with titles, transaction count, duration, mahmahmia.com plug).
- End game with confirm dialog.

**Settlement**
- Random Chinese flavor line (or 打平了 when even).
- Final scores panel.
- Minimal-transfers settle-up (port `calculateSettlement` as-is, including the sum-to-zero invariant check).
- Back to scoring, or New game (clears state, resets to Mahjong/3 players).

## Phone extras (the additions)

- **Keep awake:** screen never sleeps while on the scoring screen (`expo-keep-awake`).
- **Haptics:** light impact on add-round, delete, and settle (`expo-haptics`).
- **Native share sheet** replaces the web share/clipboard fallback chain.
- **Sounds:** browsers generate tones in code; React Native can't. Bundle three small audio files matching the web tones — coin (add round), fanfare (settle), boop (delete) — played with `expo-audio`. Generate the files once with a script from the same frequencies used in the web `playTone` calls.

These extras are also the answer to Apple's guideline 4.2 (minimum functionality) risk for simple utilities — screenshots and the store description should highlight them.

## Visual style

Match the web app: cream background `#f5f0e8`, brown text `#3d2e1e`, gold primary `#c4873b`, same typography feel (system font), same card/button shapes. The existing mahjong-tile 發 favicon design becomes the 1024px app icon and splash screen, plus an Android adaptive icon (separate foreground/background layers).

## Store submission

- **Build/submit:** EAS Build + EAS Submit.
- **Early check:** confirm the name "MahMahMia" is available in App Store Connect and Play Console before building store assets.
- **iOS:** TestFlight build first, tested on the user's iPhone, then App Store review.
- **Android:** internal/closed testing track first. If the Play account is a newer personal account, Google requires a 12-tester, 14-day closed test before production — confirm at submission time; plan proceeds either way, production release just waits out the test window.
- **Required assets:** 1024px iOS icon, Android adaptive icon, splash, phone screenshots (both platforms), **Play feature graphic (1024×500)**, store descriptions, and a privacy policy page added to the website at `privacy.html` (→ mahmahmia.com/privacy.html) covering the anonymous game stats collected via Supabase. Both stores require the privacy URL.

### Store forms & declarations (required, easy to miss)

- **Apple privacy nutrition label:** declare the Supabase collection — identifier (`client_id`) + usage data, "collected, not linked to identity, not used for tracking".
- **iOS export compliance:** set `ITSAppUsesNonExemptEncryption: false` in app config (HTTPS-only is exempt) so every build doesn't prompt in App Store Connect.
- **Google Play Data Safety form:** must match the privacy policy content.
- **Content/age-rating questionnaires (both stores):** the mahjong theme triggers "simulated gambling / real-money gambling" questions — the correct, consistent answer is **no**: the app is a score tracker; no gameplay, no wagering, no money handled.

## Security note

The Supabase anon key already ships publicly in the web page, so the app binary adds no new exposure — but before release, verify the anon role's policy on `game_sessions` is **insert-only** (no select/update/delete).

## Error handling

- Same validation messages as web (names required/unique, valid point amount, pick payer + receiver).
- Analytics POST errors: console-logged, never surfaced to the user.
- Corrupt saved state: discard and start fresh.

## Testing

- Feature-parity pass on the user's physical iPhone (via dev build or TestFlight — real device, not just simulator).
- Android verified on emulator + at least one real device via Play internal testing.
- Unit tests: `calculateSettlement`, `evalExpr`, and corrupt-saved-state restore.
- Analytics: end one real game from the app and confirm the row lands in the actual Supabase `game_sessions` table (a mocked insert proves nothing).

## Out of scope

- Past-game history, accounts/sync, ads, in-app purchases, localization changes, any web app changes beyond adding the privacy page.
