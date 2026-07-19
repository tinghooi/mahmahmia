import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScorePanel } from '../components/ScorePanel';
import { calculateSettlement, fmt, getNetScores, settlementFlavor, sortByScore } from '../logic/game';
import { Round } from '../types';
import { Theme, panelStyle } from '../theme';
import { fontFamily } from '../fonts';

export interface SettlementScreenProps {
  theme: Theme;
  players: string[];
  rounds: Round[];
  onBackToScoring(): void;
  onNewGame(): void;
}

export function SettlementScreen({ theme: t, players, rounds, onBackToScoring, onNewGame }: SettlementScreenProps) {
  const scores = getNetScores(players, rounds);
  const sorted = sortByScore(players, scores);
  const transfers = calculateSettlement(scores);
  const [flavor] = useState(() =>
    settlementFlavor(sorted[0], sorted[sorted.length - 1], transfers.length > 0)
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.gameOver, { color: t.gold, fontFamily: fontFamily.displayExtraBold }]}>Game Over! · 收工</Text>
        <Text style={[styles.flavor, { color: t.mut }]}>{flavor}</Text>
      </View>

      <Text style={[styles.eyebrow, { color: t.mut }]}>FINAL SCORES · 最终得分</Text>
      <ScorePanel theme={t} players={players} rounds={rounds} showTitles={false} />

      <Text style={[styles.eyebrow, { color: t.mut }]}>WHO PAYS WHO · 谁付谁</Text>
      <View style={panelStyle(t)}>
        {transfers.length === 0 ? (
          <Text style={[styles.even, { color: t.green }]}>大家打平了！</Text>
        ) : (
          transfers.map((tr, i) => (
            <View key={i} style={[styles.transferRow, i < transfers.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.line }]}>
              <Text style={[styles.from, { color: t.red, fontFamily: fontFamily.displayBold }]}>{tr.from}</Text>
              <Text style={[styles.arrow, { color: t.mut }]}>→</Text>
              <Text style={[styles.to, { color: t.green, fontFamily: fontFamily.displayBold }]}>{tr.to}</Text>
              <Text style={[styles.amount, { color: t.ink, fontFamily: fontFamily.displayExtraBold }]}>{fmt(tr.amount)} pts</Text>
            </View>
          ))
        )}
      </View>

      <Pressable style={[styles.btn, { backgroundColor: t.gold }]} onPress={onBackToScoring}>
        <Text style={[styles.btnText, { fontFamily: fontFamily.uiBold }]}>← Back to Scoring</Text>
      </Pressable>
      <Pressable style={[styles.btn, { backgroundColor: t.red }]} onPress={onNewGame}>
        <Text style={[styles.btnText, { fontFamily: fontFamily.uiBold }]}>New Game · 再来一局</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  header: { alignItems: 'center', marginBottom: 8 },
  gameOver: { fontSize: 32, letterSpacing: -0.2 },
  flavor: { fontSize: 15, marginTop: 6 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: -4 },
  even: { textAlign: 'center', padding: 8, fontSize: 14 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  from: { fontSize: 18 },
  arrow: {},
  to: { fontSize: 18 },
  amount: { marginLeft: 'auto', fontSize: 19 },
  btn: { borderRadius: 16, padding: 17, minHeight: 48, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17 },
});
