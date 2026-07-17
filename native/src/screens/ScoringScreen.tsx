import React, { useState } from 'react';
import {
  Alert, Keyboard, Pressable, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { ScorePanel } from '../components/ScorePanel';
import { buildShareText, evalExpr, fmt, getRecentAmounts } from '../logic/game';
import { trackFeature } from '../analytics';
import { GameType, Round } from '../types';
import { colors, panelStyle } from '../theme';

export interface ScoringScreenProps {
  players: string[];
  gameType: GameType;
  rounds: Round[];
  gameStartTime: number;
  onAddRound(loser: string, winner: string, points: number): void;
  onDeleteRound(index: number): void;
  onBack(): void;
  onEndGame(): void;
}

export function ScoringScreen({
  players, gameType, rounds, gameStartTime,
  onAddRound, onDeleteRound, onBack, onEndGame,
}: ScoringScreenProps) {
  useKeepAwake();
  const [loser, setLoser] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [points, setPoints] = useState('');
  const [error, setError] = useState('');
  const [logOpen, setLogOpen] = useState(false);

  const selectLoser = (name: string) => {
    setLoser(name);
    if (winner === name) setWinner(null);
  };

  const selectWinner = (name: string) => {
    if (name === loser) return;
    setWinner(name);
  };

  const add = () => {
    if (!loser || !winner) {
      setError('Select who pays and who gets.');
      return;
    }
    const pts = evalExpr(points);
    if (!pts || pts <= 0 || isNaN(pts)) {
      setError('Enter a valid point amount.');
      return;
    }
    setError('');
    setPoints('');
    Keyboard.dismiss();
    onAddRound(loser, winner, pts);
  };

  const share = async () => {
    if (rounds.length === 0) return;
    try {
      await Share.share({ message: buildShareText(gameType, players, rounds, gameStartTime, Date.now()) });
    } catch {
      // user cancelled — nothing to do
    }
  };

  const confirmEnd = () => {
    Alert.alert('', 'End the game and settle up?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onEndGame },
    ]);
  };

  const quickAmounts = getRecentAmounts(rounds);

  return (
    <View>
      <Pressable onPress={onBack} style={styles.ghostBtn}>
        <Text style={styles.ghostText}>← Back to Setup</Text>
      </Pressable>

      <View style={styles.standingsHeader}>
        <Text style={styles.label}>Standings</Text>
        {rounds.length > 0 && (
          <Pressable onPress={share} style={styles.shareBtn}>
            <Text style={styles.shareText}>↗ Share</Text>
          </Pressable>
        )}
      </View>
      <ScorePanel players={players} rounds={rounds} showTitles flashKey={rounds.length} />

      <View style={panelStyle}>
        <Text style={styles.label}>Who pays?</Text>
        <View style={styles.playerRow}>
          {players.map(p => (
            <Pressable
              key={`l-${p}`}
              onPress={() => selectLoser(p)}
              style={[styles.playerBtn, loser === p && styles.loserSelected]}
            >
              <Text style={[styles.playerBtnText, loser === p && { color: colors.red }]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Who gets?</Text>
        <View style={styles.playerRow}>
          {players.map(p => (
            <Pressable
              key={`w-${p}`}
              onPress={() => selectWinner(p)}
              disabled={p === loser}
              style={[
                styles.playerBtn,
                winner === p && styles.winnerSelected,
                p === loser && { opacity: 0.25 },
              ]}
            >
              <Text style={[styles.playerBtnText, winner === p && { color: colors.green }]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        {quickAmounts.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 10 }]}>Quick</Text>
            <View style={styles.playerRow}>
              {quickAmounts.map(a => (
                <Pressable
                  key={a}
                  onPress={() => { trackFeature('quick_amount'); setPoints(String(a)); }}
                  style={styles.quickBtn}
                >
                  <Text style={styles.quickText}>{a}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={styles.addRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Points</Text>
            <TextInput
              style={styles.input}
              value={points}
              onChangeText={setPoints}
              keyboardType="decimal-pad"
              onSubmitEditing={add}
            />
          </View>
          <Pressable onPress={add} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>
        <Text style={styles.error}>{error}</Text>
      </View>

      <Pressable
        onPress={() => { trackFeature('log_view'); setLogOpen(o => !o); }}
        style={styles.logHeader}
      >
        <Text style={styles.label}>Log ({rounds.length})</Text>
        <Text style={[styles.chevron, logOpen && { transform: [{ rotate: '90deg' }] }]}>▸</Text>
      </Pressable>
      {logOpen && (
        <View style={panelStyle}>
          {rounds.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 14 }}>No entries yet</Text>
          ) : (
            rounds.slice().reverse().map((r, i) => {
              const index = rounds.length - 1 - i;
              return (
                <View key={index} style={styles.logRow}>
                  <Text style={styles.logText}>
                    #{index + 1}: {r.loser} → {r.winner}: {fmt(r.points)} pts
                  </Text>
                  <Pressable
                    onPress={() => { trackFeature('undo'); onDeleteRound(index); }}
                    hitSlop={8}
                  >
                    <Text style={styles.deleteX}>✕</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      )}

      <Pressable onPress={confirmEnd} style={[styles.ghostBtn, { marginTop: 16, alignItems: 'center' }]}>
        <Text style={[styles.ghostText, { color: colors.red }]}>End Game — Settle Up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12, textTransform: 'uppercase', color: colors.muted,
    letterSpacing: 0.5, marginBottom: 6,
  },
  ghostBtn: { padding: 8 },
  ghostText: { color: colors.muted, fontSize: 14, textDecorationLine: 'underline' },
  standingsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  shareBtn: {
    backgroundColor: colors.banner, borderWidth: 1.5, borderColor: colors.bannerBorder,
    borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
  },
  shareText: { fontSize: 14, color: colors.muted },
  playerRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  playerBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 4, borderWidth: 2,
    borderColor: colors.border, borderRadius: 10, backgroundColor: '#fff',
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  playerBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  loserSelected: { backgroundColor: colors.loserBg, borderColor: colors.red },
  winnerSelected: { backgroundColor: colors.winnerBg, borderColor: colors.green },
  quickBtn: {
    flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, backgroundColor: '#fff', minHeight: 38, alignItems: 'center',
  },
  quickText: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 10 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 16, minHeight: 48, color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.gold, borderRadius: 10, paddingVertical: 14,
    paddingHorizontal: 24, minHeight: 48, justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: colors.red, fontSize: 14, minHeight: 20, marginTop: 4 },
  logHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  chevron: { color: colors.muted, fontSize: 14 },
  logRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  logText: { fontSize: 14, color: colors.text, flex: 1 },
  deleteX: { color: colors.red, fontSize: 18, paddingHorizontal: 8 },
});
