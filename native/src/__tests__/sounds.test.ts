jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));

import { setSoundEnabled, isSoundEnabled } from '../sounds';

describe('sound mute flag', () => {
  it('defaults to enabled', () => {
    expect(isSoundEnabled()).toBe(true);
  });

  it('toggles', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });
});
