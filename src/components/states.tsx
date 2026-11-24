/** Estados comunes: vacío (robot + una acción), error con reintento y carga (skeleton con brillo). */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { radius, spacing, type Domain } from '@/theme';
import { useTheme } from '@/theme/provider';

import { AppText } from './app-text';
import { Appear } from './appear';
import { Button } from './button';
import { type IconName } from './icon';
import { IconTile } from './icon-tile';

/**
 * Vacío (V5): el icono en su mosaico, rodeado de dos anillos suaves del mismo tono que se abren al aparecer (una sola
 * vez, sin bucle); debajo, título, texto y UNA acción. El vacío invita a actuar: nunca dice "todo bien" sin datos.
 */
export function EmptyState({
  title,
  text,
  action,
  icon = 'sparkle',
  domain = 'contact',
  style,
  navigationIndependentRobot = false,
}: {
  title: string;
  text?: string;
  action?: { label: string; onPress: () => void };
  icon?: IconName;
  /** Color del mosaico: por defecto el de la marca (turquesa en claro, pervinca en oscuro). */
  domain?: Domain | 'petrol' | 'slate';
  style?: StyleProp<ViewStyle>;
  navigationIndependentRobot?: boolean;
}) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const open = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) open.set(withSpring(1, { damping: 14, stiffness: 120 }));
  }, [reduce, open]);
  const ringA = useAnimatedStyle(() => ({ opacity: 0.9 * open.value, transform: [{ scale: 0.6 + 0.4 * open.value }] }));
  const ringB = useAnimatedStyle(() => ({ opacity: 0.55 * open.value, transform: [{ scale: 0.5 + 0.5 * open.value }] }));
  const tile = useAnimatedStyle(() => ({ transform: [{ scale: 0.8 + 0.2 * open.value }] }));
  const ring = t.hc ? 'transparent' : t.tiles[domain].bg;
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.stage}>
        <Animated.View style={[styles.ring, styles.ringB, { borderColor: ring }, ringB]} />
        <Animated.View style={[styles.ring, styles.ringA, { backgroundColor: ring }, ringA]} />
        <Animated.View style={tile}>
          <IconTile icon={icon} domain={domain} size={72} />
        </Animated.View>
      </View>
      <Appear delay={80}>
        <AppText variant="h3" align="center">
          {title}
        </AppText>
      </Appear>
      {text ? (
        <Appear delay={80} index={1}>
          <AppText variant="secondary" color={t.c.muted} align="center" style={styles.text}>
            {text}
          </AppText>
        </Appear>
      ) : null}
      {action ? (
        <Appear delay={80} index={2} style={styles.action}>
          <Button label={action.label} onPress={action.onPress} />
        </Appear>
      ) : null}
    </View>
  );
}

export function ErrorState({ title = strings.common.errorTitle, text = strings.common.errorBody, onRetry }: { title?: string; text?: string; onRetry?: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.error, { backgroundColor: t.c.bg, paddingTop: insets.top + spacing.xxl }]} accessibilityLiveRegion="assertive">
      <EmptyState icon="warning" domain="followUp" title={title} text={text} navigationIndependentRobot action={onRetry ? { label: strings.common.retry, onPress: onRetry } : undefined} />
    </View>
  );
}

/** Bloque de carga con brillo que lo recorre (solo transform). */
export function Skeleton({ width = '100%', height = 20, round = radius.sm, style }: { width?: DimensionValue; height?: number; round?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const x = useSharedValue(-1);
  useEffect(() => {
    if (reduce) return;
    x.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1));
    return () => cancelAnimation(x);
  }, [reduce, x]);
  const shine = useAnimatedStyle(() => ({ transform: [{ translateX: `${x.value * 100}%` }] }));
  return (
    <View
      accessibilityLabel={strings.common.loading}
      style={[{ width, height, borderRadius: round, backgroundColor: t.c.surface2, overflow: 'hidden' }, t.hc && t.hairline, style]}
    >
      {reduce || t.hc ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, shine]}>
          <LinearGradient
            colors={t.dark ? ['transparent', 'rgba(255,255,255,0.08)', 'transparent'] : ['transparent', 'rgba(255,255,255,0.7)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  stage: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxs },
  ring: { position: 'absolute', borderRadius: 999 },
  ringA: { width: 104, height: 104 },
  ringB: { width: 132, height: 132, borderWidth: 1.5 },
  text: { maxWidth: 320 },
  action: { alignSelf: 'stretch', marginTop: spacing.xs },
  error: { flex: 1, paddingHorizontal: spacing.screen },
});
