import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { INTERSTITIAL_UNIT_ID } from './config';

const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

export const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;

let loaded = false;
let lastShownAt: number | null = null;

interstitial.addAdEventListener(AdEventType.LOADED, () => {
  loaded = true;
});
interstitial.addAdEventListener(AdEventType.CLOSED, () => {
  loaded = false;
  interstitial.load();
});

export function loadInterstitial() {
  interstitial.load();
}

export function showInterstitial() {
  if (!loaded) return;
  const now = Date.now();
  if (lastShownAt !== null && now - lastShownAt < INTERSTITIAL_COOLDOWN_MS) return;
  lastShownAt = now;
  interstitial.show();
}
