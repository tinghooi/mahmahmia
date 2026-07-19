import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { fmt, getNetScores, getTitle, sortByScore } from '../logic/game';
import { Round } from '../types';
import { Theme, panelStyle } from '../theme';
import { fontFamily } from '../fonts';
import { useLayout } from '../responsive';

interface Props {
  theme: Theme;
  players: string[];
  rounds: Round[];
  showTitles: boolean;
  flashKey?: number;
}

export function ScorePanel({ theme: t, players, rounds, showTitles, flashKey }: Props) {
  const sz = useLayout();
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
    outputRange: [t.gold + '00', t.gold],
  });

  const scoreColor = (s: number) => (s > 0 ? t.green : s < 0 ? t.red : t.ink);

  return (
    <Animated.View style={[panelStyle(t), styles.panel, { borderTopColor: t.gold, borderColor, padding: sz.scale(16) }]}>
      {sorted.map((p, i) => {
        const s = scores[p];
        const title = getTitle(s, p === top, p === bottom);
        return (
          <View key={p} style={[styles.row, i < sorted.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.line }]}>
            <View style={styles.rowTop}>
              <Text style={[styles.name, { color: scoreColor(s), fontFamily: fontFamily.displayExtraBold, fontSize: sz.scale(20) }]}>{p}</Text>
              <Text style={[styles.score, { color: scoreColor(s), fontFamily: fontFamily.displayExtraBold, fontSize: sz.scale(22) }]}>
                {s > 0 ? '+' : ''}{fmt(s)}
              </Text>
            </View>
            {showTitles && rounds.length > 0 && (
              <Text style={[styles.title, { color: scoreColor(s), fontSize: sz.scale(12.5) }]}>
                {title.emoji} {title.text}
              </Text>
            )}
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { borderTopWidth: 3, borderWidth: 2 },
  row: { paddingVertical: 10 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 20 },
  score: { fontSize: 22 },
  title: { fontSize: 12.5, marginTop: 3, opacity: 0.9, fontWeight: '600' },
});
