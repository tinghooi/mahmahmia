import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';
import { TileIcon } from '../components/TileIcon';

export interface SplashScreenProps {
  theme: Theme;
  onStart(): void;
}

export function SplashScreen({ theme: t, onStart }: SplashScreenProps) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  const scale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TileIcon size={132} />
      </Animated.View>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: t.ink, fontFamily: fontFamily.displayExtraBold }]}>MahMahMia</Text>
        <Text style={[styles.subtitle, { color: t.mut }]}>记分神器 · Game-night score tracker</Text>
      </View>
      <View style={styles.tags}>
        <Text style={[styles.tag, { color: t.gold, backgroundColor: t.field, borderColor: t.line }]}>麻将 Mahjong</Text>
        <Text style={[styles.tag, { color: t.gold, backgroundColor: t.field, borderColor: t.line }]}>拉米 Rummy</Text>
      </View>
      <Pressable onPress={onStart} style={[styles.startBtn, { backgroundColor: t.green }]}>
        <Text style={[styles.startText, { fontFamily: fontFamily.uiBold }]}>开局 · Start  →</Text>
      </Pressable>
      <Text style={[styles.footer, { color: t.sub }]}>Built for game nights · © 2026 NexvanceTech</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 32 },
  titleBlock: { alignItems: 'center' },
  title: { fontSize: 42, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 10, letterSpacing: 0.4, textAlign: 'center' },
  tags: { flexDirection: 'row', gap: 8 },
  tag: { fontSize: 12, fontWeight: '600', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  startBtn: {
    marginTop: 14, paddingVertical: 17, paddingHorizontal: 54, borderRadius: 16,
    shadowColor: '#2E7D4F', shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  startText: { color: '#fff', fontSize: 18 },
  footer: { position: 'absolute', bottom: 40, fontSize: 12 },
});
