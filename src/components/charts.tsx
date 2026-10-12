/** Gráficos ligeros en SVG/Reanimated: anillo de progreso, relleno de agua con ondas, barras y caras de ánimo. */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Answer3 } from '@/domain/types';
import { motion, spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

import { AppText } from './app-text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Anillo que se llena con ease-out (strokeDashoffset en una superficie pequeña y aislada). */
export function ProgressRing({ size = 64, stroke = 8, ratio, color, label }: { size?: number; stroke?: number; ratio: number; color: string; label?: string }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(reduce ? ratio : 0);
  useEffect(() => {
    p.set(reduce ? ratio : withTiming(Math.max(0, Math.min(1, ratio)), { duration: motion.countUp, easing: Easing.out(Easing.cubic) }));
  }, [ratio, reduce, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.c.surface2} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={t.hc ? t.c.text : color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          animatedProps={props}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {label ? (
        <AppText variant="captionStrong" style={{ fontVariant: ['tabular-nums'] }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

/** Nivel de agua que sube con resorte y dos ondas desfasadas (solo transform). */
export function WaterFill({ ratio, height = 236 }: { ratio: number; height?: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const level = useSharedValue(0);
  const w1 = useSharedValue(0);
  const w2 = useSharedValue(0);
  useEffect(() => {
    const target = Math.max(0, Math.min(1, ratio));
    level.set(reduce ? target : withTiming(target, { duration: 700, easing: Easing.out(Easing.back(1.4)) }));
  }, [ratio, reduce, level]);
  useEffect(() => {
    if (reduce) return;
    w1.set(withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1));
    w2.set(withRepeat(withTiming(1, { duration: 4500, easing: Easing.linear }), -1));
    return () => [w1, w2].forEach((v) => cancelAnimation(v));
  }, [reduce, w1, w2]);
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: height * (1 - level.value) }] }));
  const wave1 = useAnimatedStyle(() => ({ transform: [{ translateX: -200 * w1.value }] }));
  const wave2 = useAnimatedStyle(() => ({ transform: [{ translateX: -200 * (1 - w2.value) }] }));
  if (t.hc) return null;
  const blue = t.dark ? 'rgba(124, 194, 255, 0.35)' : 'rgba(31, 111, 196, 0.22)';
  const wave = 'M0 12 Q25 0 50 12 T100 12 T150 12 T200 12 T250 12 T300 12 T350 12 T400 12 V40 H0 Z';
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, body]}>
      <Animated.View style={[styles.wave, wave1]}>
        <Svg width={400} height={40} viewBox="0 0 400 40">
          <Path d={wave} fill={blue} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.wave, { top: 6 }, wave2]}>
        <Svg width={400} height={40} viewBox="0 0 400 40">
          <Path d={wave} fill={blue} />
        </Svg>
      </Animated.View>
      <View style={[styles.waterBody, { backgroundColor: blue }]} />
    </Animated.View>
  );
}

/** Barras verticales que crecen con ease-out (scaleY). */
export function Bars({ values, max, color, labels, height = 96, labelColor }: { values: number[]; max?: number; color: string; labels?: string[]; height?: number; labelColor?: string }) {
  const t = useTheme();
  const top = max ?? Math.max(1, ...values);
  return (
    <View style={[styles.bars, { minHeight: height + 22 }]}>
      {values.map((v, i) => (
        <View key={i} style={styles.barCol}>
          <View style={[styles.barTrack, { height, backgroundColor: t.c.surface2 }]}>
            <Bar ratio={v / top} color={t.hc ? t.c.text : color} height={height} />
          </View>
          {labels ? (
            <AppText variant="meta" color={labelColor ?? t.c.muted} align="center" style={styles.barLabel}>
              {labels[i]}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function Bar({ ratio, color, height }: { ratio: number; color: string; height: number }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? ratio : 0);
  useEffect(() => {
    p.set(reduce ? ratio : withTiming(ratio, { duration: motion.countUp, easing: Easing.out(Easing.cubic) }));
  }, [ratio, reduce, p]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: height / 2 }, { scaleY: Math.max(0.001, p.value) }, { translateY: -height / 2 }] }));
  return <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height, borderRadius: 6, backgroundColor: color }, style]} />;
}

/** Cara ilustrada para ánimo y sueño: bien, regular, mal. */
export function Face({ kind, size = 96, color }: { kind: Answer3; size?: number; color?: string }) {
  const t = useTheme();
  const fg = color ?? t.c.text;
  const mouth = kind === 'good' ? 'M30 60 Q50 78 70 60' : kind === 'regular' ? 'M32 64 L68 64' : 'M30 70 Q50 54 70 70';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no">
      <Circle cx="35" cy="40" r="6" fill={fg} />
      <Circle cx="65" cy="40" r="6" fill={fg} />
      {kind === 'bad' ? <Path d="M26 28 L42 33 M74 28 L58 33" stroke={fg} strokeWidth="5" strokeLinecap="round" /> : null}
      <Path d={mouth} stroke={fg} strokeWidth="7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  barLabel: { alignSelf: 'stretch', flexShrink: 1 },
  wave: { position: 'absolute', top: -14, left: 0, width: 400, height: 40 },
  waterBody: { position: 'absolute', top: 22, left: 0, right: 0, bottom: -10 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { width: '100%', borderRadius: 6, overflow: 'hidden' },
});
