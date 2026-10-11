import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { gradients, palette, radius, type GradientName, type TypeVariant } from '@/theme';

import { AppText } from './app-text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const FILL_MS = 900;

/** Barra de progreso que se llena al montar (scaleX desde la izquierda). */
export function ProgressBar({
  value,
  height = 10,
  gradient = 'progress',
  track = palette.slatePale,
  accessibilityLabel,
  style,
}: {
  value: number;
  height?: number;
  gradient?: GradientName;
  track?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  const progress = useSharedValue(reduceMotion ? clamped : 0);

  useEffect(() => {
    progress.set(reduceMotion ? clamped : withTiming(clamped, { duration: FILL_MS, easing: Easing.out(Easing.cubic) }));
  }, [clamped, reduceMotion, progress]);

  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }, style]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: 'left' }, fill]}>
        <LinearGradient colors={gradients[gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: height }]} />
      </Animated.View>
    </View>
  );
}

/** Anillo de progreso SVG que se completa al montar. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  color = palette.mint,
  track = 'rgba(94, 217, 181, 0.18)',
  children,
  accessibilityLabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  accessibilityLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const progress = useSharedValue(reduceMotion ? clamped : 0);

  useEffect(() => {
    progress.set(reduceMotion ? clamped : withTiming(clamped, { duration: FILL_MS, easing: Easing.out(Easing.cubic) }));
  }, [clamped, reduceMotion, progress]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={props}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Número que cuenta hasta su valor al montar (bucle con condición de parada). */
export function CountUp({
  value,
  suffix = '',
  variant = 'number',
  color,
  style,
  duration = 700,
}: {
  value: number;
  suffix?: string;
  variant?: TypeVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [counted, setShown] = useState(0);
  const shown = reduceMotion ? value : counted;

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduceMotion]);

  return (
    <AppText variant={variant} color={color} style={style} accessibilityLabel={`${value}${suffix}`}>
      {shown}
      {suffix}
    </AppText>
  );
}

export const progressStyles = StyleSheet.create({ pill: { borderRadius: radius.pill } });
