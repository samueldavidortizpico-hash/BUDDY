import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { border, colors, ink, motion, palette, radius, shadow, spacing, touch } from '@/theme';
import { tapHaptic } from '@/utils/haptics';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

const PILL_W = 64;
const PILL_H = 36;
const INSET = spacing.xs;

/**
 * Barra de pestañas flotante: píldora translúcida (vidrio sin blur, que es costoso y no existe en Expo Go en todas
 * las plataformas), radio 28, margen 16, alto 72 + área segura. La píldora menta de la pestaña activa se desliza con
 * resorte y el icono da un pequeño rebote. La etiqueta siempre es visible.
 */
export function BottomTabBar({ state, descriptors, navigation, icons }: BottomTabBarProps & { icons: Record<string, IconName> }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const item = width / state.routes.length;
  const x = useSharedValue(0);

  useEffect(() => {
    const target = state.index * item + (item - PILL_W) / 2;
    x.set(reduceMotion || item === 0 ? target : withSpring(target, motion.spring));
  }, [state.index, item, reduceMotion, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View accessibilityRole="tablist" style={[styles.bar, shadow.elevated]} onLayout={(e) => setWidth(e.nativeEvent.layout.width - INSET * 2)}>
        {item > 0 ? <Animated.View style={[styles.pill, pill]} /> : null}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;
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
              onPress={onPress}
              style={styles.item}
            >
              <TabIcon name={icons[route.name] ?? 'home'} focused={focused} />
              <AppText variant="captionStrong" color={focused ? ink.text : ink.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
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
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (focused && !reduceMotion) scale.set(withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, motion.spring)));
  }, [focused, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.iconWrap, style]}>
      <Icon name={name} color={focused ? ink.mint : ink.muted} size={23} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, backgroundColor: colors.background },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.tabBar,
    paddingHorizontal: INSET,
    borderRadius: radius.modal,
    backgroundColor: palette.glass,
    ...border.hairline,
  },
  pill: {
    position: 'absolute',
    top: 8,
    left: INSET,
    width: PILL_W,
    height: PILL_H,
    borderRadius: 18,
    backgroundColor: palette.mintPale,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: touch.tabBar - 8, paddingTop: 8, paddingHorizontal: 2 },
  iconWrap: { height: PILL_H, justifyContent: 'center' },
});
