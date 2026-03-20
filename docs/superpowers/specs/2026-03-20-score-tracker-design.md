# MahMahMia — Game Score Tracker

## Overview

A mobile web app for tracking scores during mahjong (3 players) and rummy (4 players) house games. Single scorer enters all transactions on one device. At game end, shows the minimum transfers needed to settle all debts.

## Requirements

- **Platform:** Mobile web app (opened in phone browser, no install)
- **Users:** Single scorer on one device, no multi-device sync
- **Games supported:** Mahjong (3 players), Rummy (4 players)
- **Scoring model:** Free-form "X gives Y N points" per round
- **Settlement:** Show minimum transfers to zero everyone out
- **History:** None — current session only
- **Persistence:** sessionStorage for crash protection (not long-term storage)
- **Player names:** Typed fresh each game, no saved profiles
- **Points:** Pure points, no money conversion

## Technical Approach

**Single static HTML file** — embedded CSS + vanilla JS. No framework, no build tools, no backend.

- ~300-400 lines total
- Mobile-first responsive design, dark theme
- Screen switching via show/hide `<section>` elements
- Deployable on GitHub Pages, Netlify, or opened as a local file

## App Flow

### Screen 1: Setup

- **Game type toggle:** Mahjong (3 players) / Rummy (4 players)
  - Toggling adjusts the number of name input fields shown (3 or 4)
- **Player name inputs:** text fields, one per player
- **Validation:**
  - All names must be non-empty
  - No duplicate names allowed
  - Trim whitespace
- **"Start Game" button** — transitions to Scoring screen

### Screen 2: Scoring

- **Live standings panel** (always visible at top):
  - Each player's net score (sum of all points gained minus lost)
  - Sorted highest to lowest
  - Positive scores in green, negative in red, zero in neutral/grey

- **Round entry form:**
  - **"Who lost?"** — dropdown of player names
  - **"Who won?"** — dropdown of player names (auto-excludes the selected loser)
  - **"Points"** — numeric input (must be > 0)
  - **"Add" button** — logs the round, updates standings
  - Labels use "Who lost?" / "Who won?" to avoid directional confusion

- **Round log** (below the form):
  - List of all rounds entered this session
  - Format: `#1: Alton → Michelle: 30 pts` (arrow = loser pays winner)
  - Each entry has an **undo/delete button** (trash icon or X)
  - Deleting a round recalculates standings

- **"End Game — Settle Up" button** — transitions to Settlement screen

- **Auto-save:** Every state change writes to `sessionStorage` (key: `mahmahmia-state`). On page load, if saved state exists for an in-progress game, restore it automatically.

### Screen 3: Settlement

- **Final scores panel:**
  - Same as standings but labeled "Final Scores"
  - Sorted highest to lowest

- **Settlement transfers:**
  - Header: "Who Pays Who"
  - List of minimized transfers to clear all debts
  - Format: `Alton → pays → Michelle: 30 pts`
  - Debtors in red, creditors in green

- **"New Game" button** — clears all state (including sessionStorage) and returns to Setup screen

## Settlement Algorithm

Greedy debt simplification — optimal for 3-4 players:

1. Calculate net score per player (all gains minus all losses)
2. Validate: net scores must sum to zero (invariant check)
3. Separate into debtors (negative net) and creditors (positive net)
4. Sort debtors by amount ascending (most negative first), creditors descending (most positive first)
5. Match biggest debtor with biggest creditor:
   - Transfer amount = min(|debtor's balance|, creditor's balance)
   - Reduce both balances by transfer amount
   - Record the transfer
   - Remove anyone who reaches zero
6. Repeat until all balances are zero

This produces the minimum number of transfers for small player counts.

## Input Validation

| Field | Rule |
|-------|------|
| Player names | Non-empty after trim, no duplicates |
| Who lost / Who won | Cannot be the same player |
| Points | Must be a positive integer > 0 |

## UI/UX Principles

- **Mobile-first:** Touch-friendly button sizes (min 44px), large text for readability
- **Dark theme:** Easy on the eyes for late-night game sessions
- **Minimal taps:** Game type toggle and dropdowns reduce typing
- **Clear language:** "Who lost?" / "Who won?" instead of abstract "From" / "To"
- **Error prevention:** Auto-exclude same player, validate before allowing submission
- **Crash-safe:** sessionStorage auto-save means no progress lost on accidental refresh

## Out of Scope

- Multi-device sync / multiplayer access
- User accounts or saved player profiles
- Game history or round history beyond current session
- Money conversion
- Custom game types beyond Mahjong (3) and Rummy (4)
- Offline-first PWA features (service worker, manifest)
- Backend or database
