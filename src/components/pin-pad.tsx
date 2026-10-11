/** Teclado de PIN de 4 dígitos: botones de 72, puntos de progreso y error anunciado. */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { tapHaptic } from '@/utils/haptics';

import { AppText } from './app-text';
import { Icon } from './icon';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinPad({ onComplete, disabled, error }: { onComplete: (pin: string) => void; disabled?: boolean; error?: string | null }) {
  const t = useTheme();
  const s = useStyles();
  const [pin, setPin] = useState('');
  const press = (k: string) => {
    if (disabled) return;
    tapHaptic();
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      onComplete(next);
      setTimeout(() => setPin(''), 150);
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
