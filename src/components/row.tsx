import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/theme';
import { useTextScaleFactor } from '@/theme/provider';

/** Ancho efectivo (px ÷ escala de letra) por debajo del cual la acción baja debajo del texto. */
const STACK_BELOW = 340;

/** ¿La acción va debajo del texto? Con letra grande o pantalla angosta no caben lado a lado sin aplastar el texto. */
export function shouldStackRow(width: number, fontScale: number, appScale: number) {
  return width / (fontScale * appScale) < STACK_BELOW;
}

/**
 * Fila de texto + acción (V4). El texto ocupa el espacio libre (flex 1, minWidth 0) y la acción nunca se encoge, pero
 * tampoco pasa de la mitad del ancho: así el texto nunca queda en una columna de una letra (iOS calcula el flex
 * distinto que la web). Si no cabe, la acción baja debajo del texto a ancho completo.
 */
export function Row({ children, action, icon, style, gap = spacing.sm }: { children: ReactNode; action?: ReactNode; icon?: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  const { width, fontScale } = useWindowDimensions();
  const appScale = useTextScaleFactor();
  const stacked = shouldStackRow(width, fontScale, appScale);
  return (
    <View style={[styles.root, { gap }, stacked && styles.column, style]}>
      <View style={[styles.message, { gap }]}>
        {icon ? <View style={styles.fixed}>{icon}</View> : null}
        <View style={styles.text}>{children}</View>
      </View>
      {action ? <View style={stacked ? styles.full : styles.side}>{action}</View> : null}
    </View>
  );
}

/** Nombre anterior (V3.1). */
export const InlineBanner = Row;

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  column: { flexDirection: 'column', alignItems: 'stretch' },
  message: { flexDirection: 'row', alignItems: 'center', flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  text: { flex: 1, flexShrink: 1, minWidth: 0 },
  fixed: { flexShrink: 0 },
  side: { flexShrink: 0, maxWidth: '50%' },
  full: { alignSelf: 'stretch' },
});
