/** Controles de formulario: Field, Checkbox, Chip, ChipList (texto libre + sugerencias), Segmented, Stepper. */
import { useEffect, useState, type ReactNode, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type KeyboardTypeOptions, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { strings } from '@/i18n';
import { motion, radius, spacing, touch, type, type Tone } from '@/theme';
import { makeStyles, useTextScaleFactor, useTheme } from '@/theme/provider';
import { tapHaptic } from '@/utils/haptics';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

// ── Field ────────────────────────────────────────────────────

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
  icon?: IconName;
  /** Contraseña con botón mostrar/ocultar. */
  secure?: boolean;
  optional?: boolean;
  keyboardType?: KeyboardTypeOptions;
  inputRef?: Ref<TextInput>;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Field({ label, error, hint, icon, secure, optional, inputRef, right, style, multiline, onFocus, onBlur, ...input }: FieldProps) {
  const t = useTheme();
  const s = useStyles();
  const scale = useTextScaleFactor();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? t.ink.danger : focused ? t.c.focus : t.hc ? t.c.text : t.c.border;
  return (
    <View style={[s.field, style]}>
      <View style={s.labelRow}>
        <AppText variant="secondaryStrong">{label}</AppText>
        {optional ? (
          <AppText variant="caption" color={t.c.muted}>
            {strings.common.optional}
          </AppText>
        ) : null}
      </View>
      <View style={[s.inputBox, { borderColor, borderWidth: focused || error || t.hc ? 2 : 1 }, multiline && s.multiBox]}>
        {icon ? <Icon name={icon} color={t.c.muted} /> : null}
        <TextInput
          ref={inputRef}
          {...input}
          multiline={multiline}
          secureTextEntry={secure && hidden}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          aria-invalid={!!error}
          placeholderTextColor={t.dark ? '#7F99A0' : '#7A8797'}
          selectionColor={t.c.mintStrong}
          allowFontScaling
          maxFontSizeMultiplier={2 / scale}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[s.input, { fontSize: type.body.fontSize * scale, color: t.c.text }, multiline && s.multi]}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? strings.auth.show : strings.auth.hide}
            hitSlop={8}
            style={s.eye}
          >
            <Icon name={hidden ? 'eye' : 'eyeOff'} color={t.c.muted} />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? (
        <View style={s.errorRow} accessibilityLiveRegion="polite">
          <Icon name="warning" size={18} color={t.ink.danger} />
          <AppText variant="caption" color={t.ink.danger} style={s.flex}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" color={t.c.muted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

// ── Checkbox ─────────────────────────────────────────────────

export function Checkbox({ checked, onChange, label, error }: { checked: boolean; onChange: (v: boolean) => void; label: string; error?: string | null }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <View style={s.field}>
      <Pressable
        onPress={() => {
          tapHaptic();
          onChange(!checked);
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={label}
        style={s.checkRow}
      >
        <View style={[s.box, checked && { backgroundColor: t.hc ? t.c.text : t.c.mintStrong, borderColor: t.hc ? t.c.text : t.c.mintStrong }, error && { borderColor: t.ink.danger }]}>
          {checked ? <Icon name="check" size={18} color={t.hc ? t.c.bg : '#FFFFFF'} strokeWidth={3} /> : null}
        </View>
        <AppText variant="secondary" style={s.flex}>
          {label}
        </AppText>
      </Pressable>
      {error ? (
        <AppText variant="caption" color={t.ink.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

// ── Chip ─────────────────────────────────────────────────────

export function Chip({
  label,
  selected,
  onPress,
  tone = 'mint',
  icon,
  onRemove,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: Tone;
  icon?: IconName;
  onRemove?: () => void;
}) {
  const t = useTheme();
  const s = useStyles();
  const tn = t.tones[tone];
  const fg = selected ? (t.hc ? t.c.bg : tn.fg) : t.c.text;
  return (
    <PressableScale
      haptic
      onPress={onRemove ?? onPress}
      accessibilityRole={onRemove ? 'button' : 'checkbox'}
      accessibilityState={onRemove ? undefined : { checked: !!selected }}
      accessibilityLabel={onRemove ? `${strings.common.delete} ${label}` : label}
      style={[
        s.chip,
        selected
          ? { backgroundColor: t.hc ? t.c.text : tn.bg, borderColor: t.hc ? t.c.text : tn.fg, borderWidth: t.hc ? 2 : 1.5 }
          : { backgroundColor: t.c.surface, ...t.hairline },
      ]}
    >
      {selected && !onRemove ? <Icon name="check" size={16} color={fg} strokeWidth={2.6} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <AppText variant="captionStrong" color={fg}>
        {label}
      </AppText>
      {onRemove ? <Icon name="close" size={16} color={fg} /> : null}
    </PressableScale>
  );
}

/** Lista de textos libres con sugerencias en chips (alergias, condiciones, restricciones…). */
export function ChipList({
  label,
  values,
  onChange,
  suggestions = [],
  placeholder,
  hint,
  tone = 'mint',
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  hint?: string;
  tone?: Tone;
}) {
  const s = useStyles();
  const [text, setText] = useState('');
  const add = (v: string) => {
    const clean = v.trim();
    if (clean && !values.some((x) => x.toLowerCase() === clean.toLowerCase())) onChange([...values, clean]);
    setText('');
  };
  const pending = suggestions.filter((sg) => !values.some((v) => v.toLowerCase() === sg.toLowerCase()));
  return (
    <View style={s.field}>
      <Field
        label={label}
        optional
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        hint={hint}
        returnKeyType="done"
        onSubmitEditing={() => add(text)}
        blurOnSubmit={false}
        right={
          text.trim() ? (
            <Pressable onPress={() => add(text)} accessibilityRole="button" accessibilityLabel={`${strings.common.add} ${text}`} hitSlop={8} style={s.eye}>
              <Icon name="plus" />
            </Pressable>
          ) : null
        }
      />
      {values.length ? (
        <View style={s.wrap}>
          {values.map((v) => (
            <Chip key={v} label={v} selected tone={tone} onRemove={() => onChange(values.filter((x) => x !== v))} />
          ))}
        </View>
      ) : null}
      {pending.length ? (
        <View style={s.wrap}>
          {pending.map((sg) => (
            <Chip key={sg} label={sg} icon="plus" onPress={() => add(sg)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Segmented ────────────────────────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  scroll,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** Opciones del ancho de su texto en una fila desplazable (para 5+ opciones o palabras largas). */
  scroll?: boolean;
}) {
  if (scroll) return <ScrollSegmented options={options} value={value} onChange={onChange} label={label} />;
  return <EqualSegmented options={options} value={value} onChange={onChange} label={label} />;
}

/**
 * Variante desplazable: cada opción mide lo que su texto, así una palabra larga ("Medicamentos") nunca se parte por
 * letras como pasaba con anchos iguales.
 */
function ScrollSegmented<T extends string>({ options, value, onChange, label }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const t = useTheme();
  const s = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel={label} contentContainerStyle={s.scrollSegment}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              tapHaptic();
              onChange(o.key);
            }}
            style={[s.scrollItem, on && s.scrollItemOn]}
          >
            <AppText variant="captionStrong" color={on ? (t.hc ? t.c.bg : t.c.text) : t.c.muted} numberOfLines={1} maxScale={1.5}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function EqualSegmented<T extends string>({ options, value, onChange, label }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const t = useTheme();
  const s = useStyles();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const item = width / options.length;
  const x = useSharedValue(0);
  useEffect(() => {
    x.set(reduce || !item ? index * item : withSpring(index * item, motion.spring));
  }, [index, item, reduce, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={s.segment} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}>
      {item ? <Animated.View style={[s.segmentPill, { width: item }, pill]} /> : null}
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              tapHaptic();
              onChange(o.key);
            }}
            style={s.segmentItem}
          >
            <AppText variant="captionStrong" color={on ? (t.hc ? t.c.bg : t.c.text) : t.c.muted} align="center" numberOfLines={2} maxScale={1.5}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Stepper ──────────────────────────────────────────────────

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  format = (v: number) => String(v),
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const t = useTheme();
  const s = useStyles();
  const set = (v: number) => {
    tapHaptic();
    onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  };
  return (
    <View style={s.stepper} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? step : -step))}
    >
      <AppText variant="secondaryStrong" style={s.flex}>
        {label}
      </AppText>
      <Pressable onPress={() => set(value - step)} disabled={value <= min} accessibilityLabel={`Menos ${label}`} style={[s.stepBtn, value <= min && s.disabled]}>
        <Icon name="minus" color={t.c.text} />
      </Pressable>
      <AppText variant="h3" style={s.stepValue} align="center">
        {format(value)}
      </AppText>
      <Pressable onPress={() => set(value + step)} disabled={value >= max} accessibilityLabel={`Más ${label}`} style={[s.stepBtn, value >= max && s.disabled]}>
        <Icon name="plus" color={t.c.text} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    field: { gap: spacing.xs },
    labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.xs },
    inputBox: {
      minHeight: touch.timeRow,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.input,
      backgroundColor: t.c.surface,
    },
    multiBox: { alignItems: 'flex-start', paddingVertical: spacing.sm },
    // minWidth 0: en web un TextInput no se encoge por debajo de su ancho propio y con texto grande empujaba el ojo de
    // la contraseña fuera de la pantalla.
    input: { flex: 1, minWidth: 0, fontFamily: 'Manrope_600SemiBold', minHeight: touch.min, paddingVertical: spacing.xs },
    multi: { minHeight: 96, textAlignVertical: 'top' },
    eye: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.xs },
    errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxs },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: touch.min },
    box: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: t.hc ? t.c.text : t.dark ? '#7F99A0' : '#8A9AA8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
      minHeight: touch.chip,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
    },
    segment: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: radius.pill,
      backgroundColor: t.c.surface2,
      ...(t.hc ? t.hairline : {}),
    },
    segmentPill: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      left: 4,
      borderRadius: radius.pill,
      backgroundColor: t.hc ? t.c.text : t.c.surface,
      ...t.shadow.soft,
    },
    scrollSegment: { gap: spacing.xs, padding: 4, borderRadius: radius.pill, backgroundColor: t.c.surface2 },
    scrollItem: { minHeight: touch.chip, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill },
    scrollItemOn: { backgroundColor: t.hc ? t.c.text : t.c.mintPale, borderWidth: t.hc ? 2 : 0, borderColor: t.c.text },
    segmentItem: { flex: 1, minHeight: touch.chip, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: touch.timeRow,
      paddingHorizontal: spacing.md,
      borderRadius: radius.input,
      backgroundColor: t.c.surface,
      ...t.hairline,
    },
    stepBtn: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.c.surface2, ...(t.hc ? t.hairline : {}) },
    stepValue: { minWidth: 56 },
    disabled: { opacity: 0.4 },
  }),
);
