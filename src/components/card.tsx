import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, palette, radius as radii, shadow, spacing, tones, type GradientName, type Tone } from '@/theme';

import { PressableScale } from './pressable-scale';

export interface CardProps {
  children: ReactNode;
  variant?: 'white' | 'tint' | 'gradient';
  tone?: Tone;
  gradient?: GradientName;
  padding?: number;
  radius?: number;
  elevation?: 'soft' | 'elevated' | 'none';
  bordered?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Superficie base: blanca, con tinte de un tono o con degradado. Si recibe onPress es un botón. */
export function Card({
  children,
  variant = 'white',
  tone = 'mint',
  gradient,
  padding = spacing.md,
  radius = radii.card,
  elevation = variant === 'white' ? 'soft' : 'none',
  bordered = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  haptic,
  style,
}: CardProps) {
  const surface: ViewStyle = {
    borderRadius: radius,
    padding,
    backgroundColor: variant === 'tint' ? tones[tone].bg : variant === 'white' ? palette.white : 'transparent',
  };
  const body = (
    <>
      {variant === 'gradient' && gradient ? (
        <LinearGradient
          colors={gradients[gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      ) : null}
      {children}
    </>
  );
  const styleList = [
    surface,
    elevation !== 'none' ? shadow[elevation] : null,
    bordered ? styles.border : null,
    style,
  ];
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        haptic={haptic}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={styleList}
      >
        {body}
      </PressableScale>
    );
  }
  return (
    <View style={styleList} accessibilityLabel={accessibilityLabel}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  border: { borderWidth: 1, borderColor: palette.line },
});
