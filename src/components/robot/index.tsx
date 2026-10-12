/**
 * BuddyRobot: el personaje de BUDDY con vuelo en reposo, sombra, propulsor, latido, destellos, estados de ánimo y
 * reacción al toque. Todo el movimiento corre en el hilo de UI (Reanimated) y solo anima transform y opacidad.
 *
 * Arte: si existe un PNG nítido (≥ 1000 px, exportado a 4x desde Figma) se registra en `HIGH_RES_PNG` y se usa;
 * si no, se usa el robot vectorial por capas (vector.tsx), que es nítido a cualquier tamaño y anima ojos y brazos.
 * El vuelo entre pantallas lo hace RobotStage (stage.tsx), que reutiliza este componente.
 */
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect, useId } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { motion } from '@/theme';
import { useTheme } from '@/theme/provider';
import { successHaptic, tapHaptic } from '@/utils/haptics';

import { BuddyRobotVector, VECTOR_RATIO, type RobotMood } from './vector';

export type { RobotMood } from './vector';

/**
 * PNG de alta resolución con fondo transparente. `null` mientras el dueño no aporte la exportación a 4x:
 * el PNG actual del logo mide 112×128 px y se vería pixelado.
 */
const HIGH_RES_PNG: number | null = null;
const PNG_RATIO = 896 / 1024;

export const ROBOT_RATIO = HIGH_RES_PNG ? PNG_RATIO : VECTOR_RATIO;
/** Alto mínimo del robot en cualquier pantalla (el encabezado del chat usa `compact`, 56). */
export const ROBOT_MIN = 96;

export interface BuddyRobotProps {
  /** Fallbacks fuera del navegador: anima sin suscribirse al foco de una ruta. */
  navigationIndependent?: boolean;
  /** Alto del robot en dp (mínimo 96 salvo `compact`). */
  size?: number;
  mood?: RobotMood;
  /** −1…1: hacia dónde mira. */
  look?: number;
  /** Vaivén volador continuo. */
  flying?: boolean;
  /** Halo menta detrás del robot (siempre en oscuro para que no se pierda). */
  glow?: boolean;
  /** Sombra elíptica en el suelo y propulsor menta. */
  shadow?: boolean;
  /** Destellos de cuatro puntas alrededor (máximo 6). */
  sparkles?: boolean;
  /** Voltereta al tocar (bienvenida); si no, saltito con destellos. */
  tapFlip?: boolean;
  /** Permite tamaños menores de 96 (encabezado del chat). */
  compact?: boolean;
  /** Pulso de reacción externo: al cambiar, el robot da un saltito (p. ej., al enviar en el chat). */
  bump?: number;
  onPress?: () => void;
  /** Etiqueta cuando el robot comunica algo. Sin ella es decorativo y se oculta al lector. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const sine = Easing.inOut(Easing.sin);
const SPARKLES = [
  { x: -0.12, y: 0.12, s: 1, d: 1600 },
  { x: 0.98, y: 0.04, s: 0.8, d: 2000 },
  { x: 1.08, y: 0.5, s: 0.65, d: 2400 },
  { x: -0.18, y: 0.6, s: 0.7, d: 1800 },
  { x: 0.5, y: -0.1, s: 0.55, d: 2200 },
  { x: 0.86, y: 0.86, s: 0.6, d: 1700 },
];

export function pingPong(v: SharedValue<number>, from: number, to: number, duration: number, delay = 0) {
  v.set(from);
  v.set(
    withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(to, { duration: duration / 2, easing: sine }), withTiming(from, { duration: duration / 2, easing: sine })),
        -1,
      ),
    ),
  );
}

/** Arte del robot: PNG nítido si existe, si no el vector por capas. */
export function RobotArt({ size, mood, look, animated = true }: { size: number; mood: RobotMood; look: number; animated?: boolean }) {
  if (HIGH_RES_PNG) {
    return <Image source={HIGH_RES_PNG} contentFit="contain" style={{ width: size * PNG_RATIO, height: size }} accessible={false} />;
  }
  return <BuddyRobotVector size={size} mood={mood} look={look} animated={animated} />;
}

export function BuddyRobot({ navigationIndependent = false, ...props }: BuddyRobotProps) {
  return navigationIndependent ? <RobotBody {...props} focused /> : <FocusedRobot {...props} />;
}

function FocusedRobot(props: BuddyRobotProps) {
  const focused = useIsFocused();
  return <RobotBody {...props} focused={focused} />;
}

function RobotBody({
  size = 160,
  mood = 'idle',
  look = 0,
  flying = true,
  glow = false,
  shadow = true,
  sparkles = false,
  tapFlip = false,
  compact = false,
  bump,
  onPress,
  accessibilityLabel,
  style,
  focused,
}: BuddyRobotProps & { focused: boolean }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const h = compact ? size : Math.max(size, ROBOT_MIN);
  const w = h * ROBOT_RATIO;

  const bob = useSharedValue(0);
  const drift = useSharedValue(0);
  const tilt = useSharedValue(0);
  const hop = useSharedValue(0);
  const spin = useSharedValue(0);
  const burst = useSharedValue(0);
  const fade = useSharedValue(reduce ? 0 : 1);
  const t0 = useSharedValue(0);
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  const t3 = useSharedValue(0);
  const t4 = useSharedValue(0);
  const t5 = useSharedValue(0);
  const twinkles = [t0, t1, t2, t3, t4, t5];

  useEffect(() => {
    const loops = [bob, drift, tilt, hop, spin, burst, fade, ...twinkles];
    const stopAll = () => loops.forEach((v) => cancelAnimation(v));
    if (reduce) {
      stopAll();
      [bob, drift, tilt, hop, spin, burst, ...twinkles].forEach((v) => v.set(0));
      fade.set(withTiming(1, { duration: 320 }));
      return stopAll;
    }
    if (!focused) {
      stopAll();
      return;
    }
    const slow = mood === 'worry' || mood === 'sleep' ? 1.6 : 1;
    if (flying) {
      pingPong(bob, -1, 1, 2800 * slow);
      pingPong(drift, -1, 1, 5000 * slow);
      pingPong(tilt, -2.5, 2.5, 4200 * slow, 700);
    }
    if (sparkles) twinkles.forEach((v, i) => pingPong(v, 0, 1, SPARKLES[i].d, i * 260));
    // Saludo cada 7 s: −10°, 8°, −6°, 0° en 900 ms con un saltito.
    if (flying && (mood === 'idle' || mood === 'wave')) {
      const wave = withSequence(
        withTiming(-10, { duration: 220 }),
        withTiming(8, { duration: 240 }),
        withTiming(-6, { duration: 220 }),
        withTiming(0, { duration: 220 }),
        withDelay(6100, withTiming(0, { duration: 0 })),
      );
      spin.set(withDelay(6100, withRepeat(wave, -1)));
    }
    return stopAll;
    // Los shared values son estables; solo se reinicia por foco, movimiento reducido o cambio de estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, reduce, mood, flying, sparkles]);

  // Celebración: salto, voltereta de 360° en 700 ms y estallido de destellos.
  useEffect(() => {
    if (mood !== 'celebrate') return;
    successHaptic();
    if (reduce) return;
    hop.set(withSequence(withTiming(-h * 0.22, { duration: 260, easing: Easing.out(Easing.quad) }), withSpring(0, motion.springSoft)));
    spin.set(withSequence(withTiming(360, { duration: 700, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })));
    burst.set(withSequence(withTiming(1, { duration: 200 }), withTiming(0, { duration: 700 })));
  }, [mood, reduce, h, hop, spin, burst]);

  // Pulso externo (chat: al enviar).
  useEffect(() => {
    if (bump === undefined || bump === 0 || reduce) return;
    hop.set(withSequence(withTiming(-h * 0.14, { duration: 160, easing: Easing.out(Easing.quad) }), withSpring(0, motion.spring)));
    burst.set(withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 500 })));
  }, [bump, reduce, h, hop, burst]);

  const react = () => {
    tapHaptic();
    onPress?.();
    if (reduce) return;
    burst.set(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 600 })));
    hop.set(withSequence(withTiming(-h * (tapFlip ? 0.18 : 0.12), { duration: 180, easing: Easing.out(Easing.quad) }), withSpring(0, motion.spring)));
    if (tapFlip) spin.set(withSequence(withTiming(360, { duration: 700, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })));
  };

  const body = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: drift.value * h * 0.06 },
      { translateY: bob.value * h * 0.045 + hop.value },
      { rotate: `${tilt.value + spin.value}deg` },
    ],
  }));
  const ground = useAnimatedStyle(() => ({
    opacity: interpolate(bob.value, [-1, 1], [0.45, 0.8]) * interpolate(hop.value, [-h * 0.2, 0], [0.4, 1], 'clamp'),
    transform: [{ translateX: drift.value * h * 0.06 }, { scaleX: interpolate(bob.value, [-1, 1], [0.78, 1]) }],
  }));
  const thrust = useAnimatedStyle(() => ({
    opacity: interpolate(bob.value, [-1, 1], [0.65, 0.35]),
    transform: [{ translateX: drift.value * h * 0.06 }, { translateY: bob.value * h * 0.045 + hop.value }, { scaleY: interpolate(bob.value, [-1, 1], [1.15, 0.9]) }],
  }));

  const decorative = !accessibilityLabel && !onPress;
  const boxW = w * 1.5;
  const left = (boxW - w) / 2;
  const showGlow = (glow || t.dark) && !t.hc;

  return (
    <View
      style={[{ width: boxW, height: h * 1.18 }, style]}
      pointerEvents="box-none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      accessible={!decorative && !onPress}
      accessibilityRole={!decorative && !onPress ? 'image' : undefined}
      accessibilityLabel={onPress ? undefined : accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      {shadow && !t.hc ? (
        <>
          <Animated.View style={[styles.abs, { bottom: 0, left: left + w * 0.12, width: w * 0.76, height: h * 0.08 }, ground]}>
            <SoftEllipse color={t.dark ? '#000000' : '#174A59'} opacity={t.dark ? 0.6 : 0.3} />
          </Animated.View>
          <Animated.View style={[styles.abs, { top: h * 0.84, left: left + w * 0.18, width: w * 0.64, height: h * 0.2 }, thrust]}>
            <SoftEllipse color="#5ED9B5" opacity={0.85} />
          </Animated.View>
        </>
      ) : null}

      <Animated.View style={[styles.abs, { top: 0, left, width: w, height: h }, body]}>
        {showGlow ? (
          <View style={[styles.abs, { width: h * 1.3, height: h * 1.3, left: (w - h * 1.3) / 2, top: -h * 0.15 }]}>
            <SoftEllipse color="#5ED9B5" opacity={t.dark ? 0.38 : 0.4} />
          </View>
        ) : null}
        <Pressable
          onPress={react}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={onPress ? (accessibilityLabel ?? 'BUDDY') : undefined}
          style={StyleSheet.absoluteFill}
        >
          <RobotArt size={h} mood={mood} look={look} animated={focused} />
        </Pressable>
        {mood === 'think' ? <ThinkingDots size={h} /> : null}
      </Animated.View>

      {sparkles || mood === 'celebrate' || bump ? (
        SPARKLES.map((s, i) => <Sparkle key={i} spec={s} twinkle={twinkles[i]} burst={burst} w={w} size={h} left={left} />)
      ) : null}
    </View>
  );
}

/** Elipse con degradado radial: brillo suave sin animar desenfoques. */
export function SoftEllipse({ color, opacity }: { color: string; opacity: number }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="50" rx="50" ry="50" fill={`url(#${id})`} />
    </Svg>
  );
}

const STAR = 'M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z';

function Sparkle({
  spec,
  twinkle,
  burst,
  w,
  size,
  left,
}: {
  spec: (typeof SPARKLES)[number];
  twinkle: SharedValue<number>;
  burst: SharedValue<number>;
  w: number;
  size: number;
  left: number;
}) {
  const t = useTheme();
  const px = size * 0.13 * spec.s;
  const style = useAnimatedStyle(() => {
    const v = Math.max(twinkle.value, burst.value);
    const out = burst.value * 0.35;
    return {
      opacity: v,
      transform: [
        { translateX: (spec.x - 0.5) * w * out },
        { translateY: (spec.y - 0.5) * size * out },
        { scale: 0.5 + v * 0.6 },
        { rotate: `${v * 25}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: left + spec.x * w - px / 2, top: spec.y * size - px / 2, width: px, height: px }, style]}>
      <Svg width={px} height={px} viewBox="0 0 24 24">
        <Path d={STAR} fill={spec.s > 0.75 ? t.c.mint : t.dark ? '#FFFFFF' : t.c.yellow} />
      </Svg>
    </Animated.View>
  );
}

function ThinkingDots({ size }: { size: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      [a, b, c].forEach((d) => { cancelAnimation(d); d.set(0); });
      return;
    }
    [a, b, c].forEach((d, i) => pingPong(d, 0, 1, 900, i * 150));
    return () => [a, b, c].forEach((d) => cancelAnimation(d));
  }, [a, b, c, reduce]);
  const d = size * 0.07;
  return (
    <View style={[styles.row, { top: -size * 0.04, right: -size * 0.12, gap: d * 0.5 }]} pointerEvents="none">
      {[a, b, c].map((v, i) => (
        <Dot key={i} v={v} d={d} color={t.c.lavender} />
      ))}
    </View>
  );
}

function Dot({ v, d, color }: { v: SharedValue<number>; d: number; color: string }) {
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + v.value * 0.6, transform: [{ translateY: -v.value * d * 0.6 }] }));
  return <Animated.View style={[{ width: d, height: d, borderRadius: d, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  row: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
});
