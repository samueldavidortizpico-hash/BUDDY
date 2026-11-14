/**
 * BUDDY con marco (V5.2): el mismo personaje de `assets/branding/buddy-robot.png`, ahora como vector animado
 * (`./buddy.tsx`): el PNG traía un borde de recorte claro que se veía pegado sobre fondos de color, y no podía
 * parpadear. Aquí solo parpadea (sin flotar ni saludar): vive en lugares pequeños como el botón central y el chat.
 * Nunca va sobre blanco puro: va dentro de un círculo o cuadro con degradado menta claro (azul noche en oscuro).
 * El PNG sigue siendo la fuente del ícono y la carga (app.json).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/provider';

import { Buddy } from './buddy';

export const robotFrame = { light: ['#EFFCF7', '#B9EEE4'] as const, dark: ['#1B3A4E', '#12283A'] as const };

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
      <Buddy size={h} float={false} style={styles.robot} />
    </View>
  );
}

// El vector tiene la antena arriba: bajarlo un poco lo centra a la vista dentro del círculo.
const styles = StyleSheet.create({ frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, robot: { marginTop: '6%' } });
