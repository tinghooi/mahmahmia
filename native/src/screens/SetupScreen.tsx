import React, { useRef, useState } from 'react';
import {
  Alert, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { GameType } from '../types';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';
import { useLayout } from '../responsive';

const LETTERS = ['A', 'B', 'C', 'D'];
const CN_ORDINAL = ['一', '二', '三', '四'];

export interface SetupScreenProps {
  theme: Theme;
  initialGameType: GameType;
  resume: { gameType: GameType; players: string[]; roundCount: number } | null;
  hasActiveGame: boolean;
  onStart(names: string[], gameType: GameType, playerCount: number): void;
  onResume(): void;
}

export function SetupScreen({ theme: t, initialGameType, resume, hasActiveGame, onStart, onResume }: SetupScreenProps) {
  const s = useLayout();
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

  const dispName = (i: number) => names[i].trim() || LETTERS[i];

  const start = () => {
    const resolved = names.slice(0, playerCount).map((_, i) => dispName(i));
    const typed = resolved.filter((_, i) => names[i].trim() !== '');
    if (new Set(typed).size !== typed.length) {
      setError('Names must be unique.');
      return;
    }
    if (new Set(resolved).size !== resolved.length) {
      setError('Names must be unique.');
      return;
    }
    setError('');
    const go = () => onStart(resolved, gameType, playerCount);
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
    <View style={styles.wrap}>
      <View>
        <Text style={[styles.eyebrow, { color: t.mut }]}>GAME TYPE · 玩法</Text>
        <View style={[styles.tabRow, { backgroundColor: t.field, borderColor: t.line }]}>
          {(['mahjong', 'rummy'] as GameType[]).map(type => {
            const active = gameType === type;
            return (
              <Pressable
                key={type}
                onPress={() => switchType(type)}
                style={[
                  styles.tab,
                  active && { backgroundColor: t.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
                ]}
              >
                <Text style={[styles.tabLabel, { color: active ? t.green : t.mut, fontFamily: fontFamily.uiBold, fontSize: s.scale(16) }]}>
                  {type === 'mahjong' ? 'Mahjong' : 'Rummy'}
                </Text>
                <Text style={[styles.tabSub, { color: active ? t.green : t.mut, fontSize: s.scale(11) }]}>
                  {type === 'mahjong' ? '麻将 · 3 players' : '拉米 · 4 players'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.eyebrow, { color: t.mut }]}>PLAYERS · 玩家</Text>
        <View style={styles.playerList}>
          {names.map((n, i) => (
            <View key={`${gameType}-${i}`} style={[styles.playerRow, { backgroundColor: t.card, borderColor: t.line }]}>
              <View style={[styles.avatar, { backgroundColor: t.greenT, width: s.scale(40), height: s.scale(40) }]}>
                <Text style={[styles.avatarText, { color: t.green, fontFamily: fontFamily.displayExtraBold, fontSize: s.scale(18) }]}>
                  {LETTERS[i]}
                </Text>
              </View>
              <TextInput
                ref={r => { inputRefs.current[i] = r; }}
                style={[styles.input, { color: t.ink, fontFamily: fontFamily.uiSemiBold, fontSize: s.scale(16), minHeight: s.scale(44) }]}
                placeholder={`Player ${i + 1} · 玩家${CN_ORDINAL[i]}`}
                placeholderTextColor={t.sub}
                value={n}
                autoCorrect={false}
                onChangeText={v => setName(i, v)}
                returnKeyType={i === playerCount - 1 ? 'done' : 'next'}
                onSubmitEditing={() => {
                  if (i === playerCount - 1) start();
                  else inputRefs.current[i + 1]?.focus();
                }}
              />
            </View>
          ))}
        </View>
        <Text style={[styles.hint, { color: t.sub, fontSize: s.scale(12) }]}>Leave blank to use A · B · C · D</Text>
      </View>

      {!!error && <Text style={[styles.error, { color: t.red, fontSize: s.scale(14) }]}>{error}</Text>}

      {resume && (
        <Pressable style={[styles.resumeBanner, { backgroundColor: t.greenT, borderColor: t.green }]} onPress={onResume}>
          <Text style={[styles.resumeTitle, { color: t.ink, fontFamily: fontFamily.uiBold, fontSize: s.scale(14) }]}>继续游戏 Resume</Text>
          <Text style={[styles.resumeDetail, { color: t.mut, fontSize: s.scale(13) }]}>
            {resume.gameType === 'mahjong' ? 'Mahjong' : 'Rummy'} · {resume.players.join(', ')} · {resume.roundCount} transactions
          </Text>
        </Pressable>
      )}

      <Pressable style={[styles.startBtn, { backgroundColor: t.green }]} onPress={start}>
        <Text style={[styles.startBtnText, { fontFamily: fontFamily.uiBold, fontSize: s.scale(18) }]}>Start Game · 开局  →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 22 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  tabRow: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 16, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center' },
  tabLabel: { fontSize: 16, lineHeight: 18 },
  tabSub: { fontSize: 11, marginTop: 3, fontWeight: '600' },
  playerList: { gap: 10 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 8 },
  avatar: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  input: { flex: 1, fontSize: 16, paddingVertical: 8, paddingHorizontal: 4, minHeight: 44 },
  hint: { fontSize: 12, marginTop: 10, paddingLeft: 4 },
  error: { fontSize: 14, marginTop: -8 },
  resumeBanner: { borderWidth: 1.5, borderRadius: 12, padding: 14 },
  resumeTitle: { fontWeight: '700' },
  resumeDetail: { fontSize: 13, marginTop: 4 },
  startBtn: {
    borderRadius: 16, padding: 18, minHeight: 48, alignItems: 'center',
    shadowColor: '#2E7D4F', shadowOpacity: 0.32, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  startBtnText: { color: '#fff', fontSize: 18 },
});
