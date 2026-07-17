import React, { useRef, useState } from 'react';
import {
  Alert, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { GameType } from '../types';
import { colors } from '../theme';

export interface SetupScreenProps {
  initialGameType: GameType;
  resume: { gameType: GameType; players: string[]; roundCount: number } | null;
  hasActiveGame: boolean;
  onStart(names: string[], gameType: GameType, playerCount: number): void;
  onResume(): void;
}

export function SetupScreen({ initialGameType, resume, hasActiveGame, onStart, onResume }: SetupScreenProps) {
  const [gameType, setGameType] = useState<GameType>(initialGameType);
  const playerCount = gameType === 'mahjong' ? 3 : 4;
  const [names, setNames] = useState<string[]>(Array(playerCount).fill(''));
  const [error, setError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const switchType = (type: GameType) => {
    setGameType(type);
    setNames(Array(type === 'mahjong' ? 3 : 4).fill(''));
    setError('');
  };

  const setName = (i: number, v: string) => {
    setNames(prev => prev.map((n, j) => (j === i ? v : n)));
  };

  const start = () => {
    const trimmed = names.map(n => n.trim());
    if (trimmed.some(n => n === '')) {
      setError('All names are required.');
      return;
    }
    if (new Set(trimmed).size !== trimmed.length) {
      setError('Names must be unique.');
      return;
    }
    setError('');
    const go = () => onStart(trimmed, gameType, playerCount);
    if (hasActiveGame) {
      Alert.alert('', '有游戏还在进行中，确定要开新游戏吗？', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: go },
      ]);
    } else {
      go();
    }
  };

  return (
    <View>
      <Text style={styles.label}>Game Type</Text>
      <View style={styles.toggleRow}>
        {(['mahjong', 'rummy'] as GameType[]).map(t => (
          <Pressable
            key={t}
            onPress={() => switchType(t)}
            style={[styles.toggle, gameType === t && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, gameType === t && styles.toggleTextActive]}>
              {t === 'mahjong' ? 'Mahjong (3)' : 'Rummy (4)'}
            </Text>
          </Pressable>
        ))}
      </View>

      {names.map((n, i) => (
        <TextInput
          key={`${gameType}-${i}`}
          ref={r => { inputRefs.current[i] = r; }}
          style={styles.input}
          placeholder={`Player ${i + 1} name`}
          placeholderTextColor="#bbb"
          value={n}
          autoFocus={i === 0}
          autoCorrect={false}
          onChangeText={v => setName(i, v)}
          returnKeyType={i === playerCount - 1 ? 'done' : 'next'}
          onSubmitEditing={() => {
            if (i === playerCount - 1) start();
            else inputRefs.current[i + 1]?.focus();
          }}
        />
      ))}

      <Text style={styles.error}>{error}</Text>

      {resume && (
        <Pressable style={styles.resumeBanner} onPress={onResume}>
          <Text style={styles.resumeTitle}>继续游戏 Resume</Text>
          <Text style={styles.resumeDetail}>
            {resume.gameType === 'mahjong' ? 'Mahjong' : 'Rummy'} · {resume.players.join(', ')} · {resume.roundCount} transactions
          </Text>
        </Pressable>
      )}

      <Pressable style={styles.startBtn} onPress={start}>
        <Text style={styles.startBtnText}>Start Game →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12, textTransform: 'uppercase', color: colors.muted,
    letterSpacing: 0.5, marginBottom: 6,
  },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggle: {
    flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, backgroundColor: '#fff', alignItems: 'center',
  },
  toggleActive: { backgroundColor: colors.toggleActive, borderColor: colors.toggleActive },
  toggleText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8,
    minHeight: 48, color: colors.text,
  },
  error: { color: colors.red, fontSize: 14, minHeight: 20, marginTop: 4 },
  resumeBanner: {
    backgroundColor: colors.banner, borderWidth: 1.5, borderColor: colors.bannerBorder,
    borderRadius: 12, padding: 14, marginBottom: 12,
  },
  resumeTitle: { fontWeight: '700', color: colors.text },
  resumeDetail: { fontSize: 13, color: colors.muted, marginTop: 4 },
  startBtn: {
    backgroundColor: colors.green, borderRadius: 10, padding: 14,
    minHeight: 48, alignItems: 'center', marginTop: 12,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
