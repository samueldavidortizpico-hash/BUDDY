import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ROBOT_IMAGE, ROBOT_RATIO } from '@/components/robot';
import type { Role } from '@/domain/types';
import { strings } from '@/i18n';
import { useHomeHref } from '@/state/nav';
import { useSession } from '@/state/session';
import { motion, radius, spacing } from '@/theme';
import { makeStyles, useAppearanceStore, useBigText, useTheme } from '@/theme/provider';

const R = strings.auth.roles;
const S = strings.welcome;
type Choice = 'admin' | 'elder' | 'nurse';
/** Encabezado: azul → azul petróleo → turquesa (referencia 06); en oscuro, noche índigo → violeta (V5, sin verde). */
const HEADER = { light: ['#1A4681', '#1F72A2', '#19A6A8'] as const, dark: ['#121A3E', '#22286A', '#3A2F7E'] as const };

/**
 * Bienvenido (V4.2, referencia 06): encabezado con degradado y "Bienvenido" en blanco; tarjeta blanca con la pregunta
 * y las tres opciones (la tercera, enfermera o cuidadora, es nueva); abajo "Crear cuenta" e "Iniciar sesión".
 * La primera vez en el teléfono se ven antes las cuatro presentaciones.
 */
export default function Welcome() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const status = useSession((x) => x.status);
  const home = useHomeHref();
  const introSeen = useAppearanceStore((x) => x.introSeen);
  const [choice, setChoice] = useState<Choice | null>(null);
  const card = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    card.set(reduce ? withTiming(1, { duration: 200 }) : withDelay(120, withSpring(1, motion.springSoft)));
  }, [reduce, card]);
  const cardStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, card.get() * 1.5), transform: [{ translateY: reduce ? 0 : 48 * (1 - card.get()) }] }));
  const actionsStyle = useAnimatedStyle(() => ({ opacity: card.get() }));

  if (status === 'signedIn') return <Redirect href={home} />;
  if (!introSeen) return <Redirect href="/onboarding" />;

  // La enfermera o cuidadora entra por la misma puerta que quien administra: cuenta de cuidador e invitación.
  const role: Role = choice === 'elder' ? 'elder' : 'caregiver';

  return (
    <View style={s.root}>
      {t.hc ? null : <LinearGradient colors={t.dark ? ['#0B1622', '#0E1C2A'] : ['#ECF3FA', '#E8FAF0']} style={StyleSheet.absoluteFill} />}
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={[s.header, { paddingTop: insets.top + spacing.md }]}>
          {t.hc ? null : <LinearGradient colors={t.dark ? HEADER.dark : HEADER.light} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={StyleSheet.absoluteFill} />}
          {t.hc ? null : <FloatingBuddy />}
          <Appear delay={180}>
            <AppText variant="display" color={t.hc ? t.c.text : '#FFFFFF'} align="center" accessibilityRole="header" style={s.headText}>
              {S.header}
            </AppText>
          </Appear>
          <Appear delay={240}>
            <AppText variant="body" color={t.hc ? t.c.text : 'rgba(255,255,255,0.86)'} align="center" maxScale={1.6} style={s.promise}>
              {strings.brand.promise}
            </AppText>
          </Appear>
        </View>

        <Animated.View style={[s.card, cardStyle]}>
          <AppText variant="h3" align="center" accessibilityRole="header" maxScale={1.6}>
            {R.title}
          </AppText>
          <View style={s.roles} accessibilityRole="radiogroup">
            <Appear delay={320} index={0}>
              <RoleRow icon="users" tone="mint" title={R.admin} detail={R.adminDetail} selected={choice === 'admin'} onPress={() => setChoice('admin')} />
            </Appear>
            <Appear delay={320} index={1}>
              <RoleRow icon="heart" tone="coral" title={R.elder} detail={R.elderDetail} selected={choice === 'elder'} onPress={() => setChoice('elder')} />
            </Appear>
            <Appear delay={320} index={2}>
              <RoleRow icon="plus" tone="sky" title={R.nurse} detail={R.nurseDetail} selected={choice === 'nurse'} onPress={() => setChoice('nurse')} />
            </Appear>
          </View>
          {choice === 'elder' ? (
            <AppText variant="secondary" color={t.c.muted} align="center">
              {R.elderNote}
            </AppText>
          ) : null}
        </Animated.View>

        <Animated.View style={[s.actions, actionsStyle]}>
          {choice !== 'elder' ? <Button label={S.createAccount} variant="mint" haptic shine style={s.pill} onPress={() => router.push('/sign-up')} /> : null}
          <Button
            label={S.signIn}
            variant={choice === 'elder' ? 'mint' : 'ghost'}
            size={choice === 'elder' ? 'elder' : 'lg'}
            haptic
            style={s.pill}
            onPress={() => router.push({ pathname: '/sign-in', params: { role } })}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/**
 * El momento protagonista de Bienvenido (V5): BUDDY entra con un resorte y luego flota despacio sobre un halo de luz.
 * Es la única animación continua de la pantalla; con "reducir movimiento" aparece quieto.
 */
function FloatingBuddy() {
  const s = useStyles();
  const reduce = useReducedMotion();
  const enter = useSharedValue(reduce ? 1 : 0);
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    enter.set(withSpring(1, { damping: 12, stiffness: 150 }));
    const sine = Easing.inOut(Easing.sin);
    float.set(withDelay(500, withRepeat(withSequence(withTiming(1, { duration: 2800, easing: sine }), withTiming(0, { duration: 2800, easing: sine })), -1)));
    return () => cancelAnimation(float);
  }, [reduce, enter, float]);
  const robot = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.get() * 1.5),
    transform: [{ translateY: -7 * float.get() + 16 * (1 - enter.get()) }, { scale: 0.85 + 0.15 * enter.get() }],
  }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.55 + 0.25 * float.get(), transform: [{ scale: 0.92 + 0.08 * float.get() }] }));
  return (
    <View style={s.buddy} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[s.halo, halo]} />
      <Animated.View style={robot}>
        <Image source={ROBOT_IMAGE} style={s.robot} contentFit="contain" accessible={false} />
      </Animated.View>
    </View>
  );
}

const TONES = {
  mint: { light: ['#DDF6EF', '#1E9C86'], dark: ['rgba(140,158,255,0.16)', '#A9B8FF'] },
  coral: { light: ['#FDE6E2', '#E0534A'], dark: ['rgba(255,133,133,0.16)', '#FF8585'] },
  sky: { light: ['#E2EEFC', '#2F78C4'], dark: ['rgba(124,194,255,0.16)', '#7CC2FF'] },
} as const;

/** Opción de la tarjeta (radio accesible): icono en círculo de color, título y subtítulo; al elegirla, borde y check. */
function RoleRow({ icon, tone, title, detail, selected, onPress }: { icon: IconName; tone: keyof typeof TONES; title: string; detail: string; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  // Letra muy grande: el icono y el check ceden su ancho al texto (nunca se parte una palabra).
  const big = useBigText();
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(reduce ? withTiming(selected ? 1 : 0, { duration: 150 }) : withSpring(selected ? 1 : 0, motion.spring));
  }, [selected, reduce, on]);
  const ring = useAnimatedStyle(() => ({ opacity: on.get() }));
  const check = useAnimatedStyle(() => ({ opacity: on.get(), transform: [{ scale: reduce ? 1 : 0.4 + 0.6 * on.get() }] }));
  const [bg, fg] = t.hc ? [t.c.surface2, t.c.text] : TONES[tone][t.dark ? 'dark' : 'light'];
  const accent = t.hc ? t.c.text : t.dark ? t.c.primary : '#1D6FB8';
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${detail}`}
      style={s.role}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.roleRing, { borderColor: accent }, ring]} />
      {big ? null : (
        <View style={[s.roleIcon, { backgroundColor: bg }]}>
          <Icon name={icon} color={fg} size={24} strokeWidth={2.2} />
        </View>
      )}
      <View style={s.flex}>
        <AppText variant="bodyStrong" maxScale={1.8}>
          {title}
        </AppText>
        <AppText variant="secondary" color={t.c.muted} maxScale={1.8}>
          {detail}
        </AppText>
      </View>
      {big ? null : (
        <Animated.View style={[s.check, { backgroundColor: accent }, check]}>
          <Icon name="check" color={t.hc ? t.c.bg : '#FFFFFF'} size={16} strokeWidth={3} />
        </Animated.View>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.c.bg },
    scroll: { flexGrow: 1 },
    header: { paddingBottom: 64, paddingHorizontal: spacing.lg, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', alignItems: 'center' },
    headText: { fontSize: 36, lineHeight: 42 },
    promise: { maxWidth: 320, marginTop: spacing.xxs },
    buddy: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxs },
    // Halo de luz detrás del robot: círculo blanco translúcido con borde suave (sin blur, barato en Android).
    halo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
    robot: { width: 112 * ROBOT_RATIO, height: 112 },
    card: {
      marginTop: -40,
      marginHorizontal: spacing.md,
      padding: spacing.md,
      paddingTop: spacing.lg,
      gap: spacing.md,
      borderRadius: 28,
      backgroundColor: t.c.surface,
      ...t.hairline,
      ...t.shadow.elevated,
    },
    roles: { gap: spacing.sm },
    role: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 76,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 20,
      backgroundColor: t.dark ? t.c.surface2 : '#F5F9FB',
      ...t.hairline,
    },
    roleRing: { borderRadius: 20, borderWidth: 2 },
    roleIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    flex: { flex: 1 },
    actions: { gap: spacing.sm, marginTop: 'auto', paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
    pill: { borderRadius: radius.pill, minHeight: 58 },
  }),
);
