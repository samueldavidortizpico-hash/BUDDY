import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { PillColor } from '@/types/domain';
import { gradients, palette } from '@/theme';

const SIZES = {
  sm: { w: 37, h: 19, border: 0, rotate: '-42deg' },
  md: { w: 42, h: 22, border: 0, rotate: '-42deg' },
  lg: { w: 96, h: 43, border: 4, rotate: '-38deg' },
} as const;

const GRADIENT = { coral: gradients.pillCoral, blue: gradients.pillBlue, yellow: gradients.pillYellow } as const;

/** Cápsula decorativa del Figma: girada, mitad de color y mitad blanca. */
export function PillVisual({ color, size = 'md' }: { color: PillColor; size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <View style={[styles.box, { width: s.w + 6, height: s.w + 6 }]} accessible={false} importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.pill,
          {
            width: s.w,
            height: s.h,
            borderRadius: s.h,
            borderWidth: s.border,
            transform: [{ rotate: s.rotate }],
            boxShadow: size === 'lg' ? '0px 14px 24px rgba(242, 140, 122, 0.3)' : '0px 4px 9px rgba(23, 74, 89, 0.15)',
          },
        ]}
      >
        <LinearGradient colors={GRADIENT[color]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.half, size === 'lg' && styles.halfWarm]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  pill: { overflow: 'hidden', borderColor: 'rgba(255, 255, 255, 0.75)' },
  half: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', backgroundColor: 'rgba(255, 255, 255, 0.78)' },
  halfWarm: { backgroundColor: palette.pillWarm },
});
