# Supabase Anonymous Analytics — Design Spec

## Goal

Add anonymous usage analytics to Mamamia so the developer can understand user behavior (game types, session length, engagement, geography, new vs returning users, retention) without collecting any personal data.

## Approach

One Supabase table, one insert at settlement time, fire-and-forget. No UI changes, no user friction.

## Supabase Configuration

- **Project URL:** `https://rayamhtdgqgrtsjkkhrs.supabase.co`
- **Client key:** Anon/public key (embedded in client-side code — safe by design)
- **Client library:** Supabase JS v2 via CDN (`<script>` tag)

## Database Schema

```sql
CREATE TABLE game_sessions (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         text,
  game_type         text NOT NULL,
  player_count      int NOT NULL,
  transaction_count int NOT NULL,
  duration_sec      int NOT NULL,
  device            text,
  locale            text,
  screen_width      int,
  referrer          text,
  app_version       text,
  created_at        timestamptz DEFAULT now()
);
```

### Column Definitions

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Auto-generated primary key |
| `client_id` | text | Anonymous random UUID per browser — stored in `localStorage`, enables new-vs-returning and retention tracking |
| `game_type` | text | `'mahjong'` or `'rummy'` |
| `player_count` | int | Number of players (3 or 4) |
| `transaction_count` | int | Number of score transactions logged in the session |
| `duration_sec` | int | Seconds from game start to settlement |
| `device` | text | `'mobile'` or `'desktop'` — detected via `navigator.userAgentData?.mobile` with width fallback |
| `locale` | text | Browser language, e.g. `'zh-MY'`, `'en-MY'` |
| `screen_width` | int | Viewport width in pixels |
| `referrer` | text | Where the user came from — `document.referrer` or `'direct'` |
| `app_version` | text | Hardcoded version string, e.g. `'1.0'` |
| `created_at` | timestamptz | Auto-set by Supabase |

## Row Level Security

```sql
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_only" ON game_sessions
  FOR INSERT TO anon WITH CHECK (true);
```

No SELECT, UPDATE, or DELETE policies — anon key can only insert. Data is readable only via Supabase dashboard or service role key.

## Code Changes (index.html)

### 1. Add Supabase CDN in `<head>`

Pin to exact version to avoid unexpected changes from floating `@2` tag:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js"></script>
```

### 2. Initialize client

```js
const SUPABASE_URL = 'https://rayamhtdgqgrtsjkkhrs.supabase.co';
const SUPABASE_ANON_KEY = '...anon key...';
const APP_VERSION = '1.0';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 3. Add top-level helpers

Defined at top level alongside other helpers (`soundCoin`, `funToast`, etc.):

```js
function getClientId() {
  let id = localStorage.getItem('mamamia_cid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('mamamia_cid', id);
  }
  return id;
}

function detectDevice() {
  if (navigator.userAgentData?.mobile !== undefined) {
    return navigator.userAgentData.mobile ? 'mobile' : 'desktop';
  }
  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}
```

### 4. Record start time

In `startGame()`, record the timestamp. Also persist it in `saveState()` and restore it in `restoreState()` so crash recovery doesn't lose the start time:

```js
// In startGame():
gameStartTime = Date.now();

// In saveState() — add to the saved object:
gameStartTime: gameStartTime

// In restoreState() — restore with fallback:
gameStartTime = saved.gameStartTime || Date.now();
```

### 5. Fire analytics on settlement

In `endGame()`, **inside the confirm branch, after `renderSettlement()` and `soundSettle()`**. The existing `endGame()` has a `if (!confirm(...)) return;` guard — the insert must be placed after that guard, not before it.

```js
sb.from('game_sessions').insert({
  client_id: getClientId(),
  game_type: gameType,
  player_count: players.length,
  transaction_count: rounds.length,
  duration_sec: Math.round((Date.now() - gameStartTime) / 1000),
  device: detectDevice(),
  locale: navigator.language,
  screen_width: window.innerWidth,
  referrer: document.referrer || 'direct',
  app_version: APP_VERSION
});
```

No `await`, no `.then()`, no error handling. Fire and forget. If offline or Supabase is down, the app is unaffected.

## What Does NOT Change

- All existing UI and gameplay functionality
- sessionStorage crash recovery
- Settlement algorithm
- Sound effects and flavor text
- No consent popups needed (no personal data collected)

## Privacy Compliance (PDPA / GDPR)

- No personal identifiers stored in `game_sessions` table (no name, email, device ID)
- `client_id` is a random UUID stored in `localStorage` — not tied to any personal info, resets if user clears browser data, cannot identify a real person
- Note: Client IP addresses may appear in Supabase infrastructure/access logs (standard for any HTTP service) but are not stored in the application table
- `locale` and `screen_width` alone cannot identify a person
- No cookies set by this integration
- Data is aggregate behavioral analytics only
- No data resale — analytics are for product improvement

## Queries the Developer Can Run

```sql
-- Games per day
SELECT DATE(created_at), COUNT(*) FROM game_sessions GROUP BY 1 ORDER BY 1;

-- Most popular game type
SELECT game_type, COUNT(*) FROM game_sessions GROUP BY 1;

-- Average session duration
SELECT AVG(duration_sec) / 60 AS avg_minutes FROM game_sessions;

-- Average transactions per game
SELECT AVG(transaction_count) FROM game_sessions;

-- Mobile vs desktop
SELECT device, COUNT(*) FROM game_sessions GROUP BY 1;

-- User language/region preference
SELECT locale, COUNT(*) FROM game_sessions GROUP BY 1 ORDER BY 2 DESC;

-- Engagement over time (weekly active games)
SELECT DATE_TRUNC('week', created_at) AS week, COUNT(*) FROM game_sessions GROUP BY 1 ORDER BY 1;

-- Unique users vs total sessions
SELECT COUNT(DISTINCT client_id) AS unique_users, COUNT(*) AS total_sessions FROM game_sessions;

-- New vs returning users this week
SELECT
  CASE WHEN first_seen = DATE(gs.created_at) THEN 'new' ELSE 'returning' END AS user_type,
  COUNT(DISTINCT gs.client_id)
FROM game_sessions gs
JOIN (
  SELECT client_id, MIN(DATE(created_at)) AS first_seen
  FROM game_sessions GROUP BY 1
) f ON gs.client_id = f.client_id
WHERE gs.created_at > now() - interval '7 days'
GROUP BY 1;

-- Weekly retention (played this week AND last week)
SELECT COUNT(DISTINCT client_id) FROM game_sessions
WHERE created_at > now() - interval '7 days'
AND client_id IN (
  SELECT client_id FROM game_sessions
  WHERE created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days'
);

-- Power users (5+ games)
SELECT client_id, COUNT(*) AS games FROM game_sessions GROUP BY 1 HAVING COUNT(*) >= 5;

-- Traffic sources
SELECT referrer, COUNT(*) FROM game_sessions GROUP BY 1 ORDER BY 2 DESC;
```

## Hosting

Deploy the single `index.html` to Vercel (connected to GitHub repo, auto-deploys on push). Free tier is sufficient.
