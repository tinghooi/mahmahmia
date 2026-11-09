const mockShow = jest.fn();
const mockLoad = jest.fn();
const listeners: Record<string, () => void> = {};

jest.mock('react-native-google-mobile-ads', () => ({
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed' },
  TestIds: { BANNER: 'banner', INTERSTITIAL: 'interstitial' },
  InterstitialAd: {
    createForAdRequest: () => ({
      addAdEventListener: (type: string, cb: () => void) => { listeners[type] = cb; },
      load: () => mockLoad(),
      show: () => mockShow(),
    }),
  },
}));

import { showInterstitial, INTERSTITIAL_COOLDOWN_MS } from '../interstitial';

describe('showInterstitial cooldown', () => {
  let now = 1_000_000;
  beforeEach(() => {
    mockShow.mockClear();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });
  afterEach(() => jest.restoreAllMocks());

  it('does not show before an ad is loaded', () => {
    showInterstitial();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it('shows once, blocks back-to-back, allows again after the cooldown', () => {
    listeners.loaded();
    showInterstitial();
    expect(mockShow).toHaveBeenCalledTimes(1);

    listeners.closed(); // ad closed, next one reloads
    listeners.loaded();
    now += 1000;
    showInterstitial();
    expect(mockShow).toHaveBeenCalledTimes(1);

    now += INTERSTITIAL_COOLDOWN_MS;
    showInterstitial();
    expect(mockShow).toHaveBeenCalledTimes(2);
  });
});
