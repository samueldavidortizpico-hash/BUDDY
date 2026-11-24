/**
 * BUDDY (V4.2): el robot es SIEMPRE la imagen real de `assets/branding/` (nunca un dibujo en código) y nunca va sobre
 * blanco puro: vive dentro de un círculo o cuadro con degradado menta muy claro → turquesa claro (azul noche en oscuro).
 * Solo aparece donde lo muestra el diseño: ícono, carga, presentación 1, Bienvenido (sobre su halo), botón central de
 * BUDDY y encabezado y mensajes del chat.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/provider';

export const ROBOT_IMAGE = require('../../../assets/branding/buddy-robot.png');
/** Proporción ancho / alto del PNG recortado (792 × 887). */
export const ROBOT_RATIO = 792 / 887;

export const robotFrame = { light: ['#EFFCF7', '#B9EEE4'] as const, dark: ['#28336A', '#151C3A'] as const };

export function BuddyRobot({
  size,
  shape = 'circle',
  accessibilityLabel,
  style,
}: {
  /** Lado del marco en dp; el robot ocupa el 78 % de su alto, con margen para no cortarse nunca. */
  size: number;
  shape?: 'circle' | 'square';
  /** Sin etiqueta es decorativo y se oculta al lector de pantalla. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const h = size * 0.78;
  return (
    <View
      style={[{ width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : size * 0.23 }, styles.frame, t.hc && t.hairline, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'auto' : 'no-hide-descendants'}
    >
      {t.hc ? null : <LinearGradient colors={t.dark ? robotFrame.dark : robotFrame.light} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <Image source={ROBOT_IMAGE} contentFit="contain" style={{ width: h * ROBOT_RATIO, height: h }} accessible={false} />
    </View>
  );
}

const styles = StyleSheet.create({ frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } });
