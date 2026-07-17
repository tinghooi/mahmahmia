import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { fmt, getNetScores, getTitle, sortByScore } from '../logic/game';
import { Round } from '../types';
import { colors, panelStyle } from '../theme';

interface Props {
  players: string[];
  rounds: Round[];
  showTitles: boolean;
  flashKey?: number;
}

export function ScorePanel({ players, rounds, showTitles, flashKey }: Props) {
  const flash = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 800, useNativeDriver: false }).start();
  }, [flashKey, flash]);

  const scores = getNetScores(players, rounds);
  const sorted = sortByScore(players, scores);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const borderColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(196,135,59,0)', 'rgba(196,135,59,1)'],
  });

  const scoreColor = (s: number) => (s > 0 ? colors.green : s < 0 ? colors.red : colors.muted);

  return (
    <Animated.View style={[panelStyle, styles.panel, { borderColor }]}>
      {sorted.map((p, i) => {
        const s = scores[p];
        const t = getTitle(s, p === top, p === bottom);
        return (
          <View key={p} style={[styles.row, i < sorted.length - 1 && styles.rowBorder]}>
            <View style={styles.rowTop}>
              <Text style={[styles.name, { color: scoreColor(s) }]}>{p}</Text>
              <Text style={[styles.score, { color: scoreColor(s) }]}>
                {s > 0 ? '+' : ''}{fmt(s)}
              </Text>
            </View>
            {showTitles && rounds.length > 0 && (
              <Text style={[styles.title, { color: scoreColor(s) }]}>
                {t.emoji} {t.text}
              </Text>
            )}
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 3, borderTopColor: colors.gold, borderWidth: 2, borderColor: 'transparent' },
  row: { paddingVertical: 8 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.rowDivider },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '600', fontSize: 16 },
  score: { fontWeight: '700', fontSize: 18 },
  title: { fontSize: 12, marginTop: 2, opacity: 0.65 },
});
