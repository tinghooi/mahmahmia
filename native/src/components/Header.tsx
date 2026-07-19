import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';
import { TileIcon } from './TileIcon';
import { useLayout } from '../responsive';

export interface HeaderProps {
  theme: Theme;
  dark: boolean;
  sound: boolean;
  onToggleDark(): void;
  onToggleSound(): void;
}

export function Header({ theme: t, dark, sound, onToggleDark, onToggleSound }: HeaderProps) {
  const s = useLayout();
  return (
    <View style={[styles.row, { backgroundColor: t.bg, borderBottomColor: t.line }]}>
      <TileIcon size={s.scale(34)} />
      <View style={styles.titles}>
        <Text style={[styles.title, { color: t.ink, fontFamily: fontFamily.displayExtraBold, fontSize: s.scale(19), lineHeight: s.scale(22) }]}>MahMahMia</Text>
        <Text style={[styles.subtitle, { color: t.mut, fontSize: s.scale(11) }]}>记分 · Score Tracker</Text>
      </View>
      <Pressable onPress={onToggleSound} style={[styles.iconBtn, { borderColor: t.line, backgroundColor: t.card, width: s.scale(40), height: s.scale(40) }]}>
        <Text style={[styles.iconGlyph, { fontSize: s.scale(16) }]}>{sound ? '🔊' : '🔇'}</Text>
      </Pressable>
      <Pressable onPress={onToggleDark} style={[styles.iconBtn, { borderColor: t.line, backgroundColor: t.card, width: s.scale(40), height: s.scale(40) }]}>
        <Text style={[styles.iconGlyph, { fontSize: s.scale(16) }]}>{dark ? '☀️' : '🌙'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  titles: { flex: 1, minWidth: 0 },
  title: { fontSize: 19, lineHeight: 22, letterSpacing: -0.2 },
  subtitle: { fontSize: 11, marginTop: 2, letterSpacing: 0.2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  iconGlyph: { fontSize: 16 },
});
