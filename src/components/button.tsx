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
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing, touch, type Theme, type Tone } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

export type ButtonVariant = 'mint' | 'primary' | 'solid' | 'coral' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'tonal' | 'white' | 'text';

interface VariantStyle {
  gradient?: readonly [string, string, ...string[]];
  bg?: string;
  border?: string;
  borderWidth?: number;
  text: string;
  shadow?: ViewStyle;
  /** Oscurecido al presionar (8 % en los llenos). */
  dim: number;
}

/** Brillo de color bajo las acciones llenas (V4.4): el botón principal se lee como LA acción de la pantalla. */
function glow(t: Theme, rgb: string): ViewStyle | undefined {
  if (t.hc) return undefined;
  return { boxShadow: `0px 2px 4px rgba(${rgb}, ${t.dark ? 0.2 : 0.18}), 0px 10px 24px rgba(${rgb}, ${t.dark ? 0.28 : 0.32})` };
}

const GLOW: Record<Tone, string> = { mint: '60, 203, 160', coral: '255, 133, 113', lavender: '156, 140, 248', sky: '95, 176, 247', yellow: '244, 190, 60', red: '242, 124, 124', petrol: '60, 203, 160', slate: '100, 116, 139' };

function variantStyle(t: Theme, variant: ButtonVariant, tone: Tone): VariantStyle {
  const hcBorder = { border: t.c.text, borderWidth: 2 };
  const brand = t.dark ? t.c.accent : t.c.primary;
  switch (variant) {
    case 'primary':
    case 'mint':
      // V4.4: una sola acción de marca. Claro: turquesa → petróleo con blanco (4,75 y 6,8:1). Oscuro: turquesa → cian
      // con texto petróleo casi negro (≥ 6:1). 'mint' queda como alias para no tocar cada pantalla.
      return { gradient: t.gradients.primary, text: t.c.onPrimary, shadow: glow(t, t.dark ? '43, 196, 180' : '11, 95, 115'), dim: 0.08, ...(t.hc ? hcBorder : {}) };
    case 'solid':
      // V5: acción llena con el color luminoso de su dominio (agua azul, medicamentos coral, sueño lavanda…) y texto
      // petróleo ≥ 4,5:1. Para que no todos los botones sean del mismo turquesa.
      return { gradient: t.bright[tone], text: t.onBright, shadow: glow(t, GLOW[tone]), dim: 0.06, ...(t.hc ? hcBorder : {}) };
    case 'coral':
      return { gradient: t.gradients.coral, text: t.c.onCoral, shadow: glow(t, '255, 119, 107'), dim: 0.08, ...(t.hc ? hcBorder : {}) };
    case 'secondary':
      // Menta pálida con texto de marca (4,6:1 en claro): con color, sin competir con la principal.
      return { bg: t.c.mintPale, text: t.hc ? t.c.text : t.dark ? t.c.text : t.ink.info, dim: 0.05, ...(t.hc ? hcBorder : {}) };
    case 'outline':
      return { bg: 'transparent', border: t.hc ? t.c.text : brand, borderWidth: t.hc ? 2 : 1.5, text: t.hc ? t.c.text : brand, dim: 0.04 };
    case 'danger':
      return { bg: t.c.dangerPale, text: t.ink.danger, dim: 0.05, ...(t.hc ? { border: t.c.danger, borderWidth: 2 } : {}) };
    case 'ghost':
      // Superficie propia y borde de marca ≥ 3:1: transparente no parecía un botón en el iPhone (V4, error 2).
      return { bg: t.c.surface, border: t.hc ? t.c.text : t.dark ? 'rgba(43, 196, 180, 0.55)' : t.ink.info, borderWidth: t.hc ? 2 : 1.5, text: t.hc ? t.c.text : t.dark ? t.c.text : t.ink.info, dim: 0.04 };
    case 'white':
      return t.hc ? { bg: t.c.bg, ...hcBorder, text: t.c.text, dim: 0.05 } : { bg: '#FFFFFF', text: '#0D3946', shadow: t.shadow.soft, dim: 0.05 };
    case 'tonal':
      return { bg: t.tones[tone].bg, text: t.tones[tone].fg, dim: 0.05, ...(t.hc ? { border: t.tones[tone].fg, borderWidth: 2 } : {}) };
    case 'text':
      // Acción terciaria: sin caja, texto en el color de acción; conserva el área táctil de 48.
      return { bg: 'transparent', text: t.hc ? t.c.text : t.ink.info, dim: 0 };
  }
}

const HEIGHTS = { elder: touch.elder, lg: touch.primary, md: touch.secondary, sm: touch.compact } as const;
/** El compacto mide 40 a la vista; su área táctil llega a 48. */
const COMPACT_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Tono para `variant="tonal"`. */
  tone?: Tone;
  icon?: IconName;
  trailing?: IconName;
  /** Alturas MÍNIMAS: elder = 72 (adulto mayor); lg y md = 56; sm = 40 (compacto, radio 12: Editar y similares). */
  size?: keyof typeof HEIGHTS;
  textColor?: string;
  disabled?: boolean;
  /** Spinner en lugar del texto, sin cambiar el ancho. */
  loading?: boolean;
  /** Check breve (la pantalla navega ~600 ms después). */
  success?: boolean;
  /** Vibración: `true` selección, `'light'` acción principal (por defecto en `primary`). */
  haptic?: boolean | 'light';
  /** Icono arriba y texto debajo (pares de acciones lado a lado). */
  stacked?: boolean;
  /** Brillo que recorre el botón cada 5 s (solo la acción protagonista). */
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
  success = false,
  haptic,
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
  const busy = loading || success;
  const compact = size === 'sm';
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      // Lo que se anuncia sale del mismo estado que bloquea el toque (también durante el check de éxito).
      accessibilityState={{ busy: loading, disabled: disabled || busy }}
      disabled={disabled || busy}
      haptic={haptic ?? (variant === 'primary' || variant === 'mint' ? 'light' : false)}
      dim={v.dim}
      onPress={onPress}
      hitSlop={compact ? COMPACT_SLOP : undefined}
      style={[
        s.base,
        compact && s.compact,
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
      {/* El contenido queda en su sitio (invisible) mientras carga o confirma: el botón nunca cambia de ancho. */}
      <View style={[s.content, stacked && s.stackedContent, busy && s.hidden]}>
        {icon ? <Icon name={icon} color={v.text} size={size === 'elder' ? 26 : compact ? 18 : 20} /> : null}
        <AppText
          variant={stacked || compact ? 'secondaryStrong' : size === 'elder' ? 'h3' : 'button'}
          color={v.text}
          align="center"
          style={s.grow}
        >
          {label}
        </AppText>
        {trailing ? <Icon name={trailing} color={v.text} size={20} /> : null}
      </View>
      {loading ? (
        <View style={s.center} pointerEvents="none">
          <ActivityIndicator color={v.text} size="small" />
        </View>
      ) : success ? (
        <SuccessCheck color={v.text} />
      ) : null}
    </PressableScale>
  );
}

/** Check que aparece con un pequeño resorte al confirmar. */
function SuccessCheck({ color }: { color: string }) {
  const s = useStyles();
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) v.set(withSpring(1, { damping: 12, stiffness: 260 }));
  }, [reduce, v]);
  const style = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.5 + 0.5 * v.value }] }));
  return (
    <Animated.View style={[s.center, style]} pointerEvents="none" accessibilityElementsHidden>
      <Icon name="check" color={color} size={24} strokeWidth={2.6} />
    </Animated.View>
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
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, maxWidth: '100%' },
    stackedContent: { flexDirection: 'column', gap: 2 },
    hidden: { opacity: 0 },
    center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
    fill: { ...StyleSheet.absoluteFill, borderRadius: radius.button },
    shineClip: { ...StyleSheet.absoluteFill, borderRadius: radius.button, overflow: 'hidden' },
    shine: { position: 'absolute', top: 0, bottom: 0, left: '35%', width: '28%' },
    grow: { flexShrink: 1, minWidth: 0, textAlign: 'center' },
    compact: { paddingHorizontal: spacing.sm, borderRadius: radius.compact, alignSelf: 'flex-start' },
    stacked: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    disabled: { opacity: 0.4 },
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
