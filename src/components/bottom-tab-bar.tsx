import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motion, radius, spacing, touch } from '@/theme';
import { makeStyles, useAppearanceStore, useTheme } from '@/theme/provider';
import { tapHaptic } from '@/utils/haptics';
import { strings } from '@/i18n';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { BuddyRobot } from './robot';
import { useFeed } from '@/state/feed';

const PILL_W = 60;
const PILL_H = 34;
const INSET = spacing.xs;

/** Espacio que ocupa la barra flotante desde abajo: las pantallas de pestañas lo reservan al final de su contenido. */
export function tabBarSpace(insetBottom: number) {
  return touch.tabBar + spacing.xs + Math.max(insetBottom, spacing.sm);
}

/** Liquid Glass nativo solo en iOS 26+ con la API disponible (algunas betas de iOS 26 no la tienen). */
const NATIVE_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/** "Reducir transparencia" del sistema: con ella, la barra es sólida. */
function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled?.().then(setOn).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/**
 * Barra de pestañas flotante (V2.4) sobre el contenido:
 * - Fondo: Liquid Glass nativo en iOS 26+ (expo-glass-effect); desenfoque (expo-blur) en iOS anterior y web; en
 *   Android, translúcida con degradado y reflejo (el desenfoque real exigiría envolver cada pantalla en BlurTargetView).
 *   Con "reducir transparencia" o alto contraste, sólida.
 * - Indicador "gota": se estira hacia la pestaña destino (solo transform: translateX + scaleX) y se asienta con resorte.
 * - Deslizar el dedo sobre la barra mueve el indicador, vibra al cruzar cada pestaña y al soltar abre la más cercana
 *   (se puede apagar en Ajustes > Apariencia). Tocar sigue funcionando igual. Etiquetas siempre visibles; áreas ≥ 56.
 */
export function BottomTabBar({
  state,
  descriptors,
  navigation,
  icons,
  caregiver = false,
}: BottomTabBarProps & { icons: Record<string, IconName>; caregiver?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { unread } = useFeed();
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  const reduceTransparency = useReduceTransparency();
  const gestures = useAppearanceStore((x) => x.barGestures);
  const [width, setWidth] = useState(0);
  const visibleRouteCount = state.routes.filter((route) => !(caregiver && route.name === 'settings')).length;
  const n = visibleRouteCount + (caregiver ? 1 : 0);
  const item = width / n;
  const x = useSharedValue(0);
  const stretch = useSharedValue(1);
  const slotForRoute = (index: number) => caregiver && index >= 2 ? index + 1 : index;
  const hover = useSharedValue(slotForRoute(state.index));
  const dragging = useSharedValue(0);
  // En Android (edge-to-edge) la barra quedaría flotando sobre el teclado y taparía el compositor del chat: se oculta
  // mientras el teclado está abierto (como tabBarHideOnKeyboard). En iOS el teclado ya la cubre.
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // La gota viaja a la pestaña activa y se estira según la distancia; luego se asienta.
  const prev = useSharedValue(slotForRoute(state.index));
  useEffect(() => {
    const selectedSlot = slotForRoute(state.index);
    const target = selectedSlot * item + (item - PILL_W) / 2;
    hover.set(selectedSlot);
    if (reduceMotion || item === 0) {
      x.set(target);
      return;
    }
    x.set(withSpring(target, motion.spring));
    const jump = Math.min(3, Math.abs(selectedSlot - prev.get()));
    if (jump) stretch.set(withSequence(withTiming(1 + jump * 0.28, { duration: 140 }), withSpring(1, motion.spring)));
    prev.set(selectedSlot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, item, reduceMotion, caregiver]);

  const go = useCallback(
    (slot: number) => {
      if (caregiver && slot === 2) {
        tapHaptic();
        router.push('/buddy' as Href);
        return;
      }
      const index = caregiver && slot > 2 ? slot - 1 : slot;
      const route = state.routes[index];
      if (!route) return;
      if (index === state.index) {
        x.set(withSpring(slot * item + (item - PILL_W) / 2, motion.spring));
        return;
      }
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      // Se navega fuera del evento del gesto: en web, navegar dentro del mismo "pointerup" quedaba sin efecto
      // (comprobado con scripts/capture/v24-tabbar.mjs).
      if (!event.defaultPrevented) setTimeout(() => navigation.navigate(route.name, route.params), 0);
    },
    [state.routes, state.index, navigation, item, x, caregiver, router],
  );

  const drag = Gesture.Pan()
    .enabled(gestures && item > 0)
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .onStart(() => {
      dragging.set(1);
    })
    .onUpdate((e) => {
      const cx = Math.min(width, Math.max(0, e.x - INSET));
      x.set(cx - PILL_W / 2);
      const idx = Math.min(n - 1, Math.max(0, Math.floor(cx / item)));
      if (idx !== hover.get()) {
        hover.set(idx);
        runOnJS(tapHaptic)();
      }
    })
    .onEnd(() => {
      runOnJS(go)(hover.get());
    })
    .onFinalize(() => {
      dragging.set(0);
    });

  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { scaleX: stretch.get() }],
  }));
  if (keyboard) return null;

  const solid = reduceTransparency || t.hc;
  return (
    <View pointerEvents="box-none" style={[s.outer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <GestureDetector gesture={drag}>
        <View accessibilityRole="tablist" style={[s.bar, t.shadow.elevated]} onLayout={(e) => setWidth(e.nativeEvent.layout.width - INSET * 2)}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.clip]}>
            {solid ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: t.c.surface }]} />
            ) : NATIVE_GLASS ? (
              <GlassView glassEffectStyle="regular" isInteractive colorScheme={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            ) : Platform.OS === 'android' ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: t.c.glass }]} />
            ) : (
              <>
                <BlurView intensity={60} tint={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: t.c.glass, opacity: 0.55 }]} />
              </>
            )}
            {/* Reflejo especular en el borde superior (sin efecto con fondo sólido ni con el vidrio nativo). */}
            {solid || NATIVE_GLASS ? null : (
              <LinearGradient colors={[t.dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']} style={s.sheen} />
            )}
          </View>
          {item > 0 ? <Animated.View pointerEvents="none" style={[s.pill, pill]} /> : null}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            if (caregiver && route.name === 'settings') return null;
            const label = options.title ?? route.name;
            const focused = state.index === index;
            const slot = slotForRoute(index);
            return (
              <Fragment key={route.key}>
                {caregiver && index === 2 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Abrir chat de ${strings.brand.name}${unread ? `, ${unread} novedades` : ''}`} onPress={() => go(2)} style={s.centerItem}>
                    <View style={[s.centerOrb, { backgroundColor: t.hc ? t.c.surface : t.ink.mint }]}>
                      <BuddyRobot size={42} compact mood="idle" badge={unread || undefined} flying={false} shadow={false} glow={false} navigationIndependent />
                    </View>
                    <AppText variant="meta" color={t.c.text} numberOfLines={1} maxScale={1.1} style={styles.label}>BUDDY</AppText>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: focused }}
                  accessibilityShowsLargeContentViewer
                  accessibilityLargeContentTitle={label}
                  onPress={() => go(slot)}
                  style={s.item}
                >
                  <TabIcon name={icons[route.name] ?? 'home'} focused={focused} />
                  <AppText variant="meta" color={focused ? t.c.text : t.c.muted} numberOfLines={1} maxScale={1.1} style={styles.label}>
                    {label}
                  </AppText>
                </Pressable>
              </Fragment>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
}

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const t = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (focused && !reduceMotion) scale.set(withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, motion.spring)));
  }, [focused, reduceMotion, scale]);
  // El icono activo se eleva un poco y rebota al activarse.
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: focused ? -2 : 0 }, { scale: scale.get() }] }));
  return (
    <Animated.View style={[styles.iconWrap, style]}>
      <Icon name={name} color={focused ? (t.hc ? t.c.text : t.ink.mint) : t.c.muted} size={23} strokeWidth={focused ? 2.2 : 1.8} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({ iconWrap: { height: PILL_H, justifyContent: 'center' }, label: { letterSpacing: 0, textTransform: 'none' } });

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    // Flota sobre el contenido (las pantallas reservan `tabBarSpace` al final).
    outer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      minHeight: touch.tabBar,
      paddingHorizontal: INSET,
      borderRadius: radius.modal,
      borderWidth: t.hc ? 2 : 1,
      borderColor: t.hc ? t.c.text : t.dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.9)',
    },
    clip: { borderRadius: radius.modal, overflow: 'hidden' },
    sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: '45%' },
    pill: {
      position: 'absolute',
      top: 8,
      left: INSET,
      width: PILL_W,
      height: PILL_H,
      borderRadius: 17,
      backgroundColor: t.hc ? t.c.bg : t.c.mintPale,
      borderWidth: t.hc ? 2 : 0,
      borderColor: t.c.text,
    },
    item: { flex: 1, alignItems: 'center', gap: 2, minHeight: touch.tabBar - 8, paddingTop: 8, paddingBottom: 6, paddingHorizontal: 2 },
    centerItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: touch.tabBar - 8, paddingBottom: 6, paddingHorizontal: 2 },
    centerOrb: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: -23, marginBottom: 3, borderWidth: t.hc ? 2 : 0, borderColor: t.c.text },
  }),
);
