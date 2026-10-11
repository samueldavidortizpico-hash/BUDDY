import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion } from '@/theme';
import { tapHaptic } from '@/utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Vibración suave al tocar (selecciones). */
  haptic?: boolean;
  scaleTo?: number;
}

/** Base de todo lo pulsable: escala con resorte en el hilo de UI (solo transform). */
export function PressableScale({
  style,
  haptic = false,
  scaleTo = motion.pressScale,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  accessibilityRole = 'button',
  accessibilityState,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduceMotion) scale.set(withSpring(scaleTo, motion.spring));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, motion.spring));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tapHaptic();
        onPress?.(e);
      }}
      style={[style, animated]}
    />
  );
}
