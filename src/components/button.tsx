import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { gradients, ink, palette, radius, shadow, spacing, tones, touch, type Tone } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

export type ButtonVariant = 'primary' | 'coral' | 'secondary' | 'danger' | 'ghost' | 'tonal' | 'white';

type VariantStyle = { gradient?: readonly [string, string, ...string[]]; bg?: string; border?: string; borderWidth?: number; text: string; shadow?: ViewStyle };

const VARIANTS: Record<Exclude<ButtonVariant, 'tonal'>, VariantStyle> = {
  primary: { gradient: gradients.primary, text: ink.inverse, shadow: shadow.petrol },
  coral: { gradient: gradients.coral, text: ink.onCoral, shadow: shadow.coral },
  secondary: { bg: palette.mintPale, border: palette.mintBorder, borderWidth: 1, text: ink.text },
  danger: { bg: palette.coralPale, border: palette.coralBorder, borderWidth: 1, text: ink.coral },
  ghost: { bg: 'transparent', border: palette.ghostBorder, borderWidth: 1.5, text: ink.text },
  /** Sobre degradados de dominio (agua): blanco con texto del dominio. */
  white: { bg: '#FFFFFF', text: '#0B3A66', shadow: shadow.sky },
};

const GLOW: Partial<Record<Tone, ViewStyle>> = { mint: shadow.mint, coral: shadow.coral, sky: shadow.sky, lavender: shadow.lavender };

/** Tonal por dominio: fondo pálido del tono, borde y texto del tono, con brillo de su color. */
const tonal = (tone: Tone): VariantStyle => ({ bg: tones[tone].bg, border: tones[tone].soft, borderWidth: 1, text: tones[tone].fg, shadow: GLOW[tone] });

const HEIGHTS = { elder: touch.elder, lg: touch.primary, md: touch.secondary } as const;

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Tono para `variant="tonal"`. */
  tone?: Tone;
  icon?: IconName;
  trailing?: IconName;
  /** elder = 72 (acciones del adulto mayor); lg = 60 (principal); md = 52 (secundario). */
  size?: keyof typeof HEIGHTS;
  /** Color de texto propio (p. ej. azul profundo del agua sobre el botón blanco). */
  textColor?: string;
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;
  /** Icono arriba y texto debajo (pares de acciones lado a lado con texto largo). */
  stacked?: boolean;
  /** Brillo que recorre el botón cada 5 s (solo la acción protagonista de la bienvenida). */
  shine?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  tone = 'mint',
  icon,
  trailing,
  size = 'lg',
  textColor,
  disabled = false,
  loading = false,
  haptic = false,
  shine = false,
  stacked = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const base = variant === 'tonal' ? tonal(tone) : VARIANTS[variant];
  const v = textColor ? { ...base, text: textColor } : base;
  const spread = variant === 'danger' && !!trailing;
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading }}
      disabled={disabled || loading}
      haptic={haptic}
      onPress={onPress}
      style={[
        styles.base,
        { minHeight: HEIGHTS[size], backgroundColor: v.bg },
        v.border ? { borderColor: v.border, borderWidth: v.borderWidth } : null,
        !disabled ? v.shadow : null,
        stacked && styles.stacked,
        disabled && styles.disabled,
        style,
      ]}
    >
      {v.gradient ? (
        <LinearGradient colors={v.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
      ) : null}
      {shine && !disabled ? <Shine /> : null}
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {icon ? <Icon name={icon} color={v.text} size={size === 'elder' ? 28 : 22} /> : null}
          <AppText variant={stacked ? 'secondaryStrong' : size === 'elder' ? 'h3' : 'button'} color={v.text} numberOfLines={stacked ? 2 : undefined} align={spread ? 'left' : 'center'} style={spread ? styles.grow : undefined}>
            {label}
          </AppText>
          {trailing ? <Icon name={trailing} color={v.text} size={20} /> : null}
        </>
      )}
    </PressableScale>
  );
}

/** Franja de luz diagonal que cruza el botón (solo transform). */
function Shine() {
  const reduce = useReducedMotion();
  const x = useSharedValue(-1);
  useEffect(() => {
    if (reduce) return;
    x.set(withRepeat(withSequence(withDelay(4100, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })), withTiming(-1, { duration: 0 })), -1));
    return () => cancelAnimation(x);
  }, [reduce, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: `${x.value * 120}%` }, { skewX: '-20deg' }] }));
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={styles.shineClip}>
      <Animated.View style={[styles.shine, style]}>
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

export type IconButtonVariant = 'soft' | 'mint' | 'plain' | 'petrol';

const ICON_VARIANTS: Record<IconButtonVariant, { bg: string; color: string; shadow?: ViewStyle }> = {
  soft: { bg: palette.white, color: ink.text, shadow: shadow.soft },
  mint: { bg: palette.mintDeep, color: ink.inverse, shadow: shadow.mint },
  plain: { bg: 'transparent', color: ink.text },
  petrol: { bg: palette.petrol, color: ink.inverse, shadow: shadow.petrol },
};

export interface IconButtonProps {
  icon: IconName;
  /** Siempre requerida: se muestra junto al icono y es el nombre accesible. */
  label: string;
  onPress?: () => void;
  variant?: IconButtonVariant;
  /** false solo cuando el significado ya está escrito al lado (p. ej. "+" dentro de una tarjeta rotulada). */
  showLabel?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Botón con icono. Por defecto muestra su etiqueta (pastilla); sin etiqueta es un círculo de 48. */
export function IconButton({
  icon,
  label,
  onPress,
  variant = 'soft',
  showLabel = true,
  disabled,
  accessibilityHint,
  style,
}: IconButtonProps) {
  const v = ICON_VARIANTS[variant];
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[
        showLabel ? styles.pill : styles.circle,
        { backgroundColor: v.bg },
        v.shadow,
        variant === 'plain' && showLabel ? styles.plainPill : null,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} color={v.color} size={22} />
      {showLabel ? (
        <AppText variant="captionStrong" color={v.color}>
          {label}
        </AppText>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fill: { ...StyleSheet.absoluteFill, borderRadius: radius.button },
  shineClip: { ...StyleSheet.absoluteFill, borderRadius: radius.button, overflow: 'hidden' },
  shine: { position: 'absolute', top: 0, bottom: 0, left: '35%', width: '28%' },
  grow: { flex: 1 },
  stacked: { flexDirection: 'column', gap: 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  disabled: { opacity: 0.45 },
  circle: {
    width: touch.min,
    height: touch.min,
    borderRadius: touch.min / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    minHeight: touch.min,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  plainPill: { paddingHorizontal: spacing.xs },
});

export const buttonStyles = { row: { flexDirection: 'row', gap: spacing.sm } as ViewStyle, half: { flex: 1 } as ViewStyle };

/** Fila de dos botones a partes iguales que pasa a columna si el texto crece. */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>;
}
