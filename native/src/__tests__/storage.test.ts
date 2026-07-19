import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveState, restoreState, clearState, getClientId, savePrefs, restorePrefs } from '../storage';
import { GameState } from '../types';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-uuid-1234' }));

const state: GameState = {
  gameType: 'rummy',
  playerCount: 4,
  players: ['A', 'B', 'C', 'D'],
  rounds: [{ loser: 'A', winner: 'B', points: 5 }],
  gameStartTime: 1_000_000,
};

beforeEach(() => AsyncStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe('storage', () => {
  it('round-trips state under the web-compatible key', async () => {
    await saveState(state);
    expect(await AsyncStorage.getItem('mahmahmia-state')).toBeTruthy();
    expect(await restoreState()).toEqual(state);
  });

  it('returns null when nothing saved', async () => {
    expect(await restoreState()).toBeNull();
  });

  it('discards corrupt JSON and clears it', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await AsyncStorage.setItem('mahmahmia-state', '{not json');
    expect(await restoreState()).toBeNull();
    expect(await AsyncStorage.getItem('mahmahmia-state')).toBeNull();
  });

  it('discards structurally invalid state', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await AsyncStorage.setItem('mahmahmia-state', JSON.stringify({ players: 'nope' }));
    expect(await restoreState()).toBeNull();
  });

  it('clearState removes the key', async () => {
    await saveState(state);
    await clearState();
    expect(await restoreState()).toBeNull();
  });

  it('getClientId creates once then reuses, under web-compatible key', async () => {
    const id1 = await getClientId();
    const id2 = await getClientId();
    expect(id1).toBe('test-uuid-1234');
    expect(id2).toBe(id1);
    expect(await AsyncStorage.getItem('mamamia_cid')).toBe(id1);
  });

  it('saveState resolves (does not reject) when AsyncStorage.setItem rejects', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(saveState(state)).resolves.toBeUndefined();
  });

  it('getClientId still returns a UUID string when AsyncStorage.getItem rejects', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk full'));
    expect(await getClientId()).toBe('test-uuid-1234');
  });
});

describe('prefs', () => {
  it('returns defaults when nothing saved', async () => {
    expect(await restorePrefs()).toEqual({ dark: false, sound: true });
  });

  it('round-trips saved prefs', async () => {
    await savePrefs({ dark: true, sound: false });
    expect(await restorePrefs()).toEqual({ dark: true, sound: false });
  });

  it('falls back to defaults on corrupt JSON', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await AsyncStorage.setItem('mahmahmia-prefs', '{not json');
    expect(await restorePrefs()).toEqual({ dark: false, sound: true });
  });
});
