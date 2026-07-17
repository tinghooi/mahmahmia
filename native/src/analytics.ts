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
