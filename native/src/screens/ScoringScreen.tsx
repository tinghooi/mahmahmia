import React, { useState } from 'react';
import {
  Alert, Pressable, ScrollView, Share, StyleSheet, Text, View,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { ScorePanel } from '../components/ScorePanel';
import { Keypad } from '../components/Keypad';
import { Celebration, isBigWin } from '../components/Celebration';
import { AppBannerAd } from '../ads/AppBannerAd';
import { buildShareText, evalExpr, fmt, getRecentAmounts } from '../logic/game';
import { trackFeature } from '../analytics';
import { GameType, Round } from '../types';
import { Theme, panelStyle } from '../theme';
import { fontFamily } from '../fonts';
import { useLayout } from '../responsive';

export interface ScoringScreenProps {
  theme: Theme;
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
  theme: t, players, gameType, rounds, gameStartTime,
  onAddRound, onDeleteRound, onBack, onEndGame,
}: ScoringScreenProps) {
  const s = useLayout();
  useKeepAwake();
  const [loser, setLoser] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [points, setPoints] = useState('');
  const [error, setError] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const [celebration, setCelebration] = useState<{ name: string; points: number } | null>(null);

  const selectLoser = (name: string) => {
    setLoser(name);
    if (winner === name) setWinner(null);
  };

  const selectWinner = (name: string) => {
    if (name === loser) return;
    setWinner(name);
  };

  const pts = evalExpr(points);
  const valid = !!loser && !!winner && loser !== winner && pts > 0 && !isNaN(pts);

  const add = () => {
    if (!loser || !winner) {
      setError('Select who pays and who gets.');
      return;
    }
    if (!pts || pts <= 0 || isNaN(pts)) {
      setError('Enter a valid point amount.');
      return;
    }
    setError('');
    const winnerName = winner;
    setPoints('');
    onAddRound(loser, winner, pts);
    if (isBigWin(pts)) setCelebration({ name: winnerName, points: pts });
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

  const backButton = (
    <Pressable onPress={onBack} style={styles.ghostBtn}>
      <Text style={[styles.ghostText, { color: t.gold, fontFamily: fontFamily.uiSemiBold, fontSize: s.scale(14) }]}>← Back to Setup</Text>
    </Pressable>
  );

  const standingsBlock = (
    <>
      <View style={styles.standingsHeader}>
        <Text style={[styles.eyebrow, { color: t.mut, fontSize: s.scale(12) }]}>STANDINGS · 排名</Text>
        {rounds.length > 0 && (
          <Pressable onPress={share} style={[styles.shareBtn, { backgroundColor: t.field, borderColor: t.line }]}>
            <Text style={[styles.shareText, { color: t.mut, fontSize: s.scale(14) }]}>↗ Share</Text>
          </Pressable>
        )}
      </View>
      <ScorePanel theme={t} players={players} rounds={rounds} showTitles flashKey={rounds.length} />
    </>
  );

  const entryBlock = (
    <View style={panelStyle(t)}>
      <Text style={[styles.eyebrow, { color: t.mut, fontSize: s.scale(12) }]}>WHO PAYS? · 谁付</Text>
      <View style={styles.grid3}>
        {players.map(p => (
          <Pressable
            key={`l-${p}`}
            onPress={() => selectLoser(p)}
            style={[
              styles.selBtn,
              { borderColor: t.line, backgroundColor: t.card, height: s.scale(52) },
              loser === p && { borderColor: t.red, backgroundColor: t.redT },
            ]}
          >
            <Text style={[styles.selBtnText, { color: loser === p ? t.red : t.ink, fontFamily: fontFamily.displayBold, fontSize: s.scale(17) }]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.eyebrow, { color: t.mut, marginTop: 14, fontSize: s.scale(12) }]}>WHO GETS? · 谁收</Text>
      <View style={styles.grid3}>
        {players.map(p => (
          <Pressable
            key={`w-${p}`}
            onPress={() => selectWinner(p)}
            disabled={p === loser}
            style={[
              styles.selBtn,
              { borderColor: t.line, backgroundColor: t.card, height: s.scale(52) },
              winner === p && { borderColor: t.green, backgroundColor: t.greenT },
              p === loser && { opacity: 0.35 },
            ]}
          >
            <Text style={[styles.selBtnText, { color: winner === p ? t.green : t.ink, fontFamily: fontFamily.displayBold, fontSize: s.scale(17) }]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      {quickAmounts.length > 0 && (
        <>
          <Text style={[styles.eyebrow, { color: t.mut, marginTop: 14, fontSize: s.scale(12) }]}>QUICK · 快捷</Text>
          <View style={styles.grid3}>
            {quickAmounts.map(a => (
              <Pressable
                key={a}
                onPress={() => { trackFeature('quick_amount'); setPoints(String(a)); }}
                style={[styles.quickChip, { backgroundColor: t.field, borderColor: t.line }]}
              >
                <Text style={[styles.quickText, { color: t.gold, fontFamily: fontFamily.uiBold, fontSize: s.scale(16) }]}>{a}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={[styles.eyebrow, { color: t.mut, marginTop: 14, fontSize: s.scale(12) }]}>POINTS · 点数</Text>
      <View style={[styles.pointsDisplay, { backgroundColor: t.field, borderColor: t.line, padding: s.scale(16) }]}>
        <Text style={[styles.pointsText, { color: points ? t.ink : t.sub, fontFamily: fontFamily.displayExtraBold, fontSize: s.scale(30) }]}>
          {points === '' ? '0' : points}
        </Text>
      </View>
      <View style={styles.keypadRow}>
        <Keypad theme={t} value={points} onChange={setPoints} />
      </View>
      <View style={styles.entryActions}>
        <Pressable onPress={() => setPoints('')} style={[styles.clearBtn, { borderColor: t.line, backgroundColor: t.card, height: s.scale(56) }]}>
          <Text style={[styles.clearText, { color: t.red, fontSize: s.scale(19) }]}>C</Text>
        </Pressable>
        <Pressable
          onPress={add}
          disabled={!valid}
          style={[styles.addBtn, { backgroundColor: valid ? t.green : t.mut, opacity: valid ? 1 : 0.55, height: s.scale(56) }]}
        >
          <Text style={[styles.addBtnText, { fontFamily: fontFamily.uiExtraBold, fontSize: s.scale(19) }]}>Add · 记一笔</Text>
        </Pressable>
      </View>
      {!!error && <Text style={[styles.error, { color: t.red, fontSize: s.scale(14) }]}>{error}</Text>}
    </View>
  );

  const previewBlock = valid ? (
    <View style={[styles.preview, { backgroundColor: t.green }]}>
      <Text style={[styles.previewName, { fontFamily: fontFamily.uiExtraBold, fontSize: s.scale(16) }]}>{winner} 发财啦!</Text>
      <Text style={[styles.previewSub, { fontSize: s.scale(13) }]}>{loser} → {winner} · {fmt(pts)} pts</Text>
    </View>
  ) : null;

  const logBlock = (
    <>
      <Pressable
        onPress={() => { trackFeature('log_view'); setLogOpen(o => !o); }}
        style={styles.logHeader}
      >
        <Text style={[styles.eyebrow, { color: t.mut, marginBottom: 0, fontSize: s.scale(12) }]}>LOG · 记录 ({rounds.length})</Text>
        <Text style={[styles.chevron, { color: t.mut, fontSize: s.scale(14) }, logOpen && { transform: [{ rotate: '180deg' }] }]}>▾</Text>
      </Pressable>
      {logOpen && (
        <View style={[styles.logCard, { backgroundColor: t.card, borderColor: t.line }]}>
          {rounds.length === 0 ? (
            <Text style={[styles.empty, { color: t.sub, fontSize: s.scale(14) }]}>No entries yet · 还没有记录</Text>
          ) : (
            rounds.slice().reverse().map((r, i) => {
              const index = rounds.length - 1 - i;
              return (
                <View key={index} style={[styles.logRow, { borderBottomColor: t.line }]}>
                  <Text style={[styles.logText, { color: t.ink, fontSize: s.scale(14) }]}>
                    #{index + 1}: {r.loser} → {r.winner}: {fmt(r.points)} pts
                  </Text>
                  <Pressable
                    onPress={() => { trackFeature('undo'); onDeleteRound(index); }}
                    hitSlop={8}
                  >
                    <Text style={[styles.deleteX, { color: t.red, fontSize: s.scale(18) }]}>✕</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      )}
    </>
  );

  const endButton = (
    <Pressable onPress={confirmEnd} style={styles.endBtn}>
      <Text style={[styles.endText, { color: t.red, fontFamily: fontFamily.uiBold, fontSize: s.scale(15) }]}>End Game — Settle Up · 结算</Text>
    </Pressable>
  );

  const celebrationOverlay = celebration ? (
    <Celebration
      theme={t}
      winnerName={celebration.name}
      points={celebration.points}
      onDone={() => setCelebration(null)}
    />
  ) : null;

  if (s.twoCol) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>{backButton}</View>
        <View style={{ flex: 1, flexDirection: 'row', gap: 16, paddingHorizontal: 16 }}>
          <ScrollView style={{ flex: 42 }} contentContainerStyle={{ gap: 18, paddingBottom: 16 }}>
            {standingsBlock}
            {logBlock}
          </ScrollView>
          <ScrollView
            style={{ flex: 58 }}
            contentContainerStyle={{ gap: 18, paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {entryBlock}
            {previewBlock}
            {endButton}
          </ScrollView>
        </View>
        <View style={{ paddingBottom: 4 }}>
          <AppBannerAd />
        </View>
        {celebrationOverlay}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      {backButton}
      {standingsBlock}
      {entryBlock}
      {previewBlock}
      {logBlock}
      {endButton}
      <AppBannerAd />
      {celebrationOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  ghostBtn: { alignSelf: 'flex-start' },
  ghostText: { fontSize: 14 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  standingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  shareBtn: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  shareText: { fontSize: 14 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selBtn: { width: '31%', height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  selBtnText: { fontSize: 17 },
  quickChip: { flex: 1, minWidth: 80, paddingVertical: 12, borderRadius: 13, borderWidth: 1, alignItems: 'center' },
  quickText: { fontSize: 16 },
  pointsDisplay: { borderWidth: 1, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  pointsText: { fontSize: 30, letterSpacing: 0.4 },
  keypadRow: { marginTop: 10 },
  entryActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  clearBtn: { width: 72, height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 19, fontWeight: '800' },
  addBtn: { flex: 1, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 19 },
  error: { fontSize: 14, marginTop: 8 },
  preview: { borderRadius: 16, padding: 14, alignItems: 'center' },
  previewName: { color: '#fff', fontSize: 16 },
  previewSub: { color: '#fff', opacity: 0.9, fontSize: 13, marginTop: 3 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chevron: { fontSize: 14 },
  logCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginTop: -8 },
  empty: { padding: 24, textAlign: 'center', fontSize: 14 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  logText: { fontSize: 14, fontWeight: '600', flex: 1 },
  deleteX: { fontSize: 18, width: 30, height: 30, textAlign: 'center', textAlignVertical: 'center' },
  endBtn: { alignItems: 'center', paddingVertical: 8 },
  endText: { fontSize: 15 },
});
