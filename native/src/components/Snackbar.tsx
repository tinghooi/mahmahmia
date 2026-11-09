import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';

export interface SnackbarAction {
  label: string;
  onPress(): void;
}

export interface SnackbarHandle {
  show(fun: string, detail: string, action?: SnackbarAction): void;
}

interface Props {
  theme: Theme;
}

export const Snackbar = forwardRef<SnackbarHandle, Props>(({ theme: t }, ref) => {
  const [msg, setMsg] = useState<{ fun: string; detail: string; action?: SnackbarAction } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const hide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
      ({ finished }) => finished && setMsg(null)
    );
  };

  useImperativeHandle(ref, () => ({
    show(fun: string, detail: string, action?: SnackbarAction) {
      setMsg({ fun, detail, action });
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(hide, action ? 5000 : 2500);
    },
  }));

  if (!msg) return null;
  return (
    <Animated.View
      style={[styles.bar, msg.action && styles.barWithAction, { opacity, backgroundColor: t.green }]}
      pointerEvents={msg.action ? 'box-none' : 'none'}
    >
      {msg.action ? (
        <>
          <View style={styles.textCol}>
            {msg.fun ? <Text style={[styles.fun, styles.left]}>{msg.fun}</Text> : null}
            <Text style={[styles.detail, styles.left]}>{msg.detail}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={msg.action.label}
            style={styles.action}
            onPress={() => {
              msg.action?.onPress();
              hide();
            }}
          >
            <Text style={styles.actionText}>{msg.action.label}</Text>
          </Pressable>
        </>
      ) : (
        <>
          {msg.fun ? <Text style={styles.fun}>{msg.fun}</Text> : null}
          <Text style={styles.detail}>{msg.detail}</Text>
        </>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
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
  barWithAction: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingRight: 8 },
  textCol: { flex: 1, paddingVertical: 8 },
  left: { textAlign: 'left' },
  action: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  fun: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  detail: { color: '#fff', fontSize: 12, opacity: 0.8, marginTop: 2, textAlign: 'center' },
});
