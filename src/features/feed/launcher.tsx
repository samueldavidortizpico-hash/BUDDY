/**
 * BuddyLauncher (V2.4): el robot flotante (~72 dp) de las pestañas del administrador (el chat ya no es pestaña).
 * - Se arrastra libremente con el dedo (Gesture Handler + Reanimated, en el hilo de UI): no sale de la pantalla ni tapa
 *   la barra de pestañas, se va al borde más cercano si el imán está activo, recuerda su posición por tamaño de pantalla
 *   y se oculta con el teclado. Mientras se arrastra mira hacia donde va; al soltar da un saltito. Tocarlo abre el chat.
 * - Burbujas de novedades bien visibles: color por severidad CON icono y texto, se quedan hasta tocarlas o descartarlas,
 *   hasta 3 apiladas con "+N", deslizar para descartar, siempre con una acción, y del lado del robot con espacio.
 * - Con "reducir movimiento": sin rebotes ni meneos (solo cambios de expresión); el arrastre sigue funcionando.
 */
import { useFocusEffect, usePathname, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Linking, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeOut,
  ZoomIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { useToast } from '@/components/feedback';
import { Icon, type IconName } from '@/components/icon';
import { BuddyRobot, type RobotMood } from '@/components/robot';
import { itemVersion, type FeedItem } from '@/domain/recommendations/engine';
import { strings } from '@/i18n';
import { useActiveElder } from '@/state/data';
import { feedActions, useFeed } from '@/state/feed';
import { bounds, bubbleSide, clampPos, isHiddenToday, sizeKey, snapX, useLauncherStore, type Pos } from '@/state/launcher';
import { motion, radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { softHaptic, successHaptic } from '@/utils/haptics';

const F = strings.feed;
const SIZE = 72;
/** Huella real en pantalla (el brillo alrededor del robot): con ella se calculan los límites. */
const FOOTPRINT = 96;
const MAX_BUBBLES = 3;
const LOVE_EVERY_MS = 25_000;

/** Distancia desde abajo: barra de pestañas + margen (la usan las pantallas para no quedar tapadas). */
export function launcherBottom(insetBottom: number) {
  return spacing.xs + touch.tabBar + Math.max(insetBottom, spacing.sm) + spacing.sm;
}

export function BuddyLauncher() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const { unreadItems, unread, alarm } = useFeed();
  const key = sizeKey(width, height);
  const saved = useLauncherStore((s) => s.positions[key]);
  const magnet = useLauncherStore((s) => s.magnet);
  const hiddenOn = useLauncherStore((s) => s.hiddenOn);
  const dismissed = useLauncherStore((s) => s.dismissed);
  const setPos = useLauncherStore((s) => s.setPos);
  const b = bounds(width, height, FOOTPRINT, insets.top, launcherBottom(insets.bottom));

  const x = useSharedValue(saved?.x ?? 0);
  const y = useSharedValue(saved?.y ?? 0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const dir = useSharedValue(0);
  const k = useSharedValue(1);
  const o = useSharedValue(1);
  const [look, setLook] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const [love, setLove] = useState(false);
  /** Un arrastre no debe abrir el chat: el toque que llega al soltar se ignora (1 = se está arrastrando). */
  const dragged = useSharedValue(0);

  // Cambio de tamaño de pantalla (rotación): se recoloca dentro de los nuevos límites.
  useEffect(() => {
    const p = clampPos(saved ?? { x: 0, y: 0 }, b);
    x.set(p.x);
    y.set(p.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, b.maxLeft, b.maxUp]);

  // Al volver a una pestaña, el robot reaparece (tras el zoom hacia el chat).
  useFocusEffect(
    useCallback(() => {
      k.set(1);
      o.set(1);
    }, [k, o]),
  );

  // Con el teclado abierto no tapa campos ni el compositor.
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const c = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      a.remove();
      c.remove();
    };
  }, []);

  // Con todo en orden, de vez en cuando ojos de corazón.
  useEffect(() => {
    if (unread || alarm || reduce) return;
    const id = setInterval(() => {
      setLove(true);
      setTimeout(() => setLove(false), 2500);
    }, LOVE_EVERY_MS);
    return () => clearInterval(id);
  }, [unread, alarm, reduce]);

  const commit = useCallback(
    (p: Pos) => {
      setPos(key, p);
      setLook(0);
    },
    [key, setPos],
  );

  const pan = Gesture.Pan()
    .minDistance(8)
    .onStart(() => {
      sx.set(x.get());
      sy.set(y.get());
      dragged.set(1);
    })
    .onUpdate((e) => {
      const p = clampPos({ x: sx.get() + e.translationX, y: sy.get() + e.translationY }, b);
      x.set(p.x);
      y.set(p.y);
      // Los ojos siguen la dirección; solo se avisa a React cuando cambia (no en cada cuadro).
      const d = e.velocityX > 60 ? 1 : e.velocityX < -60 ? -1 : dir.get();
      if (d !== dir.get()) {
        dir.set(d);
        runOnJS(setLook)(d);
      }
    })
    .onEnd(() => {
      const fx = snapX(x.get(), b.maxLeft, magnet);
      x.set(reduce ? fx : withSpring(fx, motion.spring));
      if (!reduce) k.set(withSequence(withTiming(1.12, { duration: 110 }), withSpring(1, motion.spring)));
      dir.set(0);
      runOnJS(commit)({ x: fx, y: y.get() });
      dragged.set(withDelay(120, withTiming(0, { duration: 0 })));
    });

  const place = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { translateY: y.get() }] }));
  const fly = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ scale: k.get() }] }));
  // Lado de las burbujas: se deriva de la posición guardada (se actualiza al soltar el robot).
  const side = bubbleSide(clampPos(saved ?? { x: 0, y: 0 }, b), b);

  if (keyboard || isHiddenToday(hiddenOn)) return null;

  // Burbujas solo en el Inicio (V3.0): en Rutina, Salud y Ajustes tapaban filas y botones (auditoría V3.0 #8). En las
  // demás pestañas queda el robot con su contador, que abre el chat.
  const pending = pathname === '/summary' ? unreadItems.filter((f) => !f.positive && dismissed[f.key] !== itemVersion(f)) : [];
  const mood: RobotMood = alarm ? 'worry' : unread ? 'wave' : love ? 'love' : 'idle';
  const open = () => {
    if (dragged.get()) return;
    if (reduce) return router.push('/buddy' as Href);
    // Zoom hacia el chat: solo transform y opacidad.
    k.set(withTiming(1.8, { duration: 240 }));
    o.set(withTiming(0, { duration: 260 }));
    setTimeout(() => router.push('/buddy' as Href), 220);
  };

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { bottom: launcherBottom(insets.bottom) }, place]}>
      {/* Las burbujas se colocan respecto al robot (no lo desplazan): hacia el lado y la altura con espacio. */}
      {pending.length ? (
        <View pointerEvents="box-none" style={[styles.bubbles, side.align === 'left' ? styles.fromLeft : styles.fromRight, side.below ? styles.below : styles.above]}>
          <BubbleStack items={pending} />
        </View>
      ) : null}
      <View pointerEvents="box-none">
        <GestureDetector gesture={pan}>
          <Animated.View style={fly} testID="launcher-robot">
            <BuddyRobot size={SIZE} compact mood={mood} look={look} badge={unread || undefined} shadow={false} glow onPress={open} accessibilityLabel={F.launcher(unread)} />
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

/** Color e icono por severidad (nunca solo color: también icono y etiqueta). */
function look(f: FeedItem, t: ReturnType<typeof useTheme>): { bg: string; border: string; fg: string; icon: IconName; label: string } {
  const tone = f.help ? t.tones.red : f.severity === 'alarm' ? t.tones.coral : f.severity === 'attention' ? t.tones.yellow : t.tones.mint;
  return {
    bg: t.hc ? t.c.surface : tone.bg,
    border: t.hc ? t.c.text : tone.fg,
    fg: t.hc ? t.c.text : tone.fg,
    icon: f.help ? 'shield' : f.severity === 'info' ? 'bell' : 'warning',
    label: f.help ? F.help : F.severity[f.severity],
  };
}

/**
 * Por defecto solo la novedad más importante (no tapa la pantalla); "+N" despliega hasta 3 apiladas y "Menos" las
 * recoge. Lo que no cabe queda en el feed.
 */
function BubbleStack({ items: all }: { items: FeedItem[] }) {
  const s = useStyles();
  const [open, setOpen] = useState(false);
  const items = all.slice(0, open ? MAX_BUBBLES : 1);
  const extra = all.length - items.length;
  const lastTop = useRef<string | null>(null);
  // Haptic suave cuando llega una novedad nueva arriba.
  useEffect(() => {
    const top = items[0] ? `${items[0].key}:${itemVersion(items[0])}` : null;
    if (top && top !== lastTop.current) softHaptic();
    lastTop.current = top;
  }, [items]);
  return (
    <View pointerEvents="box-none" style={s.stack}>
      {items.map((f, i) => (
        <Bubble key={f.key} item={f} index={i} compact={i > 0} />
      ))}
      {all.length > 1 ? (
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={open ? F.fewerBubbles : F.moreBubbles(extra)} style={s.moreHit}>
          <AppText variant="captionStrong" style={s.more}>{open ? (extra ? `+${extra} · ${F.fewer}` : F.fewer) : `+${extra}`}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** La primera burbuja va completa con su acción; las siguientes, compactas (una línea) para no tapar la pantalla. */
function Bubble({ item, index, compact }: { item: FeedItem; index: number; compact: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const elder = useActiveElder();
  const dismiss = useLauncherStore((st) => st.dismiss);
  const c = look(item, t);
  const tx = useSharedValue(0);
  const rot = useSharedValue(0);
  const close = useCallback(() => dismiss(item.key, itemVersion(item)), [dismiss, item]);

  // Meneo corto al aparecer (sin meneo con "reducir movimiento").
  useEffect(() => {
    if (reduce) return;
    rot.set(withSequence(withTiming(-3, { duration: 90 }), withTiming(3, { duration: 90 }), withTiming(0, { duration: 90 })));
  }, [reduce, rot]);

  const swipe = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      tx.set(e.translationX);
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 90) runOnJS(close)();
      else tx.set(withSpring(0, motion.spring));
    });
  const style = useAnimatedStyle(() => ({ opacity: 1 - Math.min(0.6, Math.abs(tx.get()) / 200), transform: [{ translateX: tx.get() }, { rotate: `${rot.get()}deg` }] }));

  const action = item.actions[0];
  const act = () => {
    if (!action) return router.push('/alerts' as Href);
    const r = feedActions.run(action);
    if (r.open) return router.push(r.open as Href);
    if (r.call !== undefined) return r.call ? Linking.openURL(`tel:${r.call}`) : toast({ message: F.noPhone(elder?.firstName ?? 'tu familiar'), icon: 'info' });
    if (r.done) {
      successHaptic();
      toast({ message: r.done, icon: 'check' });
    }
  };
  const snooze = () => feedActions.mute(item.key, 24);

  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        testID="launcher-bubble"
        entering={reduce ? undefined : ZoomIn.springify().damping(14).delay(index * 80)}
        exiting={reduce ? undefined : FadeOut.duration(160)}
        style={[s.bubble, compact && s.compact, { backgroundColor: c.bg, borderColor: c.border }, t.shadow.elevated, style]}
        accessibilityLiveRegion={index === 0 ? 'polite' : undefined}
      >
        <Pressable onPress={() => router.push('/alerts' as Href)} accessibilityRole="button" accessibilityLabel={`${c.label}. ${item.title}. ${F.openFeed}`} style={s.body}>
          <View style={s.head}>
            <Icon name={c.icon} color={c.fg} size={18} />
            <AppText variant="captionStrong" color={c.fg} style={s.flex}>{c.label}</AppText>
          </View>
          <AppText variant="secondaryStrong" numberOfLines={compact ? 1 : 3}>{item.title}</AppText>
        </Pressable>
        {compact ? null : (
        <View style={s.actions}>
          <Button label={action ? F.actions[action.type] : F.actions.open} size="sm" variant="tonal" onPress={act} />
          {action?.type === 'purchase' ? <Button label={F.snooze} size="sm" variant="ghost" onPress={snooze} /> : null}
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={F.dismissBubble} hitSlop={8} style={s.close}>
            <Icon name="close" color={t.c.muted} size={18} />
          </Pressable>
        </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: spacing.xs },
  bubbles: { position: 'absolute', width: 288 },
  fromRight: { right: 0, alignItems: 'flex-end' },
  fromLeft: { left: 0, alignItems: 'flex-start' },
  above: { bottom: FOOTPRINT },
  below: { top: FOOTPRINT },
});

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    stack: { gap: spacing.xs, maxWidth: 300 },
    bubble: { width: 280, maxWidth: '100%', padding: spacing.sm, gap: spacing.xs, borderRadius: radius.card, borderWidth: 2 },
    compact: { paddingVertical: spacing.xs, minHeight: touch.min },
    body: { gap: 4 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
    close: { marginLeft: 'auto', width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    moreHit: { alignSelf: 'center', minHeight: touch.min, justifyContent: 'center' },
    more: { alignSelf: 'center', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: t.c.surface, color: t.c.text },
  }),
);
