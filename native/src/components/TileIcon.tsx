import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fontFamily } from '../fonts';

export interface TileIconProps {
  size: number;
  variant?: 'green' | 'ruby' | 'gold' | 'dark' | 'mono';
}

const GRADIENTS: Record<NonNullable<TileIconProps['variant']>, [string, string]> = {
  green: ['#41946A', '#1C6440'],
  ruby: ['#C6533F', '#932619'],
  gold: ['#D8A852', '#AE7A1F'],
  dark: ['#2C2620', '#12100C'],
  mono: ['#EEE7D9', '#DBD1BD'],
};

export function TileIcon({ size, variant = 'green' }: TileIconProps) {
  const r = Math.round(size * 0.225);
  const tileW = Math.round(size * 0.5);
  const tileH = Math.round(size * 0.66);
  const tileR = Math.round(size * 0.1);
  const charSize = Math.round(size * 0.38);

  return (
    <LinearGradient
      colors={GRADIENTS[variant]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: r },
      ]}
    >
      <View
        style={[
          styles.tile,
          { width: tileW, height: tileH, borderRadius: tileR },
        ]}
      >
        <Text style={[styles.char, { fontSize: charSize, fontFamily: fontFamily.cjkBlack }]}>中</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tile: {
    backgroundColor: '#FCF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  char: {
    color: '#C0392B',
    lineHeight: undefined,
  },
});
