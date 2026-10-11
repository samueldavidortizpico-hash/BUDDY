import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, radius as radii, spacing, type Domain, type GradientName, type Tone } from '@/theme';
import { useTheme } from '@/theme/provider';

import { PressableScale } from './pressable-scale';

export interface CardProps {
  children: ReactNode;
  /** white = superficie; tint = fondo pálido de un tono; gradient = degradado de dominio (o legado por nombre). */
  variant?: 'white' | 'tint' | 'gradient';
  tone?: Tone;
  domain?: Domain;
  /** Solo para pantallas antiguas: degradado por nombre. */
  gradient?: GradientName;
  padding?: number;
  radius?: number;
  elevation?: 'soft' | 'elevated' | 'hero' | 'none';
  bordered?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Superficie base: blanca, con tinte de un tono o con degradado de dominio. Si recibe onPress es un botón. */
export function Card({
  children,
  variant = 'white',
  tone = 'mint',
  domain,
  gradient,
  padding = spacing.lg,
  radius = radii.card,
  elevation = variant === 'white' ? 'soft' : 'none',
  bordered = variant !== 'gradient',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  haptic,
  style,
}: CardProps) {
  const t = useTheme();
  const colors = domain ? t.domains[domain].gradient : gradient ? gradients[gradient] : null;
  const surface: ViewStyle = {
    borderRadius: radius,
    padding,
    backgroundColor: variant === 'tint' ? t.tones[tone].bg : variant === 'white' ? t.c.surface : t.hc ? t.c.bg : 'transparent',
  };
  const body = (
    <>
      {variant === 'gradient' && colors && !t.hc ? (
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      ) : null}
      {children}
    </>
  );
  const styleList = [surface, elevation !== 'none' ? t.shadow[elevation] : null, bordered || t.hc ? t.hairline : null, style];
  if (onPress) {
    return (
      <PressableScale onPress={onPress} haptic={haptic} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint} style={styleList}>
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
