import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_UNIT_ID } from './config';

export function AppBannerAd() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  return (
    <View style={{ width: '100%', alignItems: 'center', minHeight: 50 }}>
      <BannerAd
        // Remount on rotation so the adaptive banner re-requests the correct
        // width — it caches a fixed pixel size from its first load otherwise.
        key={isLandscape ? 'land' : 'port'}
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
