import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
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

import { radius, spacing, touch, type Theme, type Tone } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

export type ButtonVariant = 'primary' | 'coral' | 'secondary' | 'danger' | 'ghost' | 'tonal' | 'white';

interface VariantStyle {
  gradient?: readonly [string, string, ...string[]];
  bg?: string;
  border?: string;
  borderWidth?: number;
  text: string;
  shadow?: ViewStyle;
}

function variantStyle(t: Theme, variant: ButtonVariant, tone: Tone): VariantStyle {
  const hcBorder = { border: t.c.text, borderWidth: 2 };
  switch (variant) {
    case 'primary':
      return { gradient: t.gradients.primary, text: t.c.onPrimary, shadow: t.shadow.glow.petrol, ...(t.hc ? hcBorder : {}) };
    case 'coral':
      return { gradient: t.gradients.coral, text: t.c.onCoral, shadow: t.shadow.glow.coral, ...(t.hc ? hcBorder : {}) };
    case 'secondary':
      return { bg: t.c.mintPale, border: t.hc ? t.c.text : t.tones.mint.soft, borderWidth: t.borderWidth, text: t.c.text };
    case 'danger':
      return { bg: t.c.dangerPale, border: t.hc ? t.c.danger : t.tones.red.soft, borderWidth: t.borderWidth, text: t.ink.danger };
    case 'ghost':
      return { bg: 'transparent', border: t.hc ? t.c.text : t.dark ? 'rgba(242, 248, 247, 0.32)' : '#A8BDC2', borderWidth: t.hc ? 2 : 1.5, text: t.c.text };
    case 'white':
      return t.hc ? { bg: t.c.bg, ...hcBorder, text: t.c.text } : { bg: '#FFFFFF', text: '#0B3A66', shadow: t.shadow.glow.sky };
    case 'tonal':
      return { bg: t.tones[tone].bg, border: t.hc ? t.tones[tone].fg : t.tones[tone].soft, borderWidth: t.borderWidth, text: t.tones[tone].fg, shadow: t.shadow.glow[tone] };
  }
}

const HEIGHTS = { elder: touch.elder, lg: touch.primary, md: touch.secondary, sm: touch.min } as const;

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Tono para `variant="tonal"`. */
  tone?: Tone;
  icon?: IconName;
  trailing?: IconName;
  /** elder = 72 (adulto mayor); lg = 60 (principal); md = 52 (secundario); sm = 48. */
  size?: keyof typeof HEIGHTS;
  textColor?: string;
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;
  /** Icono arriba y texto debajo (pares de acciones lado a lado). */
  stacked?: boolean;
  /** Brillo que recorre el botón cada 5 s (solo la acción protagonista de la bienvenida). */
  shine?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children?: ReactNode;
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
  stacked = false,
  shine = false,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const t = useTheme();
  const s = useStyles();
  const base = variantStyle(t, variant, tone);
  const v = textColor && !t.hc ? { ...base, text: textColor } : base;
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      disabled={disabled || loading}
      haptic={haptic}
      onPress={onPress}
      style={[
        s.base,
        { minHeight: HEIGHTS[size], backgroundColor: v.bg },
        v.border ? { borderColor: v.border, borderWidth: v.borderWidth } : null,
        !disabled ? v.shadow : null,
        stacked && s.stacked,
        disabled && s.disabled,
        style,
      ]}
    >
      {v.gradient ? <LinearGradient colors={v.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fill} /> : null}
      {shine && !disabled && !t.hc ? <Shine /> : null}
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {icon ? <Icon name={icon} color={v.text} size={size === 'elder' ? 28 : 22} /> : null}
          <AppText
            variant={stacked ? 'secondaryStrong' : size === 'elder' ? 'h3' : 'button'}
            color={v.text}
            align="center"
            numberOfLines={stacked ? 2 : undefined}
            style={s.grow}
          >
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
  const s = useStyles();
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
    <View pointerEvents="none" style={s.shineClip}>
      <Animated.View style={[s.shine, style]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export type IconButtonVariant = 'soft' | 'mint' | 'plain' | 'petrol';

export interface IconButtonProps {
  icon: IconName;
  /** Siempre requerida: se muestra junto al icono y es el nombre accesible. */
  label: string;
  onPress?: () => void;
  variant?: IconButtonVariant;
  /** false solo cuando el significado ya está escrito al lado. */
  showLabel?: boolean;
  disabled?: boolean;
  /** Contador (p. ej. alertas pendientes). */
  badge?: number;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Botón con icono. Por defecto muestra su etiqueta (pastilla); sin etiqueta es un círculo de 48. */
export function IconButton({ icon, label, onPress, variant = 'soft', showLabel = true, disabled, badge, accessibilityHint, style }: IconButtonProps) {
  const t = useTheme();
  const s = useStyles();
  const v = {
    soft: { bg: t.c.surface, color: t.c.text, shadow: t.shadow.soft, border: true },
    mint: { bg: t.hc ? t.c.text : t.c.mintDeep, color: t.hc ? t.c.bg : '#FFFFFF', shadow: t.shadow.glow.mint, border: false },
    plain: { bg: 'transparent', color: t.c.text, shadow: undefined, border: false },
    petrol: { bg: t.c.primary, color: t.c.onPrimary, shadow: t.shadow.glow.petrol, border: false },
  }[variant];
  const a11y = badge ? `${label}, ${badge}` : label;
  return (
    <PressableScale
      accessibilityLabel={a11y}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={[showLabel ? s.pill : s.circle, { backgroundColor: v.bg }, v.shadow, v.border && t.hairline, disabled && s.disabled, style]}
    >
      <Icon name={icon} color={v.color} size={22} />
      {showLabel ? (
        <AppText variant="captionStrong" color={v.color}>
          {label}
        </AppText>
      ) : null}
      {badge ? (
        <View style={s.badge}>
          <AppText variant="meta" color={t.hc ? t.c.bg : '#FFFFFF'} style={s.badgeText}>
            {badge > 9 ? '9+' : badge}
          </AppText>
        </View>
      ) : null}
    </PressableScale>
  );
}

/** Fila de dos botones a partes iguales que pasa a columna si el texto crece. */
export function ButtonRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>;
}

export const buttonStyles = { row: { flexDirection: 'row', gap: spacing.sm } as ViewStyle, half: { flex: 1, flexBasis: 140 } as ViewStyle };

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    // maxWidth + texto que se encoge: en filas que se parten (acciones de tarjetas), una etiqueta larga con texto al
    // 200 % salía de la pantalla ("Ya lo confirmé por teléfono", V3.0); ahora parte la línea dentro del botón.
    base: {
      maxWidth: '100%',
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
    grow: { flexShrink: 1 },
    stacked: { flexDirection: 'column', gap: 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    disabled: { opacity: 0.45 },
    circle: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center' },
    pill: { minHeight: touch.min, borderRadius: radius.pill, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.hc ? t.c.text : '#B9433D', // blanco ≥ 5:1 en claro y oscuro
    },
    badgeText: { fontFamily: 'Manrope_800ExtraBold' },
  }),
);
