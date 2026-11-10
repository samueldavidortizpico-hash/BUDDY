import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { radius, touch, type Domain } from '@/theme';
import { useTheme } from '@/theme/provider';

import { Icon, type IconName } from './icon';

/**
 * Mosaico de icono (V5): cuadro redondeado con el degradado vivo del dominio y el glifo en blanco (≥ 3:1 medido).
 * Aparece con un pequeño resorte, una sola vez. Decorativo: el texto de al lado lo nombra.
 */
export function IconTile({ icon, domain, size = touch.tile }: { icon: IconName; domain: Domain | 'petrol' | 'slate'; size?: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const tile = t.tiles[domain];
  const pop = useSharedValue(reduce ? 1 : 0.7);
  useEffect(() => {
    if (!reduce) pop.set(withSpring(1, { damping: 11, stiffness: 220 }));
  }, [reduce, pop]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  return (
    <Animated.View style={[styles.tile, { width: size, height: size, borderRadius: size >= 56 ? radius.iconLg : size >= 44 ? radius.icon - 2 : radius.tile, backgroundColor: tile.bg }, t.hc && t.hairline, style]}>
      {t.hc ? null : <LinearGradient colors={tile.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      <Icon name={icon} color={tile.fg} size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({ tile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' } });
