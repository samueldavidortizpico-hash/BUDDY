import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { gradients, ink, palette, spacing, type GradientName } from '@/theme';

import { AppText } from './app-text';

function GrowBar({ ratio, index, children, style }: { ratio: number; index: number; children: React.ReactNode; style: object }) {
  const reduceMotion = useReducedMotion();
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    grow.set(reduceMotion ? 1 : withDelay(index * 50, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })));
  }, [grow, index, reduceMotion]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));
  return (
    <Animated.View style={[style, { height: `${Math.max(6, ratio * 100)}%`, transformOrigin: 'bottom' }, anim]}>
      {children}
    </Animated.View>
  );
}

/** Mini gráfico de barras (valores 0–100). Solo forma visual; el valor se lee en el texto de la tarjeta. */
export function Sparkline({ values, color = palette.mint, height = 34 }: { values: number[]; color?: string; height?: number }) {
  return (
    <View style={[styles.spark, { height }]} accessible={false} importantForAccessibility="no-hide-descendants">
      {values.map((v, i) => (
        <GrowBar key={i} index={i} ratio={v / 100} style={[styles.sparkBar, { backgroundColor: color }]}>
          {null}
        </GrowBar>
      ))}
    </View>
  );
}

export interface BarDatum {
  label: string;
  /** 0–1; null = sin datos ese día. */
  value: number | null;
}

/** Gráfico de barras con etiquetas. El resumen accesible lo da `accessibilityLabel`. */
export function BarChart({
  data,
  gradient = 'bars',
  height = 110,
  accessibilityLabel,
}: {
  data: BarDatum[];
  gradient?: GradientName;
  height?: number;
  accessibilityLabel: string;
}) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={styles.chart}>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} style={styles.col}>
            {d.value === null ? (
              <View style={styles.empty} />
            ) : (
              <GrowBar index={i} ratio={d.value} style={styles.bar}>
                <LinearGradient colors={gradients[gradient]} style={StyleSheet.absoluteFill} />
              </GrowBar>
            )}
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <AppText key={`${d.label}-l-${i}`} variant="meta" color={ink.muted} align="center" style={styles.label} numberOfLines={1}>
            {d.label}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  sparkBar: { flex: 1, borderRadius: 4, opacity: 0.8 },
  chart: { gap: spacing.xs, paddingTop: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: 14, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, overflow: 'hidden' },
  empty: { width: 14, height: 8, borderRadius: 4, backgroundColor: palette.slatePale },
  labels: { flexDirection: 'row', gap: spacing.xs },
  label: { flex: 1 },
});
