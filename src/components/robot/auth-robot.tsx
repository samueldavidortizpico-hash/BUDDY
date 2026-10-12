/**
 * Robot de las pantallas de cuenta (bienvenida, login, registro, recuperación). Reemplaza al antiguo RobotStage:
 * vive DENTRO del contenido que se desplaza, así que nunca queda fijo encima de textos ni campos.
 *
 * - Se achica y desvanece con el scroll (escala de `maxHeight` a 72 dp y opacidad 1 → 0), solo transform y opacidad.
 * - Con el teclado abierto reserva menos alto (transición de layout suave).
 * - No mide coordenadas una sola vez: su caja es parte del flujo, así que el layout siempre la ubica bien.
 */
import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Extrapolation, interpolate, LinearTransition, useAnimatedStyle, useReducedMotion, type SharedValue } from 'react-native-reanimated';

import { BuddyRobot, type RobotMood } from './index';

export const AUTH_ROBOT_MIN = 72;
const KEYBOARD_HEIGHT = 96;

export function AuthRobot({
  maxHeight,
  scrollY,
  mood = 'wave',
  look = 0,
  sparkles = false,
  tapFlip = false,
  style,
}: {
  /** Alto de la caja del robot sin teclado (280 en la bienvenida). */
  maxHeight: number;
  scrollY?: SharedValue<number>;
  mood?: RobotMood;
  look?: number;
  sparkles?: boolean;
  tapFlip?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const keyboard = useKeyboardVisible();
  const height = keyboard ? Math.min(maxHeight, KEYBOARD_HEIGHT) : maxHeight;

  const shrink = useAnimatedStyle(() => {
    const y = scrollY ? scrollY.value : 0;
    return {
      opacity: interpolate(y, [0, height * 0.9], [1, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(y, [0, height], [1, AUTH_ROBOT_MIN / height], Extrapolation.CLAMP) }],
    };
  });

  return (
    <Animated.View testID="auth-robot" layout={reduce ? undefined : LinearTransition.duration(220)} style={[styles.box, { height }, style]} pointerEvents="box-none">
      <Animated.View style={[styles.center, shrink]} pointerEvents="box-none">
        <BuddyRobot size={height / 1.18} mood={mood} look={look} sparkles={sparkles && !keyboard} tapFlip={tapFlip} glow />
      </Animated.View>
    </Animated.View>
  );
}

/** Teclado visible (en web no hay eventos de teclado: siempre false). */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** Ánimo del robot según el formulario: mira el campo, se tapa los ojos en contraseñas, se preocupa ante errores. */
export function useFormRobot(initial: RobotMood = 'wave') {
  const [mood, setMood] = useState<RobotMood>(initial);
  return {
    mood,
    focus: (kind: 'text' | 'password' = 'text') => setMood(kind === 'password' ? 'cover' : 'look'),
    blur: () => setMood('idle'),
    error: () => setMood('worry'),
    success: () => setMood('celebrate'),
  };
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
