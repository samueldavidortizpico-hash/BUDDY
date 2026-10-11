/** Estados comunes: vacío (robot + una acción), error con reintento y carga (skeleton con brillo). */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { strings } from '@/i18n';
import { radius, spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

import { AppText } from './app-text';
import { Button } from './button';
import { BuddyRobot, type RobotMood } from './robot';

export function EmptyState({
  title,
  text,
  action,
  mood = 'wave',
  robotSize = 112,
  style,
}: {
  title: string;
  text?: string;
  action?: { label: string; onPress: () => void };
  mood?: RobotMood;
  robotSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[styles.empty, style]}>
      <BuddyRobot size={robotSize} mood={mood} />
      <AppText variant="h3" align="center">
        {title}
      </AppText>
      {text ? (
        <AppText variant="secondary" color={t.c.muted} align="center">
          {text}
        </AppText>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

export function ErrorState({ title = strings.common.errorTitle, text = strings.common.errorBody, onRetry }: { title?: string; text?: string; onRetry?: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.error, { backgroundColor: t.c.bg, paddingTop: insets.top + spacing.xxl }]} accessibilityLiveRegion="assertive">
      <EmptyState mood="worry" title={title} text={text} action={onRetry ? { label: strings.common.retry, onPress: onRetry } : undefined} />
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
      style={[{ width, height, borderRadius: round, backgroundColor: t.c.surface2, overflow: 'hidden' }, style]}
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
  action: { alignSelf: 'stretch', marginTop: spacing.xs },
  error: { flex: 1, paddingHorizontal: spacing.screen },
});
