import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, radius as radii, spacing, type Domain, type GradientName, type StatusKind, type Tone } from '@/theme';
import { useTheme } from '@/theme/provider';

import { PressableScale } from './pressable-scale';

export interface CardProps {
  children: ReactNode;
  /** white = superficie; tint = fondo pálido de un tono; gradient = degradado de dominio; status = estado del Inicio. */
  variant?: 'white' | 'tint' | 'gradient' | 'status';
  /** Para `variant="status"`: menta (todo bien), ámbar suave (atención), coral (acción necesaria) o gris (sin datos). */
  status?: StatusKind;
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
  status = 'none',
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
    backgroundColor: variant === 'status' ? t.status[status].bg : variant === 'tint' ? t.tones[tone].bg : variant === 'white' ? t.c.surface : t.hc ? t.c.bg : 'transparent',
    ...(variant === 'status' ? { borderWidth: t.borderWidth, borderColor: t.status[status].border } : null),
    // V5: la tarjeta de dominio lleva un borde de su propio color (más definición sobre el fondo con tinte).
    ...(variant === 'gradient' && domain && !t.hc ? { borderWidth: 1, borderColor: t.tones[t.domains[domain].tone].soft } : null),
  };
  const body = (
    <>
      {variant === 'gradient' && colors && !t.hc ? (
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      ) : null}
      {children}
    </>
  );
  const styleList = [surface, elevation !== 'none' ? t.shadow[elevation] : null, (bordered || t.hc) && variant !== 'status' ? t.hairline : null, style];
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
