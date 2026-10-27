import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme';

/**
 * Entrada escalonada: aparece y sube 12 px, con 40 ms entre elementos (`index`, máximo 6) más un retardo base (`delay`).
 * Usa un valor compartido (no `entering`) para que el retardo se respete igual en nativo y en web.
 * Sin efecto si se reduce el movimiento.
 */
export function Appear({ index = 0, delay = 0, children, style }: { index?: number; delay?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(reduceMotion ? 1 : 0);
  const wait = delay + Math.min(index, motion.staggerMax) * motion.stagger;
  useEffect(() => {
    if (reduceMotion) return;
    p.set(withDelay(wait, withTiming(1, { duration: motion.enter, easing: Easing.out(Easing.cubic) })));
  }, [p, wait, reduceMotion]);
  const animated = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
