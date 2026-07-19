import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// Dev/test builds always use Google's test IDs so no real ad policy is at risk.
// Production builds use the real per-platform AdMob ad unit IDs below.
const REAL_BANNER_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-1429190507392497/4909277940',
  android: 'ca-app-pub-1429190507392497/3352653697',
})!;

const REAL_INTERSTITIAL_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-1429190507392497/9921363255',
  android: 'ca-app-pub-1429190507392497/1196695422',
})!;

export const BANNER_UNIT_ID = __DEV__ ? TestIds.BANNER : REAL_BANNER_UNIT_ID;
export const INTERSTITIAL_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : REAL_INTERSTITIAL_UNIT_ID;
