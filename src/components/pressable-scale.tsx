import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme';
import { lightHaptic, tapHaptic } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Vibración al tocar: `true` = selección (opciones), `'light'` = golpe ligero (acciones principales). */
  haptic?: boolean | 'light';
  /** 0.97 botones (por defecto), 0.98 tarjetas y filas. */
  scaleTo?: number;
  /** Oscurece al presionar (0.08 en botones llenos, 0.04 en filas). El contenedor debe recortar (`overflow: hidden`). */
  dim?: number;
}

/**
 * Base de todo lo pulsable (V4.3): reacciona en el mismo cuadro del toque con escala y resorte 15/300 en el hilo de UI,
 * oscurecido opcional y vuelta suave al soltar. Solo transform y opacidad. Con "reducir movimiento" no escala.
 */
export function PressableScale({
  style,
  children,
  haptic = false,
  scaleTo = motion.pressScale,
  dim = 0,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  accessibilityRole = 'button',
  accessibilityState,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: reduceMotion ? 1 : 1 - (1 - scaleTo) * p.value }] }));
  const shade = useAnimatedStyle(() => ({ opacity: dim * p.value }));

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      disabled={disabled}
      onPressIn={(e) => {
        p.set(reduceMotion ? withTiming(1, { duration: 60 }) : withSpring(1, motion.spring));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        p.set(withSpring(0, motion.spring));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic === 'light') lightHaptic();
        else if (haptic) tapHaptic();
        onPress?.(e);
      }}
      style={[style, animated]}
    >
      {children}
      {dim ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, shade]} /> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({ shade: { backgroundColor: '#000000' } });
