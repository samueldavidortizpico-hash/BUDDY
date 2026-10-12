/** Teclado de PIN de 4 dígitos: botones de 72, puntos de progreso y error anunciado. */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { tapHaptic } from '@/utils/haptics';

import { AppText } from './app-text';
import { Icon } from './icon';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinPad({ onComplete, disabled, error }: { onComplete: (pin: string) => void | Promise<void>; disabled?: boolean; error?: string | null }) {
  const t = useTheme();
  const s = useStyles();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const value = useRef('');
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const press = async (k: string) => {
    if (disabled || pending.current) return;
    tapHaptic();
    if (k === 'del') {
      value.current = value.current.slice(0, -1);
      setPin(value.current);
      return;
    }
    if (!/^\d$/.test(k)) return;
    const next = (value.current + k).slice(0, 4);
    value.current = next;
    setPin(next);
    if (next.length === 4) {
      pending.current = true;
      setSubmitting(true);
      try {
        await onComplete(next);
      } finally {
        pending.current = false;
        value.current = '';
        if (mounted.current) {
          setPin('');
          setSubmitting(false);
        }
      }
    }
  };
  return (
    <View style={s.root}>
      <View style={s.dots} accessible accessibilityLabel={`${pin.length} de 4`}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[s.dot, i < pin.length && { backgroundColor: t.hc ? t.c.text : t.c.mintStrong }]} />
        ))}
      </View>
      {error ? (
        <AppText variant="secondaryStrong" color={t.ink.danger} align="center" accessibilityLiveRegion="assertive">
          {error}
        </AppText>
      ) : null}
      <View style={s.grid}>
        {KEYS.map((k, i) =>
          k === '' ? (
            <View key={i} style={s.key} />
          ) : (
            <Pressable
              key={i}
              onPress={() => press(k)}
              accessibilityRole="button"
              disabled={disabled || submitting}
              accessibilityState={{ disabled: !!disabled || submitting, busy: submitting }}
              accessibilityLabel={k === 'del' ? strings.pin.erase : strings.pin.digit(k)}
              style={({ pressed }) => [s.key, s.keyBtn, pressed && { opacity: 0.7 }]}
            >
              {k === 'del' ? <Icon name="back" size={26} color={t.c.text} /> : <AppText variant="h1">{k}</AppText>}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    root: { gap: spacing.md, alignItems: 'center', alignSelf: 'stretch' },
    dots: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs },
    dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: t.hc ? t.c.text : t.c.mintStrong },
    grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * (touch.elder + spacing.md), justifyContent: 'center', gap: spacing.md },
    key: { width: touch.elder, height: touch.elder },
    keyBtn: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surface, ...t.hairline },
  }),
);
