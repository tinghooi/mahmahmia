import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { INTERSTITIAL_UNIT_ID } from './config';

const interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

let loaded = false;

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
  if (loaded) interstitial.show();
}
