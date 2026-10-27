/**
 * Armazón de las pantallas de cuenta (V4.3): mitad superior con el degradado principal y dos luces difuminadas muy
 * suaves; al centro el ícono real de BUDDY (72, nivel 2), "BUDDY" y una línea; debajo, una tarjeta que sube sobre el
 * degradado (radio 28 arriba, relleno 24, nivel 3). Con el teclado abierto el ícono se reduce y se desvanece y la tarjeta
 * sube: nada queda tapado. Solo transform y opacidad; con "reducir movimiento", fundidos.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Icon } from '@/components/icon';
import { strings } from '@/i18n';
import { motion, radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const ICON = require('../../../assets/branding/buddy-splash.png');
/** Degradado del encabezado: el principal en claro y su versión de noche en oscuro. */
const HEADER = { light: ['#14837D', '#155E68', '#174A59'] as const, dark: ['#0E3B44', '#0F2B3C', '#0B1E2D'] as const };

export function AuthShell({ tagline, back = '/', children, footer }: { tagline: string; back?: Href; children: ReactNode; footer?: ReactNode }) {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const keyboard = useKeyboardOpen();
  const k = useSharedValue(0);
  const rise = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    k.set(withTiming(keyboard ? 1 : 0, { duration: reduce ? motion.reduced : 220 }));
  }, [keyboard, reduce, k]);
  useEffect(() => {
    rise.set(reduce ? withTiming(1, { duration: motion.reduced }) : withSpring(1, { damping: 18, stiffness: 160 }));
  }, [reduce, rise]);

  const brand = useAnimatedStyle(() => ({ opacity: 1 - k.value, transform: [{ scale: 1 - 0.35 * k.value }, { translateY: -12 * k.value }] }));
  const card = useAnimatedStyle(() => ({ opacity: Math.min(1, rise.value * 1.4), transform: [{ translateY: reduce ? 0 : 60 * (1 - rise.value) }] }));

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
          <View style={[s.header, { paddingTop: insets.top + spacing.xs }, keyboard && s.headerCompact]}>
            {t.hc ? null : (
              <>
                <LinearGradient colors={t.dark ? HEADER.dark : HEADER.light} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <Glow style={s.glowA} color="#5ED9B5" />
                <Glow style={s.glowB} color="#A99DFF" />
              </>
            )}
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace(back))}
              accessibilityRole="button"
              accessibilityLabel={strings.common.back}
              hitSlop={8}
              style={[s.back, { top: insets.top + spacing.xs }]}
            >
              <Icon name="back" color={t.hc ? t.c.text : '#FFFFFF'} size={22} />
            </Pressable>
            {keyboard ? null : (
              <Animated.View style={[s.brand, brand]}>
                <View style={s.iconWrap}>
                  <Image source={ICON} style={s.icon} contentFit="contain" accessible={false} />
                </View>
                <AppText variant="display" color={t.hc ? t.c.text : '#FFFFFF'} align="center" accessibilityRole="header" maxScale={1.4}>
                  BUDDY
                </AppText>
                <AppText variant="body" color={t.hc ? t.c.text : 'rgba(255,255,255,0.88)'} align="center" maxScale={1.6}>
                  {tagline}
                </AppText>
              </Animated.View>
            )}
          </View>

          <Animated.View layout={reduce ? undefined : LinearTransition.duration(220)} style={[s.card, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xs }, card]}>
            {children}
            {footer}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Luz difuminada (degradado radial, sin blur). */
function Glow({ color, style }: { color: string; style: object }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={0.32} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50" cy="50" rx="50" ry="50" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    // Del color de la tarjeta: mientras sube al entrar, debajo no asoma una franja de otro color.
    root: { flex: 1, backgroundColor: t.hc ? t.c.bg : t.c.surface },
    scroll: { flexGrow: 1 },
    header: { minHeight: 300, paddingHorizontal: spacing.lg, paddingBottom: 56, overflow: 'hidden', justifyContent: 'center' },
    headerCompact: { minHeight: 0, paddingBottom: 40 },
    glowA: { top: -60, left: -120, right: undefined, bottom: undefined, width: 320, height: 320 },
    glowB: { top: 40, right: -140, left: undefined, bottom: undefined, width: 300, height: 300 },
    back: {
      position: 'absolute',
      left: spacing.md,
      width: touch.min,
      height: touch.min,
      borderRadius: touch.min / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.hc ? t.c.bg : 'rgba(255,255,255,0.14)',
      zIndex: 2,
      ...(t.hc ? t.hairline : {}),
    },
    brand: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xxl },
    iconWrap: { borderRadius: 18, marginBottom: spacing.xs, boxShadow: '0px 8px 24px rgba(4, 24, 32, 0.28)' },
    icon: { width: 72, height: 72 },
    card: {
      flexGrow: 1,
      marginTop: -28,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      gap: spacing.md,
      backgroundColor: t.c.surface,
      borderTopLeftRadius: radius.modal,
      borderTopRightRadius: radius.modal,
      ...t.shadow.sheet,
      ...(t.hc ? t.hairline : {}),
    },
  }),
);
