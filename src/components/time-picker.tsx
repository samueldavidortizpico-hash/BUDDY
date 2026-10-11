/**
 * Selector de hora en rueda (hora · minutos · a.m./p.m.) dentro de una hoja inferior.
 * - Franja central menta, hora grande en vivo arriba, ítems que escalan y se desvanecen con la distancia (hilo de UI).
 * - Alternativa accesible: botones −/+ (hora y 5 minutos) y la rueda expuesta como control ajustable.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { addMinutes, fromParts, toParts } from '@/domain/time';
import { strings } from '@/i18n';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';
import { tapHaptic } from '@/utils/haptics';

import { AppText } from './app-text';
import { Button } from './button';
import { BottomSheet } from './feedback';
import { Icon } from './icon';

const ROW = touch.timeRow; // 56
const VISIBLE = 5;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PERIOD = ['a. m.', 'p. m.'];

/** Campo que muestra una hora y abre la rueda. */
export function TimeField({ label, value, onChange, onRemove }: { label: string; value: string; onChange: (v: string) => void; onRemove?: () => void }) {
  const t = useTheme();
  const s = useStyles();
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={s.fieldRow}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatClock(value)}`}
          accessibilityHint={strings.time.hint}
          style={({ pressed }) => [s.field, pressed && { opacity: 0.8 }]}
        >
          <Icon name="clock" color={t.ink.mint} />
          <View style={s.flex}>
            <AppText variant="caption" color={t.c.muted}>
              {label}
            </AppText>
            <AppText variant="h3" style={s.tabular}>
              {formatClock(value)}
            </AppText>
          </View>
          <Icon name="pencil" color={t.c.muted} size={20} />
        </Pressable>
        {onRemove ? (
          <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`${strings.common.delete} ${formatClock(value)}`} hitSlop={6} style={s.remove}>
            <Icon name="trash" color={t.ink.danger} size={20} />
          </Pressable>
        ) : null}
      </View>
      <TimeWheelPicker
        key={open ? 'open' : 'closed'}
        visible={open}
        title={label}
        value={value}
        onClose={() => setOpen(false)}
        onConfirm={(v) => {
          onChange(v);
          setOpen(false);
        }}
      />
    </>
  );
}

export function TimeWheelPicker({ visible, title, value, onClose, onConfirm }: { visible: boolean; title: string; value: string; onClose: () => void; onConfirm: (v: string) => void }) {
  const s = useStyles();
  const t = useTheme();
  // Se monta de nuevo cada vez que se abre (key en TimeField), así el borrador parte del valor actual.
  const [draft, setDraft] = useState(value);
  const parts = toParts(draft);
  const set = (patch: Partial<typeof parts>) => setDraft(fromParts({ ...parts, ...patch }));

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <AppText variant="heroL" align="center" style={s.tabular} accessibilityLiveRegion="polite">
        {formatClock(draft)}
      </AppText>
      <View style={s.wheels}>
        <View pointerEvents="none" style={s.band} />
        <Wheel items={HOURS.map(String)} index={parts.hour - 1} onIndex={(i) => set({ hour: i + 1 })} label={strings.time.hour} />
        <AppText variant="h2" style={s.colon}>
          :
        </AppText>
        <Wheel items={MINUTES.map((m) => String(m).padStart(2, '0'))} index={Math.round(parts.minute / 5) % 12} onIndex={(i) => set({ minute: i * 5 })} label={strings.time.minutes} />
        <Wheel items={PERIOD} index={parts.pm ? 1 : 0} onIndex={(i) => set({ pm: i === 1 })} label={strings.time.period} />
      </View>
      {/* Alternativa accesible y para teclado */}
      <View style={s.steps}>
        <StepButton icon="minus" label={strings.time.hourLess} onPress={() => setDraft(addMinutes(draft, -60))} />
        <StepButton icon="plus" label={strings.time.hourMore} onPress={() => setDraft(addMinutes(draft, 60))} />
        <StepButton icon="minus" label={strings.time.minLess} onPress={() => setDraft(addMinutes(draft, -5))} />
        <StepButton icon="plus" label={strings.time.minMore} onPress={() => setDraft(addMinutes(draft, 5))} />
      </View>
      <AppText variant="caption" color={t.c.muted} align="center">
        {strings.time.stepsNote}
      </AppText>
      <Button label={strings.common.save} onPress={() => onConfirm(draft)} haptic />
    </BottomSheet>
  );
}

function StepButton({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  return (
    <Pressable
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [s.step, pressed && { opacity: 0.7 }]}
    >
      <Icon name={icon} color={t.c.text} size={18} />
      <AppText variant="caption">{label.replace(/^(Menos|Más) /, '')}</AppText>
    </Pressable>
  );
}

function Wheel({ items, index, onIndex, label }: { items: string[]; index: number; onIndex: (i: number) => void; label: string }) {
  const s = useStyles();
  const ref = useRef<Animated.ScrollView>(null);
  const y = useSharedValue(index * ROW);
  const last = useRef(index);

  useEffect(() => {
    if (index !== last.current) {
      last.current = index;
      ref.current?.scrollTo({ y: index * ROW, animated: true });
    }
  }, [index]);

  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });

  const commit = (offset: number) => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(offset / ROW)));
    if (i !== last.current) {
      last.current = i;
      tapHaptic();
      onIndex(i);
    }
    if (Platform.OS === 'web') ref.current?.scrollTo({ y: i * ROW, animated: true });
  };
  const end = (e: NativeSyntheticEvent<NativeScrollEvent>) => commit(e.nativeEvent.contentOffset.y);

  return (
    <View
      style={s.wheel}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onIndex((index + (e.nativeEvent.actionName === 'increment' ? 1 : items.length - 1)) % items.length)}
    >
      <Animated.ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: index * ROW }}
        contentContainerStyle={{ paddingVertical: ROW * ((VISIBLE - 1) / 2) }}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={end}
        onScrollEndDrag={end}
      >
        {items.map((it, i) => (
          <WheelItem key={it} label={it} i={i} y={y} />
        ))}
      </Animated.ScrollView>
      {Platform.OS === 'web' ? <WebScrollEnd onEnd={(off) => commit(off)} y={y} /> : null}
    </View>
  );
}

/** En web, confirma el valor cuando el desplazamiento se detiene (no hay "momentum end" fiable). */
function WebScrollEnd({ y, onEnd }: { y: SharedValue<number>; onEnd: (offset: number) => void }) {
  useEffect(() => {
    let last = -1;
    let still = 0;
    const id = setInterval(() => {
      const v = y.get();
      if (Math.abs(v - last) < 0.5) {
        still++;
        if (still === 2) onEnd(v);
      } else still = 0;
      last = v;
    }, 120);
    return () => clearInterval(id);
  }, [y, onEnd]);
  return null;
}

function WheelItem({ label, i, y }: { label: string; i: number; y: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(y.value / ROW - i);
    return { opacity: interpolate(d, [0, 1, 2.5], [1, 0.55, 0.15], 'clamp'), transform: [{ scale: interpolate(d, [0, 1, 2.5], [1.12, 0.92, 0.75], 'clamp') }] };
  });
  return (
    <Animated.View style={[{ height: ROW, alignItems: 'center', justifyContent: 'center' }, style]}>
      <AppText variant="h2" accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </AppText>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    tabular: { fontVariant: ['tabular-nums'] },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    field: {
      flex: 1,
      minHeight: touch.timeRow + 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.input,
      backgroundColor: t.c.surface,
      ...t.hairline,
    },
    remove: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
    wheels: { height: ROW * VISIBLE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    band: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: ROW * ((VISIBLE - 1) / 2),
      height: ROW,
      borderRadius: radius.button,
      backgroundColor: t.hc ? t.c.bg : t.c.mintPale,
      borderWidth: 2,
      borderColor: t.hc ? t.c.text : t.c.mint,
    },
    wheel: { width: 76, height: ROW * VISIBLE },
    colon: { marginHorizontal: -4 },
    steps: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
    step: {
      minHeight: touch.min,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: t.c.surface,
      ...t.hairline,
    },
  }),
);
