import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { strings } from '@/i18n';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

const A = strings.auth;

/**
 * Fortaleza de la contraseña (V4.3): una barra que se llena con curva de salida y pasa de coral (débil) a ámbar (media)
 * y a verde (fuerte), con el texto al lado. El relleno se mueve con translateX sobre su ancho medido (solo transform).
 */
export function StrengthMeter({ value }: { value: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const level = value <= 1 ? 0 : value === 2 ? 1 : 2;
  const colors = t.hc ? [t.c.text, t.c.text, t.c.text] : [t.c.coral, t.c.yellow, t.c.success];
  const inks = t.hc ? [t.c.text, t.c.text, t.c.text] : [t.ink.danger, t.ink.yellow, t.ink.success];
  const width = useSharedValue(0);
  const p = useSharedValue(0);
  useEffect(() => {
    const target = (value + 1) / 5;
    p.set(reduce ? target : withTiming(target, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [value, reduce, p]);
  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: -width.value * (1 - p.value) }] }));
  const label = A.strength[value];
  return (
    <View style={styles.meter} accessible accessibilityLabel={A.strengthLabel(label)}>
      <View style={[styles.track, { backgroundColor: t.c.surface2 }, t.hc && t.hairline]} onLayout={(e) => width.set(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.fill, { backgroundColor: colors[level] }, fill]} />
      </View>
      <AppText variant="captionStrong" color={inks[level]} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { ...StyleSheet.absoluteFill, borderRadius: 3 },
  label: { minWidth: 52, textAlign: 'right' },
});
