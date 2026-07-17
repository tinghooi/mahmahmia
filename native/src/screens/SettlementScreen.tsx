import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScorePanel } from '../components/ScorePanel';
import { calculateSettlement, fmt, getNetScores, settlementFlavor, sortByScore } from '../logic/game';
import { Round } from '../types';
import { colors, panelStyle } from '../theme';

export interface SettlementScreenProps {
  players: string[];
  rounds: Round[];
  onBackToScoring(): void;
  onNewGame(): void;
}

export function SettlementScreen({ players, rounds, onBackToScoring, onNewGame }: SettlementScreenProps) {
  const scores = getNetScores(players, rounds);
  const sorted = sortByScore(players, scores);
  const transfers = calculateSettlement(scores);
  // Pick once per settlement visit, like the web's renderSettlement
  const [flavor] = useState(() =>
    settlementFlavor(sorted[0], sorted[sorted.length - 1], transfers.length > 0)
  );

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.gameOver}>Game Over!</Text>
        <Text style={styles.flavor}>{flavor}</Text>
      </View>

      <Text style={styles.label}>Final Scores</Text>
      <ScorePanel players={players} rounds={rounds} showTitles={false} />

      <Text style={styles.label}>Who Pays Who</Text>
      <View style={panelStyle}>
        {transfers.length === 0 ? (
          <Text style={styles.even}>大家打平了！</Text>
        ) : (
          transfers.map((t, i) => (
            <View key={i} style={[styles.transferRow, i < transfers.length - 1 && styles.transferBorder]}>
              <Text style={styles.from}>{t.from}</Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.to}>{t.to}</Text>
              <Text style={styles.amount}>{fmt(t.amount)} pts</Text>
            </View>
          ))
        )}
      </View>

      <Pressable style={[styles.btn, { backgroundColor: colors.gold }]} onPress={onBackToScoring}>
        <Text style={styles.btnText}>← Back to Scoring</Text>
      </Pressable>
      <Pressable style={[styles.btn, { backgroundColor: colors.red }]} onPress={onNewGame}>
        <Text style={styles.btnText}>New Game</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 16 },
  gameOver: { fontSize: 20, fontWeight: 'bold', color: colors.gold },
  flavor: { color: colors.gold, fontSize: 14, marginTop: 6 },
  label: {
    fontSize: 12, textTransform: 'uppercase', color: colors.muted,
    letterSpacing: 0.5, marginBottom: 6,
  },
  even: { color: colors.green, textAlign: 'center', padding: 8 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  transferBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  from: { color: colors.red, fontWeight: '600', fontSize: 16 },
  arrow: { color: colors.muted },
  to: { color: colors.green, fontWeight: '600', fontSize: 16 },
  amount: { marginLeft: 'auto', fontWeight: '800', fontSize: 18, color: colors.text },
  btn: {
    borderRadius: 10, padding: 14, minHeight: 48, alignItems: 'center', marginTop: 12,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
