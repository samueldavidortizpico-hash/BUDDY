/**
 * Presentaciones de la primera apertura (V4.2): cada una con SU ilustración real (assets/onboarding, tomadas de las
 * referencias del dueño) sobre su propio degradado, medido en la referencia. Nada se dibuja en código salvo los
 * destellos y el pulso que acompañan a cada ilustración.
 *
 * Movimiento (todo transform y opacidad en el hilo de UI; con "reducir movimiento" queda quieto):
 * - el fondo de cada presentación se funde con el siguiente según el desplazamiento del dedo (opacidad por capa);
 * - la ilustración flota suave y se desplaza más lento que la página (paralaje);
 * - detalle propio: destellos (1), aviso que late sobre el celular (2), corazón que late (3), mundo que se mece (4).
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme/provider';

type Detail = 'sparkles' | 'ping' | 'beat' | 'sway';
interface Palette {
  /** Arriba (barra superior) y abajo (título y texto). */
  top: string;
  bottom: string;
  /** Tinte de la banda de la ilustración, de izquierda a derecha. */
  tint: readonly [string, string];
}

export const SLIDE_ART: { image: number; ratio: number; detail: Detail; light: Palette; dark: Palette }[] = [
  {
    image: require('../../../assets/onboarding/companero.png'),
    ratio: 146 / 192,
    detail: 'sparkles',
    light: { top: '#C9F4F1', bottom: '#E8F6F0', tint: ['#6FE6E2', '#D4CBF9'] },
    dark: { top: '#0B1622', bottom: '#0B1622', tint: ['#0F4650', '#2A2C5C'] },
  },
  {
    image: require('../../../assets/onboarding/rutinas.png'),
    ratio: 151 / 179,
    detail: 'ping',
    light: { top: '#EAF8F1', bottom: '#E9F5F1', tint: ['#A3EDCF', '#C4C3F8'] },
    dark: { top: '#0B1622', bottom: '#0B1622', tint: ['#123F3A', '#272B57'] },
  },
  {
    image: require('../../../assets/onboarding/bienestar.png'),
    ratio: 144 / 184,
    detail: 'beat',
    light: { top: '#E9E6F8', bottom: '#EBF6F1', tint: ['#C6BBFB', '#FBA694'] },
    dark: { top: '#0B1622', bottom: '#0B1622', tint: ['#2B2558', '#4A2830'] },
  },
  {
    image: require('../../../assets/onboarding/familia.png'),
    ratio: 146 / 182,
    detail: 'sway',
    light: { top: '#C3D3E6', bottom: '#E9F6F2', tint: ['#9FB7DA', '#A6CFEE'] },
    dark: { top: '#0B1622', bottom: '#0B1622', tint: ['#163257', '#1C3B57'] },
  },
];

/** Fondo de una presentación: banda tintada izquierda → derecha que se funde arriba y abajo con el tono de la pantalla. */
function Background({ p, illustrationEnd }: { p: Palette; illustrationEnd: number }) {
  const clear = (c: string) => `${c}00`;
  return (
    <>
      <LinearGradient colors={p.tint} start={{ x: 0, y: 0.4 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[p.top, clear(p.top), clear(p.bottom), p.bottom, p.bottom]}
        locations={[0, 0.16, Math.max(0.2, illustrationEnd - 0.2), Math.min(0.95, illustrationEnd + 0.04), 1]}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}

/** Los cuatro fondos apilados; cada uno aparece según cuánto se ha deslizado hacia su página (solo opacidad). */
export function SlideBackgrounds({ x, width, illustrationEnd }: { x: SharedValue<number>; width: number; illustrationEnd: number }) {
  const t = useTheme();
  if (t.hc) return <View style={[StyleSheet.absoluteFill, { backgroundColor: t.c.bg }]} />;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SLIDE_ART.map((art, i) => (
        <Layer key={i} index={i} x={x} width={width}>
          <Background p={t.dark ? art.dark : art.light} illustrationEnd={illustrationEnd} />
        </Layer>
      ))}
    </View>
  );
}

function Layer({ index, x, width, children }: { index: number; x: SharedValue<number>; width: number; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({
    opacity: index === 0 ? 1 : interpolate(x.get() / Math.max(1, width), [index - 1, index], [0, 1], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/** Ilustración de la página `index`: flota, se desplaza con paralaje y lleva su detalle animado. */
export function Illustration({ index, x, width, height }: { index: number; x: SharedValue<number>; width: number; height: number }) {
  const art = SLIDE_ART[index];
  const t = useTheme();
  const reduce = useReducedMotion();
  const float = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    const sine = Easing.inOut(Easing.sin);
    float.set(withRepeat(withSequence(withTiming(1, { duration: 2600, easing: sine }), withTiming(0, { duration: 2600, easing: sine })), -1));
    if (art.detail === 'beat') {
      // Latido doble cada 1,6 s.
      pulse.set(withRepeat(withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 160 }), withTiming(0.7, { duration: 120 }), withTiming(0, { duration: 180 }), withDelay(1000, withTiming(0, { duration: 0 }))), -1));
    } else {
      pulse.set(withRepeat(withSequence(withTiming(1, { duration: 1800, easing: sine }), withTiming(0, { duration: 1800, easing: sine })), -1));
    }
    return () => [float, pulse].forEach((v) => cancelAnimation(v));
  }, [reduce, art.detail, float, pulse]);

  // En oscuro la ilustración (de fondo claro) va dentro de una forma redondeada: así se ve intencional y no como un
  // recorte claro pegado sobre la noche.
  const framed = t.dark || t.hc;
  const h = framed ? height * 0.92 : height;
  const w = framed ? Math.min(width - 48, h * 1.02) : Math.min(width, h * art.ratio * 1.18);
  const style = useAnimatedStyle(() => {
    const d = x.get() / Math.max(1, width) - index; // −1…1 alrededor de esta página
    const beat = art.detail === 'beat' ? 1 + 0.035 * pulse.get() : 1;
    const sway = art.detail === 'sway' ? (pulse.get() - 0.5) * 3 : 0;
    return {
      opacity: interpolate(Math.abs(d), [0, 0.9], [1, 0.4], Extrapolation.CLAMP),
      transform: [{ translateX: d * width * 0.42 }, { translateY: -8 * float.get() }, { scale: beat }, { rotate: `${sway}deg` }],
    };
  });

  return (
    <View style={[styles.stage, { width, height: h }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ width: w, height: h }, framed && [styles.frame, { backgroundColor: art.light.tint[0] }], style]}>
        {framed ? <LinearGradient colors={[art.light.top, art.light.tint[0], art.light.tint[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        <Image source={art.image} style={StyleSheet.absoluteFill} contentFit={framed ? 'cover' : 'fill'} accessible={false} />
        {art.detail === 'sparkles' ? <Sparkles pulse={pulse} w={w} h={h} /> : null}
        {art.detail === 'ping' ? <Ping pulse={pulse} w={w} h={h} /> : null}
      </Animated.View>
    </View>
  );
}

const STAR = 'M12 0 C12.8 8 16 11.2 24 12 C16 12.8 12.8 16 12 24 C11.2 16 8 12.8 0 12 C8 11.2 11.2 8 12 0Z';
const SPARKS = [
  { x: 0.17, y: 0.2, s: 0.16, phase: 0 },
  { x: 0.86, y: 0.52, s: 0.09, phase: 0.5 },
  { x: 0.74, y: 0.14, s: 0.06, phase: 0.25 },
  { x: 0.1, y: 0.62, s: 0.05, phase: 0.75 },
];

/** Destellos de cuatro puntas que titilan sobre la ilustración del compañero. */
function Sparkles({ pulse, w, h }: { pulse: SharedValue<number>; w: number; h: number }) {
  return (
    <>
      {SPARKS.map((sp, i) => (
        <Spark key={i} spec={sp} pulse={pulse} w={w} h={h} />
      ))}
    </>
  );
}

function Spark({ spec, pulse, w, h }: { spec: (typeof SPARKS)[number]; pulse: SharedValue<number>; w: number; h: number }) {
  const size = w * spec.s;
  const style = useAnimatedStyle(() => {
    const v = Math.abs(((pulse.get() + spec.phase) % 1) * 2 - 1);
    return { opacity: 0.35 + 0.65 * v, transform: [{ scale: 0.7 + 0.4 * v }, { rotate: `${v * 20}deg` }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: spec.x * w - size / 2, top: spec.y * h - size / 2, width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d={STAR} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

/** Aviso que late junto a la campana del celular (anillo que se expande y se desvanece). */
function Ping({ pulse, w, h }: { pulse: SharedValue<number>; w: number; h: number }) {
  const d = w * 0.1;
  const style = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - pulse.get()), transform: [{ scale: 0.6 + 1.2 * pulse.get() }] }));
  return <Animated.View pointerEvents="none" style={[styles.abs, styles.ping, { left: w * 0.68 - d / 2, top: h * 0.22 - d / 2, width: d, height: d, borderRadius: d / 2 }, style]} />;
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute' },
  ping: { borderWidth: 3, borderColor: '#FF8A73' },
  frame: { borderRadius: 36, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
});
