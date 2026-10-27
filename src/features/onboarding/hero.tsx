/**
 * Ilustraciones de las 4 presentaciones: el robot vectorial (nítido a cualquier tamaño) sobre una plataforma turquesa,
 * con fichas flotantes que cuentan el tema de cada una. Las fichas solo animan transform; con "reducir movimiento" quedan quietas.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { BuddyRobot, SoftEllipse, type RobotMood } from '@/components/robot';
import { radius } from '@/theme';
import { useTheme } from '@/theme/provider';

type Chip = { icon: IconName; tone: 'mint' | 'coral' | 'lavender' | 'sky' | 'yellow'; x: number; y: number };

const HEROES: { mood: RobotMood; chips: Chip[] }[] = [
  { mood: 'wave', chips: [] },
  { mood: 'happy', chips: [{ icon: 'meds', tone: 'coral', x: 0.04, y: 0.2 }, { icon: 'calendar', tone: 'sky', x: 0.72, y: 0.1 }, { icon: 'clock', tone: 'yellow', x: 0.74, y: 0.6 }] },
  { mood: 'love', chips: [{ icon: 'smile', tone: 'yellow', x: 0.05, y: 0.18 }, { icon: 'bed', tone: 'lavender', x: 0.74, y: 0.18 }, { icon: 'heart', tone: 'coral', x: 0.74, y: 0.62 }] },
  { mood: 'celebrate', chips: [{ icon: 'users', tone: 'mint', x: 0.04, y: 0.2 }, { icon: 'shield', tone: 'sky', x: 0.74, y: 0.14 }, { icon: 'heart', tone: 'coral', x: 0.74, y: 0.62 }] },
];

export function Hero({ index, height }: { index: number; height: number }) {
  const t = useTheme();
  const { mood, chips } = HEROES[index];
  const robot = Math.round(height * 0.72);
  return (
    <View style={[styles.root, { height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.orb, { width: height * 1.1, height: height * 1.1, left: -height * 0.35, top: -height * 0.05 }]}>
        <SoftEllipse color={t.c.lavender} opacity={t.dark ? 0.22 : 0.3} />
      </View>
      <View style={[styles.orb, { width: height * 1.1, height: height * 1.1, right: -height * 0.35, top: height * 0.1 }]}>
        <SoftEllipse color={t.c.mint} opacity={t.dark ? 0.2 : 0.45} />
      </View>
      <View style={[styles.platform, { width: robot * 0.95, height: robot * 0.2, bottom: height * 0.005, backgroundColor: t.c.mintStrong }]} />
      <View style={[styles.platformTop, { width: robot * 0.78, height: robot * 0.14, bottom: height * 0.045, backgroundColor: t.c.mint }]} />
      <View style={[styles.robot, { bottom: height * 0.1 }]}>
        <BuddyRobot size={robot} mood={mood} shadow={false} sparkles navigationIndependent />
      </View>
      {chips.map((c, i) => (
        <FloatingChip key={`${index}-${c.icon}`} chip={c} height={height} delay={i * 350} />
      ))}
    </View>
  );
}

function FloatingChip({ chip, height, delay }: { chip: Chip; height: number; delay: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.set(withDelay(delay, withRepeat(withSequence(withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })), -1)));
    return () => cancelAnimation(y);
  }, [reduce, delay, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const size = Math.round(height * 0.2);
  const tone = t.c[chip.tone === 'mint' ? 'mintPale' : chip.tone === 'coral' ? 'coralPale' : chip.tone === 'lavender' ? 'lavenderPale' : 'surface'];
  const ink = chip.tone === 'mint' ? t.c.mintDeep : chip.tone === 'coral' ? t.c.coral : chip.tone === 'lavender' ? t.c.lavender : t.c.text;
  return (
    <Animated.View style={[styles.chip, { width: size, height: size, borderRadius: radius.icon, left: `${chip.x * 100}%`, top: `${chip.y * 100}%`, backgroundColor: tone }, t.shadow.soft, style]}>
      <Icon name={chip.icon} size={Math.round(size * 0.5)} color={ink} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center' },
  orb: { position: 'absolute' },
  platform: { position: 'absolute', borderRadius: 999 },
  platformTop: { position: 'absolute', borderRadius: 999, opacity: 0.9 },
  robot: { position: 'absolute', alignItems: 'center' },
  chip: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
