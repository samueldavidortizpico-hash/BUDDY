import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useReducedMotion, withDelay, withTiming, Easing } from 'react-native-reanimated';

import { motion } from '@/theme';

/** Entrada escalonada: aparece y sube 12 px, con 60 ms entre elementos. Sin efecto si se reduce el movimiento. */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const delay = index * motion.stagger;
  const entering = () => {
    'worklet';
    const config = { duration: motion.enter, easing: Easing.out(Easing.cubic) };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 12 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, config)),
        transform: [{ translateY: withDelay(delay, withTiming(0, config)) }],
      },
    };
  };
  return (
    <Animated.View entering={reduceMotion ? undefined : entering} style={style}>
      {children}
    </Animated.View>
  );
}
