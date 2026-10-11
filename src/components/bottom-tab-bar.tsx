import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ink, motion, palette, spacing } from '@/theme';
import { tapHaptic } from '@/utils/haptics';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

const PILL_W = 64;
const PILL_H = 36;

/** Barra de pestañas propia: alto 88, etiqueta siempre visible y píldora mint-pale que se desliza. */
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
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 14) }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - spacing.xs * 2)}
    >
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
            <View style={styles.iconWrap}>
              <Icon name={icons[route.name] ?? 'home'} color={focused ? ink.mint : ink.muted} size={23} />
            </View>
            <AppText
              variant="captionStrong"
              color={focused ? ink.text : ink.muted}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopWidth: 1,
    borderTopColor: palette.line,
    minHeight: 88,
  },
  pill: {
    position: 'absolute',
    top: 10,
    left: spacing.xs,
    width: PILL_W,
    height: PILL_H,
    borderRadius: 18,
    backgroundColor: palette.mintPale,
  },
  item: { flex: 1, alignItems: 'center', gap: 4, minHeight: 56, paddingHorizontal: 2 },
  iconWrap: { height: PILL_H, justifyContent: 'center' },
});
