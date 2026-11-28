/**
 * Presentaciones de la primera apertura (V4.4, boceto docs/referencias/onboarding-login/Paso1–4): cada ilustración
 * real (assets/onboarding) va dentro de una tarjeta redondeada con el degradado de su paso (`theme.intro`), un círculo
 * blanco translúcido y destellos. La PNG trae su propio fondo pintado, así que se recorta en una ventana redondeada
 * para no verse como un rectángulo pálido sobre el degradado. En código solo se dibujan tarjeta, círculo y destellos.
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
/** Destello fijo de la tarjeta: posición en fracción del ancho y alto, tamaño en dp para una tarjeta de 340. */
type CardSpark = { x: number; y: number; s: number };

export const SLIDE_ART: { image: number; ratio: number; detail: Detail; sparks: CardSpark[] }[] = [
  {
    image: require('../../../assets/onboarding/companero.png'),
    ratio: 146 / 192,
    detail: 'sparkles',
    sparks: [{ x: 0.12, y: 0.1, s: 34 }, { x: 0.87, y: 0.27, s: 18 }, { x: 0.16, y: 0.65, s: 12 }],
  },
  {
    image: require('../../../assets/onboarding/rutinas.png'),
    ratio: 151 / 179,
    detail: 'ping',
    sparks: [{ x: 0.88, y: 0.1, s: 30 }, { x: 0.12, y: 0.85, s: 16 }],
  },
  {
    image: require('../../../assets/onboarding/bienestar.png'),
    ratio: 144 / 184,
    detail: 'beat',
    sparks: [{ x: 0.44, y: 0.09, s: 30 }, { x: 0.82, y: 0.86, s: 14 }],
  },
  {
    image: require('../../../assets/onboarding/familia.png'),
    ratio: 146 / 182,
    detail: 'sway',
    sparks: [{ x: 0.47, y: 0.09, s: 28 }, { x: 0.14, y: 0.88, s: 14 }],
  },
];

/** 150° de CSS como vector de LinearGradient (de arriba a la izquierda hacia abajo a la derecha). */
const ANGLE_150 = { start: { x: 0.25, y: 0.067 }, end: { x: 0.75, y: 0.933 } };
const CARD_RADIUS = 36;
const WINDOW_RADIUS = 28;

/** Los cuatro fondos planos apilados; cada uno aparece según cuánto se ha deslizado hacia su página (solo opacidad). */
export function SlideBackgrounds({ x, width }: { x: SharedValue<number>; width: number }) {
  const t = useTheme();
  if (t.hc) return <View style={[StyleSheet.absoluteFill, { backgroundColor: t.c.bg }]} />;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {t.intro.map((slide, i) => (
        <Layer key={i} index={i} x={x} width={width}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: slide.bg }]} />
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

/**
 * Tarjeta de la página `index` (`cardWidth` × `height`) con su ilustración, que flota, se desplaza con paralaje
 * respecto a la página (`width`) y lleva su detalle animado. En alto contraste: superficie lisa con borde de 2 px.
 */
export function Illustration({ index, x, width, cardWidth, height }: { index: number; x: SharedValue<number>; width: number; cardWidth: number; height: number }) {
  const art = SLIDE_ART[index];
  const t = useTheme();
  const slide = t.intro[index];
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

  // La ventana ocupa el 80 % del alto de la tarjeta y conserva la proporción de la PNG.
  const h = height * 0.8;
  const w = Math.min(cardWidth - 32, h * art.ratio);
  const circle = height * 0.76;
  const sparkScale = height / 340;
  const parallax = reduce ? 0 : 0.42;
  const style = useAnimatedStyle(() => {
    const d = x.get() / Math.max(1, width) - index; // −1…1 alrededor de esta página
    const beat = art.detail === 'beat' ? 1 + 0.035 * pulse.get() : 1;
    const sway = art.detail === 'sway' ? (pulse.get() - 0.5) * 3 : 0;
    return {
      opacity: interpolate(Math.abs(d), [0, 0.9], [1, 0.4], Extrapolation.CLAMP),
      transform: [{ translateX: d * width * parallax }, { translateY: -8 * float.get() }, { scale: beat }, { rotate: `${sway}deg` }],
    };
  });

  return (
    <View
      style={[styles.card, { width: cardWidth, height }, t.hc ? [t.hairline, { backgroundColor: t.c.bg }] : !t.dark && { boxShadow: `0px 18px 40px rgba(${slide.glow}, 0.30)` }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.clip}>
        {t.hc ? null : (
          <>
            <LinearGradient colors={slide.card} start={ANGLE_150.start} end={ANGLE_150.end} style={StyleSheet.absoluteFill} />
            <View style={[styles.circle, { width: circle, height: circle, borderRadius: circle / 2, backgroundColor: t.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.32)' }]} />
            {art.sparks.map((sp, i) => {
              const size = sp.s * sparkScale;
              return (
                <Svg key={i} width={size} height={size} viewBox="0 0 24 24" style={[styles.abs, { left: sp.x * cardWidth - size / 2, top: sp.y * height - size / 2 }]}>
                  <Path d={STAR} fill="#FFFFFF" />
                </Svg>
              );
            })}
          </>
        )}
        <Animated.View style={[styles.window, { width: w, height: h, borderColor: t.hc ? t.c.border : t.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)', borderWidth: t.hc ? 2 : 1 }, style]}>
          <Image source={art.image} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
          {art.detail === 'sparkles' ? <Sparkles pulse={pulse} w={w} h={h} /> : null}
          {art.detail === 'ping' ? <Ping pulse={pulse} w={w} h={h} /> : null}
        </Animated.View>
      </View>
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
  card: { borderRadius: CARD_RADIUS },
  clip: { ...StyleSheet.absoluteFill, borderRadius: CARD_RADIUS, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute' },
  window: { borderRadius: WINDOW_RADIUS, overflow: 'hidden' },
  abs: { position: 'absolute' },
  ping: { borderWidth: 3, borderColor: '#FF8A73' },
});
