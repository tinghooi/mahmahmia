import { GameState } from '../types';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid-1234' }));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-MY' }],
  getCalendars: () => [{ timeZone: 'Asia/Kuala_Lumpur' }],
}));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));

import { logGameEnd, trackFeature, resetFeatures } from '../analytics';

const state: GameState = {
  gameType: 'mahjong',
  playerCount: 3,
  players: ['A', 'B', 'C'],
  rounds: [{ loser: 'A', winner: 'B', points: 10 }],
  gameStartTime: Date.now() - 60_000,
};

describe('logGameEnd', () => {
  beforeEach(() => {
    resetFeatures();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
  });

  it('POSTs the mapped row to Supabase REST', async () => {
    trackFeature('undo');
    await logGameEnd(state);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://rayamhtdgqgrtsjkkhrs.supabase.co/rest/v1/game_sessions');
    expect(opts.method).toBe('POST');
    expect(opts.headers.apikey).toBeTruthy();
    expect(opts.headers.Authorization).toMatch(/^Bearer /);
    const row = JSON.parse(opts.body);
    expect(row).toMatchObject({
      client_id: 'test-uuid-1234',
      game_type: 'mahjong',
      player_count: 3,
      transaction_count: 1,
      locale: 'en-MY',
      referrer: 'app',
      app_version: '1.0.0',
      tz: 'Asia/Kuala_Lumpur',
      max_score_spread: 20,
      features_used: 'undo',
      utm_source: null,
    });
    expect(row.device).toMatch(/^(ios|android)-app$/);
    expect(typeof row.duration_sec).toBe('number');
    expect(typeof row.screen_width).toBe('number');
    expect(typeof row.hour_local).toBe('number');
  });

  it('features_used is null when nothing tracked', async () => {
    await logGameEnd(state);
    const row = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(row.features_used).toBeNull();
  });

  it('never throws on network failure', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(logGameEnd(state)).resolves.toBeUndefined();
  });
});
