/**
 * BuddyRobotVector: el robot dibujado en vectores y por capas, nítido a cualquier tamaño.
 * Capas animables: cabeza (inclinación), ojos (parpadeo, mirada, expresión), brazo izquierdo, brazo derecho
 * (saludo), manos que tapan los ojos (contraseña), boca (hablar) y brillo del corazón.
 * Proporciones y colores tomados de assets/images/splash-icon.png (referencia de marca).
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
import Svg, { Defs, Ellipse, G, LinearGradient, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { motion } from '@/theme';

export type RobotMood = 'idle' | 'wave' | 'think' | 'talk' | 'celebrate' | 'worry' | 'look' | 'cover' | 'sleep';

/** Marco de dibujo: x 110–930, y 40–980. */
const VB = { x: 110, y: 30, w: 820, h: 920 };
export const VECTOR_RATIO = VB.w / VB.h;
const VIEWBOX = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
/** Punto del dibujo → origen relativo a la caja, con Z numérico explícito.
 * El arreglo evita el parser de cadenas de RN, que separa los porcentajes decimales.
 */
const pct = (x: number, y: number): [`${number}%`, `${number}%`, number] => [
  `${((x - VB.x) / VB.w) * 100}%`,
  `${((y - VB.y) / VB.h) * 100}%`,
  0,
];

const PIVOT = {
  head: pct(500, 620),
  eyes: pct(490, 410),
  leftArm: pct(372, 682),
  rightArm: pct(682, 678),
  mouth: pct(490, 492),
  heart: pct(586, 716),
};

/** Corazón del pecho relativo a la caja (para el brillo y efectos externos). */
export const VECTOR_HEART = { x: (586 - VB.x) / VB.w, y: (720 - VB.y) / VB.h };

const HEAD_TILT = 'rotate(-10 490 405)';

function Defs_() {
  return (
    <Defs>
      <RadialGradient id="shell" cx="40%" cy="30%" r="75%">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="0.55" stopColor="#F4F6F5" />
        <Stop offset="0.85" stopColor="#DDE3E2" />
        <Stop offset="1" stopColor="#C7D0CF" />
      </RadialGradient>
      <LinearGradient id="mint" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#8BEAD0" />
        <Stop offset="0.55" stopColor="#4FCFAC" />
        <Stop offset="1" stopColor="#25A98B" />
      </LinearGradient>
      <LinearGradient id="screen" x1="0.2" y1="0" x2="0.6" y2="1">
        <Stop offset="0" stopColor="#1F6372" />
        <Stop offset="0.5" stopColor="#0D3946" />
        <Stop offset="1" stopColor="#072630" />
      </LinearGradient>
      <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#E9EEED" />
        <Stop offset="1" stopColor="#C9D2D1" />
      </LinearGradient>
      <RadialGradient id="heartGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#FFB3A6" stopOpacity="0.95" />
        <Stop offset="0.5" stopColor="#F28C7A" stopOpacity="0.45" />
        <Stop offset="1" stopColor="#F28C7A" stopOpacity="0" />
      </RadialGradient>
    </Defs>
  );
}

const HEART = 'M600 785 C 560 755 546 735 546 711 C 546 691 562 678 579 678 C 590 678 597 685 600 694 C 603 685 610 678 621 678 C 638 678 654 691 654 711 C 654 735 640 755 600 785 Z';
const BODY = 'M505 612 C 642 612 704 690 700 786 C 696 874 626 930 505 930 C 384 930 316 874 312 786 C 308 690 368 612 505 612 Z';

/** Ojos por expresión (en el marco de la cabeza, antes de inclinarla). */
function Eyes({ mood }: { mood: RobotMood }) {
  const stroke = { stroke: '#FFFFFF', strokeWidth: 28, strokeLinecap: 'round' as const, fill: 'none' };
  if (mood === 'worry') {
    return (
      <G transform={HEAD_TILT}>
        <Ellipse cx="398" cy="420" rx="26" ry="30" fill="#FFFFFF" />
        <Ellipse cx="584" cy="420" rx="26" ry="30" fill="#FFFFFF" />
        <Line x1="350" y1="362" x2="430" y2="340" {...stroke} strokeWidth={18} />
        <Line x1="632" y1="362" x2="552" y2="340" {...stroke} strokeWidth={18} />
      </G>
    );
  }
  if (mood === 'think') {
    return (
      <G transform={HEAD_TILT}>
        <Path d="M355 420 Q400 368 445 420" {...stroke} />
        <Line x1="545" y1="405" x2="630" y2="405" {...stroke} />
      </G>
    );
  }
  if (mood === 'look' || mood === 'talk') {
    return (
      <G transform={HEAD_TILT}>
        <Rect x="370" y="360" width="56" height="86" rx="28" fill="#FFFFFF" />
        <Rect x="560" y="360" width="56" height="86" rx="28" fill="#FFFFFF" />
        <Ellipse cx="388" cy="380" rx="10" ry="12" fill="#BDEFE2" />
        <Ellipse cx="578" cy="380" rx="10" ry="12" fill="#BDEFE2" />
      </G>
    );
  }
  if (mood === 'sleep') {
    return (
      <G transform={HEAD_TILT}>
        <Path d="M345 410 Q395 450 445 410" {...stroke} />
        <Path d="M535 410 Q585 450 635 410" {...stroke} />
      </G>
    );
  }
  // idle, wave, celebrate, cover: ojos felices en arco, como en la marca
  return (
    <G transform={HEAD_TILT}>
      <Path d="M340 432 Q395 352 450 432" {...stroke} />
      <Path d="M530 432 Q585 352 640 432" {...stroke} />
    </G>
  );
}

interface Props {
  /** Alto en dp. */
  size: number;
  mood?: RobotMood;
  /** −1 (izquierda) … 1 (derecha): hacia dónde mira. */
  look?: number;
  /** Animaciones propias (parpadeo, brazos, boca). Apagado en copias estáticas. */
  animated?: boolean;
}

function loop(v: SharedValue<number>, from: number, to: number, ms: number, delay = 0) {
  v.set(from);
  v.set(
    withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(to, { duration: ms / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(from, { duration: ms / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    ),
  );
}

export function BuddyRobotVector({ size, mood = 'idle', look = 0, animated = true }: Props) {
  const reduce = useReducedMotion();
  const live = animated && !reduce;
  const blink = useSharedValue(1);
  const leftArm = useSharedValue(0);
  const rightArm = useSharedValue(0);
  const head = useSharedValue(0);
  const mouth = useSharedValue(0);
  const cover = useSharedValue(mood === 'cover' ? 1 : 0);
  const eyesX = useSharedValue(look);
  const heart = useSharedValue(0);

  // Parpadeo cada 3–5 s (no con los ojos tapados ni dormido).
  useEffect(() => {
    if (!live || mood === 'cover' || mood === 'sleep') {
      cancelAnimation(blink);
      blink.set(1);
      return;
    }
    const close = withSequence(withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 110 }));
    blink.set(withRepeat(withSequence(withDelay(3000 + Math.round(Math.random() * 2000), close)), -1));
    return () => cancelAnimation(blink);
  }, [live, mood, blink]);

  // Brazos, cabeza y boca según el estado.
  useEffect(() => {
    [leftArm, rightArm, head, mouth].forEach((v) => cancelAnimation(v));
    cover.set(live ? withSpring(mood === 'cover' ? 1 : 0, motion.spring) : mood === 'cover' ? 1 : 0);
    if (!live) {
      leftArm.set(mood === 'celebrate' ? 100 : 0);
      rightArm.set(0);
      head.set(mood === 'think' ? -6 : mood === 'worry' ? 5 : 0);
      mouth.set(0);
      return;
    }
    switch (mood) {
      case 'wave':
        rightArm.set(withRepeat(withSequence(withTiming(-22, { duration: 180 }), withTiming(12, { duration: 220 })), 4, true));
        loop(head, -2, 2, 1600);
        break;
      case 'celebrate':
        leftArm.set(withSpring(100, motion.springSoft));
        loop(rightArm, -18, 10, 500);
        loop(head, -4, 4, 700);
        break;
      case 'think':
        head.set(withTiming(-6, { duration: 500 }));
        loop(leftArm, -4, 4, 2400);
        break;
      case 'worry':
        head.set(withTiming(5, { duration: 700 }));
        leftArm.set(withTiming(-12, { duration: 700 }));
        rightArm.set(withTiming(14, { duration: 700 }));
        break;
      case 'talk':
        loop(mouth, 0.2, 1, 360);
        loop(rightArm, -6, 6, 1400);
        break;
      case 'sleep':
        head.set(withTiming(8, { duration: 900 }));
        break;
      default:
        loop(rightArm, -6, 8, 3000);
        loop(leftArm, -3, 3, 3600, 400);
    }
    return () => [leftArm, rightArm, head, mouth].forEach((v) => cancelAnimation(v));
  }, [live, mood, leftArm, rightArm, head, mouth, cover]);

  useEffect(() => {
    eyesX.set(live ? withSpring(look, motion.spring) : look);
  }, [look, live, eyesX]);

  useEffect(() => {
    if (!animated || reduce) {
      cancelAnimation(heart);
      heart.set(reduce ? 0.35 : 0);
      return;
    }
    loop(heart, 0, 1, 1600);
    return () => cancelAnimation(heart);
  }, [animated, reduce, heart]);

  const w = size * VECTOR_RATIO;
  const unit = size / VB.h; // dp por unidad del dibujo

  const headStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${head.value + eyesX.value * 4}deg` }] }));
  const eyesStyle = useAnimatedStyle(() => ({
    opacity: 1 - cover.value,
    transform: [{ translateX: eyesX.value * 26 * unit }, { scaleY: blink.value }],
  }));
  const leftStyle = useAnimatedStyle(() => ({ opacity: 1 - cover.value * 0.9, transform: [{ rotate: `${leftArm.value}deg` }] }));
  const rightStyle = useAnimatedStyle(() => ({ opacity: 1 - cover.value * 0.9, transform: [{ rotate: `${rightArm.value}deg` }] }));
  const coverStyle = useAnimatedStyle(() => ({
    opacity: cover.value,
    transform: [{ translateY: (1 - cover.value) * 260 * unit }],
  }));
  const mouthStyle = useAnimatedStyle(() => ({ opacity: mouth.value > 0 ? 1 : 0, transform: [{ scaleY: mouth.value }] }));
  const heartStyle = useAnimatedStyle(() => ({
    opacity: interpolate(heart.value, [0, 1], [0.55, 1]),
    transform: [{ scale: interpolate(heart.value, [0, 1], [1, 1.15]) }],
  }));

  const layer = [StyleSheet.absoluteFill, { width: w, height: size }];
  const svg = (children: React.ReactNode, defs = false) => (
    <Svg width={w} height={size} viewBox={VIEWBOX}>
      {defs ? <Defs_ /> : null}
      {children}
    </Svg>
  );

  return (
    <View style={{ width: w, height: size }} pointerEvents="none">
      {/* Brazo derecho (saluda) detrás de la cabeza */}
      <Animated.View style={[layer, { transformOrigin: PIVOT.rightArm }, rightStyle]}>
        {svg(
          <>
            <Line x1="676" y1="680" x2="792" y2="596" stroke="url(#shell)" strokeWidth="76" strokeLinecap="round" />
            <Ellipse cx="826" cy="548" rx="64" ry="90" transform="rotate(28 826 548)" fill="url(#mint)" />
          </>,
          true,
        )}
      </Animated.View>

      {/* Cuerpo, cuello y corazón */}
      <View style={layer}>
        {svg(
          <>
            <Ellipse cx="503" cy="640" rx="104" ry="34" fill="#25A98B" />
            <Path d={BODY} fill="url(#shell)" />
            <Path d={HEART} fill="#F28C7A" transform="translate(-14 -16)" />
          </>,
          true,
        )}
      </View>
      <Animated.View style={[layer, { transformOrigin: PIVOT.heart }, heartStyle]}>
        {svg(<Ellipse cx="586" cy="716" rx="88" ry="88" fill="url(#heartGlow)" />, true)}
      </Animated.View>

      {/* Cabeza con antena, orejas, pantalla, ojos y boca */}
      <Animated.View style={[layer, { transformOrigin: PIVOT.head }, headStyle]}>
        {svg(
          <G transform={HEAD_TILT}>
            <Ellipse cx="818" cy="405" rx="34" ry="78" fill="url(#mint)" />
            <Path d="M430 200 C 462 130 560 104 604 128 L 622 194 Z" fill="url(#shell)" />
            <Ellipse cx="612" cy="104" rx="80" ry="44" fill="url(#mint)" />
            <Ellipse cx="590" cy="88" rx="34" ry="12" fill="#FFFFFF" opacity="0.35" />
            <Rect x="150" y="170" width="680" height="470" rx="228" fill="url(#shell)" />
            <Ellipse cx="158" cy="420" rx="48" ry="96" fill="url(#mint)" />
            <Ellipse cx="146" cy="392" rx="12" ry="30" fill="#FFFFFF" opacity="0.3" />
            <Rect x="222" y="214" width="536" height="382" rx="186" fill="url(#rim)" />
            <Rect x="240" y="230" width="500" height="350" rx="172" fill="url(#screen)" />
            <Ellipse cx="420" cy="282" rx="150" ry="38" fill="#FFFFFF" opacity="0.08" />
          </G>,
          true,
        )}
        <Animated.View style={[layer, { transformOrigin: PIVOT.eyes }, eyesStyle]}>{svg(<Eyes mood={mood} />)}</Animated.View>
        <Animated.View style={[layer, { transformOrigin: PIVOT.mouth }, mouthStyle]}>
          {svg(
            <G transform={HEAD_TILT}>
              <Ellipse cx="490" cy="500" rx="34" ry="22" fill="#FFFFFF" />
            </G>,
          )}
        </Animated.View>
      </Animated.View>

      {/* Brazo izquierdo, delante del cuerpo */}
      <Animated.View style={[layer, { transformOrigin: PIVOT.leftArm }, leftStyle]}>
        {svg(<Ellipse cx="334" cy="752" rx="64" ry="106" transform="rotate(26 334 752)" fill="url(#mint)" />, true)}
      </Animated.View>

      {/* Manos que tapan los ojos (al escribir la contraseña) */}
      <Animated.View style={[layer, coverStyle]}>
        {svg(
          <G transform={HEAD_TILT}>
            <Ellipse cx="395" cy="410" rx="92" ry="76" fill="url(#mint)" />
            <Ellipse cx="585" cy="410" rx="92" ry="76" fill="url(#mint)" />
          </G>,
          true,
        )}
      </Animated.View>
    </View>
  );
}
