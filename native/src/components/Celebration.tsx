import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';
import { fmt } from '../logic/game';

export function isBigWin(points: number, threshold = 3000): boolean {
  return points >= threshold;
}

const CHARS = ['🀄', '💰', '🧧', '💵', '🪙', '✨', '🎉', '👑'];
const PIECE_COUNT = 16;
const DURATION_MS = 2300;

interface Piece {
  left: number;
  size: number;
  char: string;
  delay: number;
  fall: Animated.Value;
  rotate: number;
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => ({
    left: Math.round(Math.random() * 96),
    size: 20 + Math.random() * 18,
    char: CHARS[i % CHARS.length],
    delay: Math.random() * 350,
    fall: new Animated.Value(0),
    rotate: 360 + Math.random() * 540,
  }));
}

export interface CelebrationProps {
  theme: Theme;
  winnerName: string;
  points: number;
  onDone(): void;
}

export function Celebration({ theme: t, winnerName, points, onDone }: CelebrationProps) {
  const pieces = useRef(makePieces()).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }).start();
    const anims = pieces.map(p =>
      Animated.timing(p.fall, {
        toValue: 1,
        duration: 1300 + Math.random() * 900,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      })
    );
    Animated.parallel(anims).start();
    const timer = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.overlay} pointerEvents="none">
      {pieces.map((p, i) => {
        const translateY = p.fall.interpolate({ inputRange: [0, 1], outputRange: [-40, 860] });
        const rotate = p.fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotate}deg`] });
        const opacity = p.fall.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 1, 0] });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.piece,
              { left: `${p.left}%`, fontSize: p.size, opacity, transform: [{ translateY }, { rotate }] },
            ]}
          >
            {p.char}
          </Animated.Text>
        );
      })}
      <Animated.View style={[styles.center, { transform: [{ scale: pop }], opacity: pop }]}>
        <Text style={styles.emoji}>🤑</Text>
        <Text style={[styles.text, { color: t.gold, fontFamily: fontFamily.cjkBlack }]}>赢麻了!</Text>
        <Text style={[styles.sub, { fontFamily: fontFamily.displayExtraBold }]}>
          {winnerName} +{fmt(points)}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  piece: { position: 'absolute', top: 0 },
  center: { alignItems: 'center' },
  emoji: { fontSize: 76, lineHeight: 80 },
  text: { fontSize: 48, marginTop: 4 },
  sub: { fontSize: 20, color: '#fff', marginTop: 6 },
});
