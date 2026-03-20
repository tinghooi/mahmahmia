# MahMahMia Score Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file mobile web app for tracking mahjong/rummy scores and calculating minimum settlement transfers.

**Architecture:** Single `index.html` with embedded `<style>` and `<script>`. Three `<section>` elements for Setup, Scoring, and Settlement screens — one visible at a time. A separate `test.html` file exercises the settlement algorithm logic. Game state is a plain JS object auto-saved to sessionStorage.

**Tech Stack:** Vanilla HTML/CSS/JS, no dependencies.

**Spec:** `docs/superpowers/specs/2026-03-20-score-tracker-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `index.html` | The entire app — HTML structure, CSS styles, JS logic |
| `test.html` | Standalone test page for settlement algorithm verification |

---

## Task 1: HTML Skeleton + Dark Theme CSS + Screen Switching

**Files:**
- Create: `index.html`

This task creates the foundation: the 3 screen sections (empty), the dark theme, mobile viewport, and the `showScreen()` function.

- [ ] **Step 1: Create `index.html` with HTML structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MahMahMia</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0f0f1a;
      color: #e0e0e0;
      min-height: 100dvh;
      padding: 16px;
      font-size: 16px;
    }
    h1 { text-align: center; font-size: 24px; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #888; font-size: 14px; margin-bottom: 20px; }
    section { display: none; max-width: 420px; margin: 0 auto; }
    section.active { display: block; }
    .btn {
      display: block; width: 100%; padding: 14px; border: none; border-radius: 10px;
      font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 12px;
      min-height: 48px;
    }
    .btn-primary { background: #4a9eff; color: #fff; }
    .btn-success { background: #22c55e; color: #fff; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-ghost { background: none; color: #888; text-decoration: underline; border: none; font-size: 14px; cursor: pointer; padding: 8px; }
    input, select {
      width: 100%; padding: 12px; border: 1px solid #333; border-radius: 8px;
      background: #1a1a2e; color: #e0e0e0; font-size: 16px; margin-bottom: 8px;
      min-height: 48px;
    }
    select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
    .label { font-size: 12px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; margin-bottom: 6px; }
    .panel { background: #1a1a2e; border-radius: 10px; padding: 12px; margin-bottom: 16px; }
    .score-pos { color: #22c55e; }
    .score-neg { color: #ef4444; }
    .score-zero { color: #888; }
  </style>
</head>
<body>
  <h1>🀄 MahMahMia</h1>
  <p class="subtitle">Score Tracker</p>

  <section id="setup" class="active">
    <!-- Task 2 -->
  </section>

  <section id="scoring">
    <!-- Task 3 & 4 -->
  </section>

  <section id="settlement">
    <!-- Task 6 -->
  </section>

  <script>
    // --- Screen switching ---
    function showScreen(id) {
      document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }

    // --- Persistence stubs (replaced in Task 7) ---
    function saveState() {}
    function clearState() {}
    function restoreState() { return false; }
  </script>
</body>
</html>
```

- [ ] **Step 2: Open in mobile browser (or responsive mode) and verify**

Open `index.html` in a browser. Use responsive/mobile view (e.g. iPhone SE in Chrome DevTools).
Expected: Dark background, "MahMahMia" title centered, no visible content below (sections are empty).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: HTML skeleton with dark theme CSS and screen switching"
```

---

## Task 2: Setup Screen

**Files:**
- Modify: `index.html` (the `#setup` section + JS)

Build the game type toggle, player name inputs, validation, and Start Game button.

- [ ] **Step 1: Add Setup screen HTML inside `<section id="setup">`**

```html
<div class="label">Game Type</div>
<div style="display:flex;gap:8px;margin-bottom:16px;">
  <button class="btn btn-toggle active" onclick="setGameType('mahjong')" id="btn-mahjong">Mahjong (3)</button>
  <button class="btn btn-toggle" onclick="setGameType('rummy')" id="btn-rummy">Rummy (4)</button>
</div>
<div id="name-inputs"></div>
<div id="setup-error" style="color:#ef4444;font-size:14px;min-height:20px;margin-top:4px;"></div>
<button class="btn btn-success" onclick="startGame()">Start Game →</button>
```

- [ ] **Step 2: Add toggle button CSS**

```css
.btn-toggle {
  flex: 1; padding: 12px; border: 1px solid #333; border-radius: 8px;
  background: #1a1a2e; color: #888; font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-toggle.active { background: #4a9eff; color: #fff; border-color: #4a9eff; }
```

- [ ] **Step 3: Add Setup JS logic**

```javascript
// --- State ---
let gameType = 'mahjong';
let playerCount = 3;
let players = [];
let rounds = [];

// --- Setup ---
function setGameType(type) {
  gameType = type;
  playerCount = type === 'mahjong' ? 3 : 4;
  document.getElementById('btn-mahjong').classList.toggle('active', type === 'mahjong');
  document.getElementById('btn-rummy').classList.toggle('active', type === 'rummy');
  renderNameInputs();
}

function renderNameInputs() {
  const container = document.getElementById('name-inputs');
  container.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Player ${i + 1} name`;
    input.id = `name-${i}`;
    input.autocomplete = 'off';
    container.appendChild(input);
  }
}

function startGame() {
  const names = [];
  for (let i = 0; i < playerCount; i++) {
    const name = document.getElementById(`name-${i}`).value.trim();
    names.push(name);
  }
  // Validate: non-empty
  if (names.some(n => n === '')) {
    document.getElementById('setup-error').textContent = 'All names are required.';
    return;
  }
  // Validate: no duplicates
  if (new Set(names).size !== names.length) {
    document.getElementById('setup-error').textContent = 'Names must be unique.';
    return;
  }
  document.getElementById('setup-error').textContent = '';
  players = names;
  rounds = [];
  renderScoring();
  showScreen('scoring');
  saveState();
}

// Initialize
renderNameInputs();
```

- [ ] **Step 4: Verify in browser**

Open `index.html`. Expected:
- Mahjong toggle active (blue), Rummy inactive (grey)
- 3 name inputs shown
- Click "Rummy (4)" → 4 inputs appear, Rummy toggle turns blue
- Click "Start Game" with empty names → "All names are required." error
- Enter "A", "A", "B" → "Names must be unique." error
- Enter "Michelle", "Alton", "Sam" and click Start → screen switches (Scoring section is empty, that's fine)

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: setup screen with game type toggle, name inputs, validation"
```

---

## Task 3: Scoring Screen — Standings Panel + Round Entry Form

**Files:**
- Modify: `index.html` (the `#scoring` section + JS)

- [ ] **Step 1: Add Scoring screen HTML inside `<section id="scoring">`**

```html
<button class="btn-ghost" onclick="backToSetup()">← Back to Setup</button>

<div class="label">Standings</div>
<div class="panel" id="standings"></div>

<div class="label">Log a Transaction</div>
<div class="panel">
  <div style="margin-bottom:8px;">
    <div class="label">Who lost?</div>
    <select id="loser"></select>
  </div>
  <div style="margin-bottom:8px;">
    <div class="label">Who won?</div>
    <select id="winner"></select>
  </div>
  <div style="display:flex;gap:8px;align-items:end;">
    <div style="flex:1;">
      <div class="label">Points</div>
      <input type="number" id="points" inputmode="numeric" placeholder="0" min="1" step="1" style="margin-bottom:0;">
    </div>
    <button class="btn btn-primary" onclick="addRound()" style="width:auto;padding:14px 24px;margin-top:0;">+ Add</button>
  </div>
  <div id="scoring-error" style="color:#ef4444;font-size:14px;min-height:20px;margin-top:4px;"></div>
</div>

<div class="label">Round Log</div>
<div class="panel" id="round-log"></div>

<button class="btn btn-danger" onclick="endGame()">End Game — Settle Up</button>
```

- [ ] **Step 2: Add Scoring JS — render standings**

```javascript
function renderScoring() {
  renderStandings();
  renderDropdowns();
  renderRoundLog();
}

function getNetScores() {
  const scores = {};
  players.forEach(p => scores[p] = 0);
  rounds.forEach(r => {
    scores[r.loser] -= r.points;
    scores[r.winner] += r.points;
  });
  return scores;
}

function renderStandings() {
  const scores = getNetScores();
  const sorted = players.slice().sort((a, b) => scores[b] - scores[a]);
  const container = document.getElementById('standings');
  container.innerHTML = sorted.map(p => {
    const s = scores[p];
    const cls = s > 0 ? 'score-pos' : s < 0 ? 'score-neg' : 'score-zero';
    const prefix = s > 0 ? '+' : '';
    return `<div style="display:flex;justify-content:space-between;padding:6px 0;" class="${cls}">
      <span>${p}</span><span>${prefix}${s}</span>
    </div>`;
  }).join('');
}
```

- [ ] **Step 3: Add Scoring JS — dropdowns and add round**

```javascript
function renderDropdowns() {
  const loserSelect = document.getElementById('loser');
  const winnerSelect = document.getElementById('winner');
  loserSelect.innerHTML = players.map(p => `<option value="${p}">${p}</option>`).join('');
  updateWinnerDropdown();
  loserSelect.onchange = updateWinnerDropdown;
}

function updateWinnerDropdown() {
  const loser = document.getElementById('loser').value;
  const winnerSelect = document.getElementById('winner');
  const prev = winnerSelect.value;
  winnerSelect.innerHTML = players
    .filter(p => p !== loser)
    .map(p => `<option value="${p}">${p}</option>`)
    .join('');
  if (players.includes(prev) && prev !== loser) winnerSelect.value = prev;
}

function addRound() {
  const loser = document.getElementById('loser').value;
  const winner = document.getElementById('winner').value;
  const pointsInput = document.getElementById('points');
  const points = parseInt(pointsInput.value, 10);
  if (!points || points <= 0) {
    document.getElementById('scoring-error').textContent = 'Enter a valid point amount.';
    return;
  }
  document.getElementById('scoring-error').textContent = '';
  rounds.push({ loser, winner, points });
  pointsInput.value = '';
  renderStandings();
  renderRoundLog();
  saveState();
}
```

- [ ] **Step 4: Add navigation functions**

```javascript
function backToSetup() {
  if (rounds.length > 0 && !confirm('Go back to setup? All rounds will be lost.')) return;
  rounds = [];
  clearState();
  // Re-sync toggle buttons and re-render name inputs (needed if restored from sessionStorage)
  document.getElementById('btn-mahjong').classList.toggle('active', gameType === 'mahjong');
  document.getElementById('btn-rummy').classList.toggle('active', gameType === 'rummy');
  renderNameInputs();
  showScreen('setup');
}

function endGame() {
  if (!confirm('End the game and settle up?')) return;
  renderSettlement();
  showScreen('settlement');
}
```

- [ ] **Step 5: Verify in browser**

1. Start a game with Michelle, Alton, Sam
2. Standings show all 0
3. Select "Alton" lost, "Michelle" won, 30 points → Add
4. Standings: Michelle +30, Sam 0, Alton -30
5. Loser dropdown shows 3 names; winner excludes the selected loser
6. Enter 0 points → error message
7. "Back to Setup" with rounds → confirmation dialog appears

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: scoring screen with standings, round entry form, navigation"
```

---

## Task 4: Round Log with Undo/Delete

**Files:**
- Modify: `index.html` (JS + a bit of CSS)

- [ ] **Step 1: Add round log CSS**

```css
.round-entry {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; border-bottom: 1px solid #222; font-size: 14px;
}
.round-entry:last-child { border-bottom: none; }
.delete-btn {
  background: none; border: none; color: #ef4444; cursor: pointer;
  font-size: 18px; padding: 4px 8px; min-height: 36px; min-width: 36px;
}
```

- [ ] **Step 2: Add renderRoundLog function**

```javascript
function renderRoundLog() {
  const container = document.getElementById('round-log');
  if (rounds.length === 0) {
    container.innerHTML = '<div style="color:#666;font-size:14px;padding:4px 0;">No rounds yet</div>';
    return;
  }
  container.innerHTML = rounds.map((r, i) =>
    `<div class="round-entry">
      <span>#${i + 1}: ${r.loser} → ${r.winner}: ${r.points} pts</span>
      <button class="delete-btn" onclick="deleteRound(${i})" title="Delete">✕</button>
    </div>`
  ).join('');
}

function deleteRound(index) {
  rounds.splice(index, 1);
  renderStandings();
  renderRoundLog();
  saveState();
}
```

- [ ] **Step 3: Verify in browser**

1. Start game → "No rounds yet" shown
2. Add a round → appears as "#1: Alton → Michelle: 30 pts" with ✕ button
3. Add another round → "#2" appears
4. Delete #1 → list renumbers, standings recalculate
5. Delete all → "No rounds yet" returns

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: round log with delete/undo and empty state"
```

---

## Task 5: Settlement Algorithm (with tests)

**Files:**
- Modify: `index.html` (add `calculateSettlement` function)
- Create: `test.html`

The settlement algorithm is the core logic. We test it in a separate HTML file.

- [ ] **Step 1: Create `test.html` with test harness**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MahMahMia Tests</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #111; color: #eee; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
  </style>
</head>
<body>
  <h2>Settlement Algorithm Tests</h2>
  <div id="results"></div>
  <script>
    let passed = 0, failed = 0;
    function assert(name, actual, expected) {
      const ok = JSON.stringify(actual) === JSON.stringify(expected);
      const div = document.createElement('div');
      if (ok) {
        div.className = 'pass';
        div.textContent = `✓ ${name}`;
        passed++;
      } else {
        div.className = 'fail';
        div.textContent = `✗ ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
        failed++;
      }
      document.getElementById('results').appendChild(div);
    }

    // --- Duplicated from index.html — keep in sync ---
    function calculateSettlement(netScores) {
      // Invariant: net scores must sum to zero
      const sum = Object.values(netScores).reduce((a, b) => a + b, 0);
      if (sum !== 0) throw new Error(`Net scores do not sum to zero (sum=${sum})`);
      const debtors = [];
      const creditors = [];
      for (const [name, amount] of Object.entries(netScores)) {
        if (amount < 0) debtors.push({ name, amount: Math.abs(amount) });
        else if (amount > 0) creditors.push({ name, amount });
      }
      debtors.sort((a, b) => b.amount - a.amount);
      creditors.sort((a, b) => b.amount - a.amount);
      const transfers = [];
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

    // --- Tests ---
    // Test 1: Simple 2-player
    assert('Simple 2-player', calculateSettlement({ A: -30, B: 30 }), [{ from: 'A', to: 'B', amount: 30 }]);

    // Test 2: 3 players, one winner
    assert('3 players, one winner', calculateSettlement({ Michelle: 45, Alton: -30, Sam: -15 }),
      [{ from: 'Alton', to: 'Michelle', amount: 30 }, { from: 'Sam', to: 'Michelle', amount: 15 }]);

    // Test 3: All even
    assert('All even', calculateSettlement({ A: 0, B: 0, C: 0 }), []);

    // Test 4: 4 players, mixed debts
    assert('4 players mixed', calculateSettlement({ A: 50, B: -20, C: -10, D: -20 }),
      [{ from: 'B', to: 'A', amount: 20 }, { from: 'D', to: 'A', amount: 20 }, { from: 'C', to: 'A', amount: 10 }]);

    // Test 5: 3 players, 2 winners 1 loser
    assert('2 winners 1 loser', calculateSettlement({ A: -50, B: 30, C: 20 }),
      [{ from: 'A', to: 'B', amount: 30 }, { from: 'A', to: 'C', amount: 20 }]);

    // Test 6: 4 players, cross debts needing simplification
    assert('Cross debts simplified', calculateSettlement({ A: 30, B: -10, C: 10, D: -30 }),
      [{ from: 'D', to: 'A', amount: 30 }, { from: 'B', to: 'C', amount: 10 }]);

    // Summary
    const summary = document.createElement('div');
    summary.style.marginTop = '16px';
    summary.style.fontWeight = 'bold';
    summary.textContent = `${passed} passed, ${failed} failed`;
    summary.className = failed > 0 ? 'fail' : 'pass';
    document.getElementById('results').appendChild(summary);
  </script>
</body>
</html>
```

- [ ] **Step 2: Open `test.html` in browser and verify all tests pass**

Expected: 6 tests, all green checkmarks. "6 passed, 0 failed".

- [ ] **Step 3: Add `calculateSettlement` to `index.html`**

Add this function in the `<script>` section of `index.html` (identical to the test.html copy):

```javascript
function calculateSettlement(netScores) {
  // Invariant: net scores must sum to zero
  const sum = Object.values(netScores).reduce((a, b) => a + b, 0);
  if (sum !== 0) throw new Error(`Net scores do not sum to zero (sum=${sum})`);
  const debtors = [];
  const creditors = [];
  for (const [name, amount] of Object.entries(netScores)) {
    if (amount < 0) debtors.push({ name, amount: Math.abs(amount) });
    else if (amount > 0) creditors.push({ name, amount });
  }
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  const transfers = [];
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
```

- [ ] **Step 4: Commit**

```bash
git add index.html test.html
git commit -m "feat: settlement algorithm with 6 passing tests"
```

---

## Task 6: Settlement Screen

**Files:**
- Modify: `index.html` (the `#settlement` section + JS)

- [ ] **Step 1: Add Settlement screen HTML inside `<section id="settlement">`**

```html
<div style="text-align:center;margin-bottom:16px;">
  <div style="font-size:20px;font-weight:bold;">Game Over!</div>
</div>

<div class="label">Final Scores</div>
<div class="panel" id="final-scores"></div>

<div class="label">Who Pays Who</div>
<div class="panel" id="transfers"></div>

<button class="btn btn-primary" onclick="backToScoring()">← Back to Scoring</button>
<button class="btn btn-danger" onclick="newGame()">New Game</button>
```

- [ ] **Step 2: Add Settlement JS**

```javascript
function renderSettlement() {
  const scores = getNetScores();
  const sorted = players.slice().sort((a, b) => scores[b] - scores[a]);

  // Final scores
  document.getElementById('final-scores').innerHTML = sorted.map(p => {
    const s = scores[p];
    const cls = s > 0 ? 'score-pos' : s < 0 ? 'score-neg' : 'score-zero';
    const prefix = s > 0 ? '+' : '';
    return `<div style="display:flex;justify-content:space-between;padding:6px 0;" class="${cls}">
      <span>${p}</span><span>${prefix}${s}</span>
    </div>`;
  }).join('');

  // Transfers
  const transfers = calculateSettlement(scores);
  const container = document.getElementById('transfers');
  if (transfers.length === 0) {
    container.innerHTML = '<div style="color:#22c55e;text-align:center;padding:8px;">Everyone is even — nothing to settle!</div>';
  } else {
    container.innerHTML = transfers.map(t =>
      `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #222;">
        <span class="score-neg">${t.from}</span>
        <span style="color:#888;">→ pays →</span>
        <span class="score-pos">${t.to}</span>
        <span style="margin-left:auto;font-weight:bold;">${t.amount} pts</span>
      </div>`
    ).join('');
  }
}

function backToScoring() {
  showScreen('scoring');
}

function newGame() {
  players = [];
  rounds = [];
  gameType = 'mahjong';
  playerCount = 3;
  clearState();
  document.getElementById('btn-mahjong').classList.toggle('active', true);
  document.getElementById('btn-rummy').classList.toggle('active', false);
  renderNameInputs();
  showScreen('setup');
}
```

- [ ] **Step 3: Verify in browser**

1. Play a game: Michelle, Alton, Sam. Add: Alton→Michelle 30, Sam→Michelle 15
2. End Game → confirm → Settlement screen shows:
   - Final Scores: Michelle +45, Sam -15, Alton -30
   - Who Pays Who: Alton → pays → Michelle: 30 pts, Sam → pays → Michelle: 15 pts
3. "Back to Scoring" → returns with all data intact, can add more rounds
4. "New Game" → clears everything, back to Setup

- [ ] **Step 4: Test all-even edge case**

Start a game. Add: Alton→Michelle 10, Michelle→Alton 10. End Game.
Expected: "Everyone is even — nothing to settle!"

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: settlement screen with final scores and minimized transfers"
```

---

## Task 7: sessionStorage Auto-Save/Restore

**Files:**
- Modify: `index.html` (JS)

- [ ] **Step 1: Replace the persistence stubs (from Task 1) with real implementations**

```javascript
function saveState() {
  const state = { gameType, playerCount, players, rounds };
  sessionStorage.setItem('mahmahmia-state', JSON.stringify(state));
}

function clearState() {
  sessionStorage.removeItem('mahmahmia-state');
}

function restoreState() {
  const saved = sessionStorage.getItem('mahmahmia-state');
  if (!saved) return false;
  try {
    const state = JSON.parse(saved);
    gameType = state.gameType;
    playerCount = state.playerCount;
    players = state.players;
    rounds = state.rounds;
    return true;
  } catch (e) {
    clearState();
    return false;
  }
}
```

- [ ] **Step 2: Update initialization at bottom of script**

Replace the existing `renderNameInputs()` init call with:

```javascript
// Initialize
if (restoreState() && players.length > 0) {
  renderScoring();
  showScreen('scoring');
} else {
  renderNameInputs();
}
```

- [ ] **Step 3: Verify in browser**

1. Start a game, add 2 rounds
2. Refresh the page (F5 / pull-to-refresh)
3. Expected: Scoring screen appears with all rounds and standings intact
4. Click "New Game" → Setup screen. Refresh → stays on Setup (no stale restore)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: sessionStorage auto-save and crash recovery"
```

---

## Task 8: End-to-End Manual Verification

**Files:** None (testing only)

Full walkthrough on a mobile device or responsive mode.

- [ ] **Step 1: Setup flow**

1. Open `index.html` on phone (or Chrome DevTools mobile view)
2. Toggle Mahjong ↔ Rummy — input count changes (3 ↔ 4)
3. Try empty names → error
4. Try duplicate names → error
5. Enter Michelle, Alton, Sam → Start Game

- [ ] **Step 2: Scoring flow**

1. Standings: all 0
2. "No rounds yet" shown
3. Add: Alton lost, Michelle won, 30 pts → standings update, round log shows #1
4. Add: Sam lost, Michelle won, 15 pts → #2 appears
5. Verify winner dropdown excludes selected loser
6. Enter 0 points → error
7. Delete round #1 → standings recalculate, log renumbers
8. Re-add: Alton lost, Michelle won, 30 pts

- [ ] **Step 3: Crash recovery**

1. Refresh the page
2. Scoring screen loads with all data intact

- [ ] **Step 4: Settlement flow**

1. End Game → confirmation dialog → confirm
2. Final Scores: Michelle +45, Alton -30, Sam -15
3. Transfers: Alton → Michelle 30, Sam → Michelle 15
4. "Back to Scoring" → data intact, can fix mistakes
5. Re-settle → same result
6. "New Game" → clean Setup screen

- [ ] **Step 5: Edge case — all even**

1. New game: A, B, C
2. Add: A→B 10, B→A 10
3. End Game → "Everyone is even — nothing to settle!"

- [ ] **Step 6: Touch targets check**

Verify all buttons and inputs are comfortably tappable on mobile (min 48px height).

- [ ] **Step 7: Commit final state**

```bash
git add index.html test.html
git commit -m "chore: end-to-end verification complete"
```
