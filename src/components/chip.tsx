import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { ink, motion, palette, radius, shadow, spacing, touch } from '@/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** radio: elección única; checkbox: múltiple; button: acción. */
  role?: 'radio' | 'checkbox' | 'button';
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected = false, onPress, icon, role = 'radio', accessibilityHint, style }: ChipProps) {
  const color = selected ? ink.inverse : ink.text;
  return (
    <PressableScale
      haptic
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={role === 'button' ? undefined : { checked: selected }}
      style={[styles.chip, selected ? styles.chipOn : styles.chipOff, style]}
    >
      {selected && role !== 'button' ? <Icon name="check" size={18} color={color} /> : null}
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <AppText variant="secondaryStrong" color={color}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export interface SegmentOption<K extends string> {
  key: K;
  label: string;
}

export interface SegmentedControlProps<K extends string> {
  options: SegmentOption<K>[];
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

/** Control segmentado con indicador blanco que se desliza (transform). */
export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<K>) {
  const [width, setWidth] = useState(0);
  const reduceMotion = useReducedMotion();
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(reduceMotion ? index * segment : withSpring(index * segment, motion.spring));
  }, [index, segment, reduceMotion, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.segmented, style]}
    >
      {segment > 0 ? <Animated.View style={[styles.indicator, { width: segment }, indicator]} /> : null}
      {options.map((o) => {
        const active = o.key === value;
        return (
          <PressableScale
            key={o.key}
            haptic
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.key)}
            style={styles.segment}
          >
            <AppText variant="secondaryStrong" color={active ? ink.text : ink.muted} align="center">
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const PAD = 4;

const styles = StyleSheet.create({
  chip: {
    minHeight: touch.min,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
  },
  chipOn: { backgroundColor: palette.petrol, borderColor: palette.petrol },
  chipOff: { backgroundColor: palette.white, borderColor: palette.line },
  segmented: {
    flexDirection: 'row',
    backgroundColor: palette.segment,
    borderRadius: radius.md,
    padding: PAD,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.sm,
    backgroundColor: palette.white,
    ...shadow.soft,
  },
  segment: {
    flex: 1,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
});
