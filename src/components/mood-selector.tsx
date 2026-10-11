import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';

import type { MoodKey } from '@/types/domain';
import { ink, motion, palette, radius, shadow, spacing, tones, type Tone } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

/** Colores e iconos del Figma (amarillo, menta, cielo, lavanda, coral, rojo). */
export const MOOD_VISUAL: Record<MoodKey, { tone: Tone; icon: IconName }> = {
  excellent: { tone: 'yellow', icon: 'heart' },
  good: { tone: 'mint', icon: 'check' },
  regular: { tone: 'sky', icon: 'clock' },
  tired: { tone: 'lavender', icon: 'care' },
  sad: { tone: 'coral', icon: 'warning' },
  bad: { tone: 'red', icon: 'plus' },
};

function MoodOption({
  moodKey,
  label,
  selected,
  onPress,
}: {
  moodKey: MoodKey;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { tone, icon } = MOOD_VISUAL[moodKey];
  const t = tones[tone];
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.set(reduceMotion ? 0 : withSpring(selected ? -3 : 0, motion.spring));
  }, [selected, reduceMotion, lift]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  return (
    <Animated.View style={[styles.cell, anim]}>
      <PressableScale
        haptic
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected }}
        style={[styles.option, selected ? [{ borderColor: t.solid }, shadow.soft] : null]}
      >
        <View style={[styles.iconBox, { backgroundColor: t.bg }]}>
          <Icon name={icon} color={t.fg} size={24} />
        </View>
        <AppText variant="secondaryStrong" color={selected ? t.fg : ink.text} align="center">
          {label}
        </AppText>
        {selected ? (
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.check}>
            <Icon name="check" size={14} color={ink.inverse} strokeWidth={2.4} />
          </Animated.View>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

export function MoodSelector({
  options,
  value,
  onChange,
}: {
  options: { key: MoodKey; label: string }[];
  value: MoodKey | null;
  onChange: (key: MoodKey) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="¿Cómo te sientes?" style={styles.grid}>
      {options.map((o) => (
        <MoodOption key={o.key} moodKey={o.key} label={o.label} selected={value === o.key} onPress={() => onChange(o.key)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '31%', flexGrow: 1 },
  option: {
    minHeight: 108,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    boxShadow: '0px 4px 14px rgba(23, 74, 89, 0.05)',
  },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: palette.petrol,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
