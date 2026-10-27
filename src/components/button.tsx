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

export type ButtonVariant = 'mint' | 'primary' | 'coral' | 'secondary' | 'danger' | 'ghost' | 'tonal' | 'white' | 'text';

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
      // V4: petróleo sólido con texto blanco (≥ 9:1); el degradado se veía apagado y no aportaba.
      return { bg: t.c.primary, text: t.c.onPrimary, shadow: t.shadow.glow.petrol, ...(t.hc ? hcBorder : {}) };
    case 'mint':
      // Turquesa de la primera apertura: texto petróleo oscuro, porque el blanco sobre turquesa claro no llega a 4,5:1.
      return { gradient: t.dark ? ['#3FD0B4', '#5ED9B5'] : ['#35C9C0', '#5ED9B5'], text: '#0D3946', shadow: t.shadow.glow.mint, ...(t.hc ? hcBorder : {}) };
    case 'coral':
      return { gradient: t.gradients.coral, text: t.c.onCoral, shadow: t.shadow.glow.coral, ...(t.hc ? hcBorder : {}) };
    case 'secondary':
      return { bg: t.c.mintPale, border: t.hc ? t.c.text : t.tones.mint.soft, borderWidth: t.borderWidth, text: t.c.text };
    case 'danger':
      return { bg: t.c.dangerPale, border: t.hc ? t.c.danger : t.tones.red.soft, borderWidth: t.borderWidth, text: t.ink.danger };
    case 'ghost':
      // Superficie propia y borde ≥ 3:1: transparente no parecía un botón en el iPhone (V4, error 2).
      return { bg: t.c.surface, border: t.hc ? t.c.text : t.dark ? '#6F9099' : '#7E979E', borderWidth: t.hc ? 2 : 1.5, text: t.c.text, shadow: t.shadow.soft };
    case 'white':
      return t.hc ? { bg: t.c.bg, ...hcBorder, text: t.c.text } : { bg: '#FFFFFF', text: '#0B3A66', shadow: t.shadow.glow.sky };
    case 'tonal':
      return { bg: t.tones[tone].bg, border: t.hc ? t.tones[tone].fg : t.tones[tone].soft, borderWidth: t.borderWidth, text: t.tones[tone].fg };
    case 'text':
      // Acción terciaria: sin caja, texto en el color de acción; conserva el área táctil de 48.
      return { bg: 'transparent', text: t.hc ? t.c.text : t.ink.info };
  }
}

const HEIGHTS = { elder: touch.elder, lg: touch.primary, md: touch.secondary, sm: touch.compact } as const;
/** El compacto mide 44 a la vista; su área táctil llega a 48. */
const COMPACT_SLOP = { top: 2, bottom: 2, left: 0, right: 0 };

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Tono para `variant="tonal"`. */
  tone?: Tone;
  icon?: IconName;
  trailing?: IconName;
  /** Alturas MÍNIMAS: elder = 72 (adulto mayor); lg y md = 56; sm = 44 (compacto: Editar y acciones secundarias). */
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
      hitSlop={size === 'sm' ? COMPACT_SLOP : undefined}
      style={[
        s.base,
        size === 'sm' && s.compact,
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
          {icon ? <Icon name={icon} color={v.text} size={size === 'elder' ? 26 : size === 'sm' ? 20 : 22} /> : null}
          <AppText
            variant={stacked || size === 'sm' ? 'secondaryStrong' : size === 'elder' ? 'h3' : 'button'}
            color={v.text}
            align="center"
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
        <AppText variant="captionStrong" color={v.color} align="center">
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
    grow: { flexShrink: 1, minWidth: 0, textAlign: 'center' },
    compact: { paddingHorizontal: spacing.sm, gap: spacing.xs, alignSelf: 'flex-start' },
    stacked: { flexDirection: 'column', gap: 2, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    disabled: { opacity: 0.45 },
    circle: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center' },
    pill: { minHeight: touch.min, maxWidth: '100%', flexShrink: 0, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
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
