import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/theme';
import { useTextScaleFactor } from '@/theme/provider';

/** Separate the action before a native row can squeeze its text into a vertical strip. */
export function shouldStackRow(width: number, fontScale: number, appScale: number) {
  return width < 390 || fontScale * appScale > 1.15;
}

export function InlineBanner({ children, action, icon, style }: { children: ReactNode; action?: ReactNode; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { width, fontScale } = useWindowDimensions();
  const appScale = useTextScaleFactor();
  const stacked = shouldStackRow(width, fontScale, appScale);
  return (
    <View style={[styles.root, stacked && styles.column, style]}>
      <View style={styles.message}>
        {icon ? <View style={styles.fixed}>{icon}</View> : null}
        <View style={styles.text}>{children}</View>
      </View>
      {action ? <View style={[styles.fixed, stacked && styles.full]}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  column: { flexDirection: 'column', alignItems: 'stretch' },
  message: { flexDirection: 'row', alignItems: 'center', flex: 1, flexShrink: 1, minWidth: 0, gap: spacing.sm },
  text: { flex: 1, flexShrink: 1, minWidth: 0 },
  fixed: { flexShrink: 0 },
  full: { width: '100%' },
});
