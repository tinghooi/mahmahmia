import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export interface SnackbarHandle {
  show(fun: string, detail: string): void;
}

export const Snackbar = forwardRef<SnackbarHandle>((_props, ref) => {
  const [msg, setMsg] = useState<{ fun: string; detail: string } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  useImperativeHandle(ref, () => ({
    show(fun: string, detail: string) {
      setMsg({ fun, detail });
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
          ({ finished }) => finished && setMsg(null)
        );
      }, 2500);
    },
  }));

  if (!msg) return null;
  return (
    <Animated.View style={[styles.bar, { opacity }]} pointerEvents="none">
      {msg.fun ? <Text style={styles.fun}>{msg.fun}</Text> : null}
      <Text style={styles.detail}>{msg.detail}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 100,
  },
  fun: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  detail: { color: '#fff', fontSize: 12, opacity: 0.8, marginTop: 2, textAlign: 'center' },
});
