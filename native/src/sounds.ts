import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

let players: { coin: AudioPlayer; settle: AudioPlayer; del: AudioPlayer } | null = null;

let soundEnabled = true;

export function setSoundEnabled(v: boolean): void {
  soundEnabled = v;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export async function initSounds(): Promise<void> {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    players = {
      coin: createAudioPlayer(require('../assets/sounds/coin.wav')),
      settle: createAudioPlayer(require('../assets/sounds/settle.wav')),
      del: createAudioPlayer(require('../assets/sounds/delete.wav')),
    };
  } catch (e) {
    console.error('sound init failed', e);
  }
}

function play(p: AudioPlayer | undefined): void {
  if (!p || !soundEnabled) return;
  try {
    p.seekTo(0);
    p.play();
  } catch (e) {
    console.error('sound play failed', e);
  }
}

export const soundCoin = (): void => play(players?.coin);
export const soundSettle = (): void => play(players?.settle);
export const soundDelete = (): void => play(players?.del);
