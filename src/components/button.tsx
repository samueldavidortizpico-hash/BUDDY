import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gradients, ink, palette, radius, shadow, spacing, touch } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

export type ButtonVariant = 'primary' | 'coral' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<
  ButtonVariant,
  { gradient?: readonly [string, string]; bg?: string; border?: string; borderWidth?: number; text: string; shadow?: ViewStyle }
> = {
  primary: { gradient: gradients.primary, text: ink.inverse, shadow: shadow.petrol },
  coral: { gradient: gradients.coral, text: ink.inverse, shadow: shadow.coral },
  secondary: { bg: palette.mintPale, border: palette.mintBorder, borderWidth: 1, text: ink.text },
  danger: { bg: palette.coralPale, border: palette.coralBorder, borderWidth: 1, text: ink.coral },
  ghost: { bg: 'transparent', border: palette.ghostBorder, borderWidth: 1.5, text: ink.text },
};

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  trailing?: IconName;
  /** lg = 56 (acción principal); md = 48 (acciones secundarias en fila). */
  size?: 'lg' | 'md';
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  trailing,
  size = 'lg',
  disabled = false,
  loading = false,
  haptic = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const v = VARIANTS[variant];
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
        { minHeight: size === 'lg' ? touch.primary : touch.min, backgroundColor: v.bg },
        v.border ? { borderColor: v.border, borderWidth: v.borderWidth } : null,
        !disabled ? v.shadow : null,
        disabled && styles.disabled,
        style,
      ]}
    >
      {v.gradient ? (
        <LinearGradient colors={v.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {icon ? <Icon name={icon} color={v.text} size={22} /> : null}
          <AppText variant="button" color={v.text} align={spread ? 'left' : 'center'} style={spread ? styles.grow : undefined}>
            {label}
          </AppText>
          {trailing ? <Icon name={trailing} color={v.text} size={20} /> : null}
        </>
      )}
    </PressableScale>
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
  grow: { flex: 1 },
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
