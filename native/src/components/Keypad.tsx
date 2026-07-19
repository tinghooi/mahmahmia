import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';
import { fontFamily } from '../fonts';

export function pressKey(current: string, key: string): string {
  if (key === '⌫') return current.slice(0, -1);
  if (key === '.') return current.includes('.') ? current : (current || '0') + '.';
  const next = current === '0' ? key : current + key;
  return next.replace('.', '').length > 12 ? current : next;
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

export interface KeypadProps {
  theme: Theme;
  value: string;
  onChange(next: string): void;
}

export function Keypad({ theme: t, value, onChange }: KeypadProps) {
  return (
    <View style={styles.grid}>
      {KEYS.map(k => (
        <Pressable
          key={k}
          onPress={() => onChange(pressKey(value, k))}
          style={[styles.key, { borderColor: t.line, backgroundColor: t.card }]}
        >
          <Text style={[styles.keyText, { color: t.ink, fontFamily: fontFamily.displayBold }]}>{k}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  key: {
    width: '31%', height: 56, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 22 },
});
