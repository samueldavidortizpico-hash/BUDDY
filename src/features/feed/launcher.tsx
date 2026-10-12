/**
 * BuddyLauncher: el robot flotante (~72 dp) sobre la barra de pestañas del administrador, en todas las pestañas salvo
 * el chat. Tocarlo abre el chat con un vuelo corto y zoom. Bolita roja con las novedades sin leer (alertas y
 * recomendaciones) que late; con novedades muestra 6 s una burbuja con la más importante. Ojos preocupados si hay
 * señal de alarma, saluda si hay novedades normales y, con todo en orden, de vez en cuando pone ojos de corazón.
 * Con "reducir movimiento": sin vuelo ni burbuja animada (solo cambios de expresión).
 */
import { useFocusEffect, usePathname, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { BuddyRobot, type RobotMood } from '@/components/robot';
import { strings } from '@/i18n';
import { useFeed } from '@/state/feed';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const F = strings.feed;
const SIZE = 72;
const BUBBLE_MS = 6000;
const LOVE_EVERY_MS = 25_000;

/** Distancia desde abajo: barra de pestañas + margen (la usan las pantallas para no quedar tapadas). */
export function launcherBottom(insetBottom: number) {
  return spacing.xs + touch.tabBar + Math.max(insetBottom, spacing.sm) + spacing.sm;
}

export function BuddyLauncher() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { items, unread, alarm } = useFeed();
  const top = items.find((f) => !f.positive) ?? null;
  const [bubble, setBubble] = useState<string | null>(null);
  const [love, setLove] = useState(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const k = useSharedValue(1);
  const o = useSharedValue(1);

  // Al volver a una pestaña, el robot regresa a su sitio.
  useFocusEffect(
    useCallback(() => {
      x.set(0);
      y.set(0);
      k.set(1);
      o.set(1);
    }, [x, y, k, o]),
  );

  // Burbuja de 6 s con la novedad más importante cuando aparece o escala.
  const topKey = top ? `${top.key}:${top.severity}:${top.count}` : null;
  useEffect(() => {
    if (!topKey || !unread) return;
    const show = setTimeout(() => setBubble(topKey), 300);
    const hide = setTimeout(() => setBubble(null), 300 + BUBBLE_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [topKey, unread]);

  // Con todo en orden, de vez en cuando ojos de corazón.
  useEffect(() => {
    if (unread || alarm || reduce) return;
    const id = setInterval(() => {
      setLove(true);
      setTimeout(() => setLove(false), 2500);
    }, LOVE_EVERY_MS);
    return () => clearInterval(id);
  }, [unread, alarm, reduce]);

  const fly = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }, { translateY: y.value }, { scale: k.value }] }));

  if (pathname === '/buddy') return null;

  const mood: RobotMood = alarm ? 'worry' : unread ? 'wave' : love ? 'love' : 'idle';
  const open = () => {
    if (reduce) return router.push('/buddy' as Href);
    // Vuelo corto hacia el centro con zoom; solo transform y opacidad.
    const ease = { duration: 260, easing: Easing.in(Easing.cubic) };
    x.set(withTiming(-120, ease));
    y.set(withTiming(-220, ease));
    k.set(withTiming(1.8, ease));
    o.set(withTiming(0, { duration: 300 }));
    setTimeout(() => router.push('/buddy' as Href), 240);
  };

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: launcherBottom(insets.bottom) }]}>
      {bubble && top ? (
        <Animated.View entering={reduce ? undefined : FadeIn.duration(200)} exiting={reduce ? undefined : FadeOut.duration(200)} style={[s.bubble, t.shadow.elevated]} pointerEvents="none" accessibilityLiveRegion="polite">
          <AppText variant="captionStrong" numberOfLines={2}>
            {top.title}
          </AppText>
        </Animated.View>
      ) : null}
      <Animated.View style={fly}>
        <BuddyRobot size={SIZE} compact mood={mood} badge={unread || undefined} shadow={false} glow onPress={open} accessibilityLabel={F.launcher(unread)} />
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    wrap: { position: 'absolute', right: spacing.xs, alignItems: 'flex-end' },
    bubble: { maxWidth: 240, marginRight: spacing.sm, marginBottom: -4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.card, borderBottomRightRadius: 6, backgroundColor: t.c.surface, ...t.hairline },
  }),
);
