/** Gráficos ligeros en SVG/Reanimated: anillo y barra de progreso, agua con ondas, barras, pulso y caras de ánimo. */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Answer3 } from '@/domain/types';
import { motion, spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

import { AppText } from './app-text';

/** Svg decorativo: en web `<svg>` no entiende las props nativas de accesibilidad (llegaban al DOM y React avisaba). */
const SVG_HIDDEN = Platform.OS === 'web' ? { 'aria-hidden': true } : { accessibilityElementsHidden: true, importantForAccessibility: 'no' as const };

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

/** Barra horizontal que se llena con ease-out (scaleX desde la izquierda). `track`: riel con el tinte del dominio. */
export function ProgressBar({ ratio, color, track, height = 12, label }: { ratio: number; color: string; track?: string; height?: number; label?: string }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const target = Math.max(0, Math.min(1, ratio));
  const p = useSharedValue(reduce ? target : 0);
  useEffect(() => {
    p.set(reduce ? target : withTiming(target, { duration: motion.countUp, easing: Easing.out(Easing.cubic) }));
  }, [target, reduce, p]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.001, p.value) }] }));
  return (
    <View style={{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: track ?? t.c.surface2 }} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(target * 100) }}>
      <Animated.View style={[styles.progressFill, { backgroundColor: t.hc ? t.c.text : color }, fill]}>
        {t.hc ? null : <LinearGradient colors={SHEEN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
      </Animated.View>
    </View>
  );
}

/** Brillo que aclara un extremo del relleno: da volumen sin definir otro color por dominio. */
const SHEEN = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.38)'] as const;

/**
 * Pulso: anillos que salen de un punto y se desvanecen (radar suave para "buscando" o "en vivo"). Decorativo.
 * Con "reducir movimiento" queda un solo anillo quieto.
 */
export function PulseRings({ size, color, count = 3 }: { size: number; color: string; count?: number }) {
  const reduce = useReducedMotion();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pulse]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: reduce ? 1 : count }, (_, i) => (
        <PulseRing key={i} size={size} color={color} delay={(i * 2400) / count} still={reduce} />
      ))}
    </View>
  );
}

function PulseRing({ size, color, delay, still }: { size: number; color: string; delay: number; still: boolean }) {
  const v = useSharedValue(still ? 0.4 : 0);
  useEffect(() => {
    if (still) return;
    v.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false)));
    return () => cancelAnimation(v);
  }, [still, delay, v]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - v.value), transform: [{ scale: 1 + 1.1 * v.value }] }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }, style]} />;
}

/** Barras verticales que crecen con ease-out (scaleY), escalonadas de izquierda a derecha. */
export function Bars({ values, max, color, labels, height = 96, labelColor, track }: { values: number[]; max?: number; color: string; labels?: string[]; height?: number; labelColor?: string; track?: string }) {
  const t = useTheme();
  const top = max ?? Math.max(1, ...values);
  return (
    <View style={[styles.bars, { minHeight: height + 22 }]}>
      {values.map((v, i) => (
        <View key={i} style={styles.barCol}>
          <View style={[styles.barTrack, { height, backgroundColor: track ?? t.c.surface2 }]}>
            <Bar ratio={v / top} color={t.hc ? t.c.text : color} height={height} delay={Math.min(i, 12) * 45} sheen={!t.hc} />
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

function Bar({ ratio, color, height, delay, sheen }: { ratio: number; color: string; height: number; delay: number; sheen: boolean }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? ratio : 0);
  useEffect(() => {
    p.set(reduce ? ratio : withDelay(delay, withTiming(ratio, { duration: motion.countUp, easing: Easing.out(Easing.cubic) })));
  }, [ratio, reduce, delay, p]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: height / 2 }, { scaleY: Math.max(0.001, p.value) }, { translateY: -height / 2 }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height, borderRadius: 7, backgroundColor: color, overflow: 'hidden' }, style]}>
      {sheen ? <LinearGradient colors={[SHEEN[1], SHEEN[0]]} style={StyleSheet.absoluteFill} /> : null}
    </Animated.View>
  );
}

/** Cara ilustrada para ánimo y sueño: bien, regular, mal. */
export function Face({ kind, size = 96, color }: { kind: Answer3; size?: number; color?: string }) {
  const t = useTheme();
  const fg = color ?? t.c.text;
  const mouth = kind === 'good' ? 'M30 60 Q50 78 70 60' : kind === 'regular' ? 'M32 64 L68 64' : 'M30 70 Q50 54 70 70';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" {...SVG_HIDDEN}>
      <Circle cx="35" cy="40" r="6" fill={fg} />
      <Circle cx="65" cy="40" r="6" fill={fg} />
      {kind === 'bad' ? <Path d="M26 28 L42 33 M74 28 L58 33" stroke={fg} strokeWidth="5" strokeLinecap="round" /> : null}
      <Path d={mouth} stroke={fg} strokeWidth="7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  progressFill: { flex: 1, transformOrigin: 'left', overflow: 'hidden' },
  pulse: { alignItems: 'center', justifyContent: 'center' },
  barLabel: { alignSelf: 'stretch', flexShrink: 1 },
  wave: { position: 'absolute', top: -14, left: 0, width: 400, height: 40 },
  waterBody: { position: 'absolute', top: 22, left: 0, right: 0, bottom: -10 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  // Barras delgadas sobre su riel: se leen como gráfica y no como bloques de color.
  barTrack: { width: 14, borderRadius: 7, overflow: 'hidden' },
});
