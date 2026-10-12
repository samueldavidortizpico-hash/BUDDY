import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { motion, radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { tapHaptic } from '@/utils/haptics';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

const PILL_W = 60;
const PILL_H = 34;
const INSET = spacing.xs;

/**
 * Barra de pestañas flotante: píldora translúcida (vidrio sin blur: el desenfoque es costoso y no existe en todas
 * las plataformas de Expo Go), radio 28, margen 16, alto 72 + área segura. La pestaña `featured` (BUDDY) va al centro,
 * destacada en un círculo. La píldora de la pestaña activa se desliza con resorte y el icono rebota.
 */
export function BottomTabBar({
  state,
  descriptors,
  navigation,
  icons,
  featured,
}: BottomTabBarProps & { icons: Record<string, IconName>; featured?: string }) {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const item = width / state.routes.length;
  const x = useSharedValue(0);
  const featuredActive = state.routes[state.index]?.name === featured;

  useEffect(() => {
    const target = state.index * item + (item - PILL_W) / 2;
    x.set(reduceMotion || item === 0 ? target : withSpring(target, motion.spring));
  }, [state.index, item, reduceMotion, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[s.outer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View accessibilityRole="tablist" style={[s.bar, t.shadow.elevated]} onLayout={(e) => setWidth(e.nativeEvent.layout.width - INSET * 2)}>
        {item > 0 && !featuredActive ? <Animated.View style={[s.pill, pill]} /> : null}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;
          const isFeatured = route.name === featured;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              tapHaptic();
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              // Como en iOS: la etiqueta no crece más allá de ×1.1; con texto grande, mantener presionado muestra el visor.
              accessibilityShowsLargeContentViewer
              accessibilityLargeContentTitle={label}
              onPress={onPress}
              style={s.item}
            >
              {isFeatured ? (
                <View style={[s.featured, focused && s.featuredOn]}>
                  {t.hc ? null : <LinearGradient colors={[t.c.mint, t.c.mintStrong]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, s.round]} />}
                  <Icon name="sparkle" size={26} color={t.hc ? t.c.bg : '#0D3946'} strokeWidth={2.2} />
                </View>
              ) : (
                <TabIcon name={icons[route.name] ?? 'home'} focused={focused} />
              )}
              <AppText variant="meta" color={focused ? t.c.text : t.c.muted} numberOfLines={1} maxScale={1.1} style={styles.label}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
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
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.iconWrap, style]}>
      <Icon name={name} color={focused ? (t.hc ? t.c.text : t.ink.mint) : t.c.muted} size={23} strokeWidth={focused ? 2.2 : 1.8} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({ iconWrap: { height: PILL_H, justifyContent: 'center' }, label: { letterSpacing: 0, textTransform: 'none' } });

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    outer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, backgroundColor: t.c.bg },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      minHeight: touch.tabBar,
      paddingHorizontal: INSET,
      borderRadius: radius.modal,
      backgroundColor: t.c.glass,
      ...t.hairline,
    },
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
    featured: {
      width: 56,
      height: 56,
      marginTop: -22,
      marginBottom: -4,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.hc ? t.c.text : t.c.mint,
      ...t.shadow.glow.mint,
      borderWidth: 3,
      borderColor: t.c.bg,
    },
    featuredOn: { transform: [{ scale: 1.06 }] },
    round: { borderRadius: 28 },
  }),
);
