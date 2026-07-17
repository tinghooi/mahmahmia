import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { GameState } from './types';

const STATE_KEY = 'mahmahmia-state';
const CID_KEY = 'mamamia_cid';

export async function saveState(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('saveState failed', e);
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATE_KEY);
  } catch (e) {
    console.error('clearState failed', e);
  }
}

export async function restoreState(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!Array.isArray(s.players) || !Array.isArray(s.rounds)) throw new Error('invalid');
    return {
      gameType: s.gameType === 'rummy' ? 'rummy' : 'mahjong',
      playerCount: typeof s.playerCount === 'number' ? s.playerCount : s.players.length,
      players: s.players,
      rounds: s.rounds,
      gameStartTime: s.gameStartTime || Date.now(),
    };
  } catch (e) {
    console.error('restoreState failed', e);
    await clearState();
    return null;
  }
}

export async function getClientId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(CID_KEY);
    if (!id) {
      id = Crypto.randomUUID();
      await AsyncStorage.setItem(CID_KEY, id);
    }
    return id;
  } catch (e) {
    console.error('getClientId failed', e);
    return Crypto.randomUUID();
  }
}
