import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { SetupScreen } from './src/screens/SetupScreen';
import { ScoringScreen } from './src/screens/ScoringScreen';
import { SettlementScreen } from './src/screens/SettlementScreen';
import { Snackbar, SnackbarHandle } from './src/components/Snackbar';
import { funToast, fmt } from './src/logic/game';
import { saveState, restoreState, clearState } from './src/storage';
import { logGameEnd, resetFeatures } from './src/analytics';
import { initSounds, soundCoin, soundDelete, soundSettle } from './src/sounds';
import { loadInterstitial, showInterstitial } from './src/ads/interstitial';
import { AppBannerAd } from './src/ads/AppBannerAd';
import { GameState, GameType } from './src/types';
import { colors } from './src/theme';

type Screen = 'loading' | 'setup' | 'scoring' | 'settlement';

const FRESH: GameState = {
  gameType: 'mahjong', playerCount: 3, players: [], rounds: [], gameStartTime: Date.now(),
};

export default function App() {
  const [game, setGame] = useState<GameState>(FRESH);
  const [screen, setScreen] = useState<Screen>('loading');
  const snackbar = useRef<SnackbarHandle>(null);

  // Launch: valid saved game (players AND rounds) opens directly on scoring.
  useEffect(() => {
    initSounds(); // fire-and-forget: play functions no-op until ready
    loadInterstitial(); // fire-and-forget: preload so an ad is ready before it's needed
    (async () => {
      const saved = await restoreState();
      if (saved) setGame(saved);
      setScreen(saved && saved.players.length > 0 && saved.rounds.length > 0 ? 'scoring' : 'setup');
    })().catch(() => setScreen('setup'));
  }, []);

  // Android hardware back: scoring → setup (game preserved), settlement → scoring, setup → exit.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'scoring') { setScreen('setup'); return true; }
      if (screen === 'settlement') { setScreen('scoring'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const startGame = useCallback((names: string[], gameType: GameType, playerCount: number) => {
    const next: GameState = { gameType, playerCount, players: names, rounds: [], gameStartTime: Date.now() };
    resetFeatures();
    setGame(next);
    setScreen('scoring');
    saveState(next);
  }, []);

  const addRound = useCallback((loser: string, winner: string, points: number) => {
    setGame(prev => {
      const next = { ...prev, rounds: [...prev.rounds, { loser, winner, points }] };
      saveState(next);
      return next;
    });
    soundCoin();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    snackbar.current?.show(funToast(loser, winner), `${loser} → ${winner}: ${fmt(points)} pts`);
  }, []);

  const deleteRound = useCallback((index: number) => {
    setGame(prev => {
      const rounds = prev.rounds.filter((_, i) => i !== index);
      const next = { ...prev, rounds };
      saveState(next);
      return next;
    });
    soundDelete();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const endGame = useCallback(() => {
    setScreen('settlement');
    soundSettle();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logGameEnd(game); // fire-and-forget, same trigger as web
    showInterstitial(); // fire-and-forget: no-ops silently if not preloaded yet
  }, [game]);

  const newGame = useCallback(() => {
    clearState();
    setGame({ ...FRESH, gameStartTime: Date.now() });
    setScreen('setup');
    showInterstitial(); // fire-and-forget: no-ops silently if not preloaded yet
  }, []);

  const hasActiveGame = game.rounds.length > 0 && game.players.length > 0;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.h1}>🀄 MahMahMia</Text>
            <Text style={styles.subtitle}>Score Tracker</Text>

            {screen === 'setup' && (
              <SetupScreen
                initialGameType={game.gameType}
                hasActiveGame={hasActiveGame}
                resume={hasActiveGame
                  ? { gameType: game.gameType, players: game.players, roundCount: game.rounds.length }
                  : null}
                onStart={startGame}
                onResume={() => setScreen('scoring')}
              />
            )}
            {screen === 'scoring' && (
              <ScoringScreen
                players={game.players}
                gameType={game.gameType}
                rounds={game.rounds}
                gameStartTime={game.gameStartTime}
                onAddRound={addRound}
                onDeleteRound={deleteRound}
                onBack={() => setScreen('setup')}
                onEndGame={endGame}
              />
            )}
            {screen === 'settlement' && (
              <SettlementScreen
                players={game.players}
                rounds={game.rounds}
                onBackToScoring={() => setScreen('scoring')}
                onNewGame={newGame}
              />
            )}

            {screen !== 'loading' && (
              <Text style={styles.footer}>Built for game nights · © 2026 NexvanceTech</Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        {screen === 'scoring' && <AppBannerAd />}
        <Snackbar ref={snackbar} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, maxWidth: 420, width: '100%', alignSelf: 'center' },
  h1: { textAlign: 'center', fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  subtitle: { textAlign: 'center', color: colors.muted, fontSize: 14, marginBottom: 20 },
  footer: { textAlign: 'center', paddingVertical: 24, fontSize: 11, color: colors.faint },
});
