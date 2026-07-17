import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveState, restoreState, clearState, getClientId } from '../storage';
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
    await AsyncStorage.setItem('mahmahmia-state', '{not json');
    expect(await restoreState()).toBeNull();
    expect(await AsyncStorage.getItem('mahmahmia-state')).toBeNull();
  });

  it('discards structurally invalid state', async () => {
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
});
