import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { SplashScreen } from './src/screens/SplashScreen';
import { SetupScreen } from './src/screens/SetupScreen';
import { ScoringScreen } from './src/screens/ScoringScreen';
import { SettlementScreen } from './src/screens/SettlementScreen';
import { Header } from './src/components/Header';
import { Snackbar, SnackbarHandle } from './src/components/Snackbar';
import { funToast, fmt } from './src/logic/game';
import { saveState, restoreState, clearState, savePrefs, restorePrefs } from './src/storage';
import { logGameEnd, resetFeatures } from './src/analytics';
import { initSounds, soundCoin, soundDelete, soundSettle, setSoundEnabled } from './src/sounds';
import { loadInterstitial, showInterstitial } from './src/ads/interstitial';
import { GameState, GameType } from './src/types';
import { getTheme } from './src/theme';
import { useAppFonts } from './src/fonts';

type Screen = 'loading' | 'splash' | 'setup' | 'scoring' | 'settlement';

const FRESH: GameState = {
  gameType: 'mahjong', playerCount: 3, players: [], rounds: [], gameStartTime: Date.now(),
};

export default function App() {
  const fontsLoaded = useAppFonts();
  const [game, setGame] = useState<GameState>(FRESH);
  const [screen, setScreen] = useState<Screen>('loading');
  const [dark, setDark] = useState(false);
  const [sound, setSound] = useState(true);
  const snackbar = useRef<SnackbarHandle>(null);
  const theme = getTheme(dark);

  useEffect(() => {
    initSounds(); // fire-and-forget: play functions no-op until ready
    // Apple requires this prompt before any ad SDK requests tracking data; on
    // Android it resolves immediately with no user-facing prompt. Ads still
    // load either way — a denial just means non-personalized ads, not no ads.
    requestTrackingPermissionsAsync()
      .catch(() => {})
      .finally(() => loadInterstitial());
    (async () => {
      const [saved, prefs] = await Promise.all([restoreState(), restorePrefs()]);
      setDark(prefs.dark);
      setSound(prefs.sound);
      setSoundEnabled(prefs.sound);
      if (saved) setGame(saved);
      setScreen('splash');
    })().catch(() => setScreen('splash'));
  }, []);

  const resolvedDestination: Screen = game.players.length > 0 && game.rounds.length > 0 ? 'scoring' : 'setup';

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'scoring') { setScreen('setup'); return true; }
      if (screen === 'settlement') { setScreen('scoring'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [screen]);

  const toggleDark = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      savePrefs({ dark: next, sound });
      return next;
    });
  }, [sound]);

  const toggleSound = useCallback(() => {
    setSound(prev => {
      const next = !prev;
      setSoundEnabled(next);
      savePrefs({ dark, sound: next });
      return next;
    });
  }, [dark]);

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

  if (!fontsLoaded || screen === 'loading') return null;

  if (screen === 'splash') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          <SplashScreen theme={theme} onStart={() => setScreen(resolvedDestination)} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const hasActiveGame = game.rounds.length > 0 && game.players.length > 0;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Header theme={theme} dark={dark} sound={sound} onToggleDark={toggleDark} onToggleSound={toggleSound} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.screenBody}>
              {screen === 'setup' && (
                <SetupScreen
                  theme={theme}
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
                  theme={theme}
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
                  theme={theme}
                  players={game.players}
                  rounds={game.rounds}
                  onBackToScoring={() => setScreen('scoring')}
                  onNewGame={newGame}
                />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        <Snackbar theme={theme} ref={snackbar} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, maxWidth: 420, width: '100%', alignSelf: 'center' },
  screenBody: { paddingBottom: 24 },
});
