import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTextScale } from '@/features/profile/hooks';
import type { ClockTime, ISODate } from '@/types/domain';
import { fonts, ink, palette, radius, spacing, touch } from '@/theme';
import { addDays, clockToMinutes, formatClock, formatRelativeDay, minutesToClock, parseISODate, MONTHS, DAYS } from '@/utils/dates';

import { AppText } from './app-text';
import { Chip } from './chip';
import { Icon, type IconName } from './icon';

function Label({ text, optional }: { text: string; optional?: boolean }) {
  return (
    <AppText variant="captionStrong" color={ink.text}>
      {text}
      {optional ? (
        <AppText variant="caption" color={ink.muted}>
          {'  ·  Opcional'}
        </AppText>
      ) : null}
    </AppText>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <View style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Icon name="warning" size={18} color={ink.coral} />
      <AppText variant="caption" color={ink.coral} style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon?: IconName;
  error?: string;
  hint?: string;
  optional?: boolean;
}

/** Campo de texto con etiqueta visible, icono opcional y error junto al campo. */
export function Field({ label, icon, error, hint, optional, multiline, ...input }: FieldProps) {
  const scale = useTextScale();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Label text={label} optional={optional} />
      <View
        style={[
          styles.shell,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.invalid,
        ]}
      >
        {icon ? <Icon name={icon} color={ink.mint} /> : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          aria-invalid={!!error}
          placeholderTextColor={ink.muted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { fontSize: 17 * scale }, multiline && styles.inputMultiline]}
          {...input}
        />
      </View>
      {error ? <ErrorText text={error} /> : hint ? (
        <AppText variant="caption" color={ink.muted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function TextArea(props: FieldProps) {
  return <Field multiline numberOfLines={4} {...props} />;
}

/** Selector de hora con botones grandes (sin teclado ni rueda): ±1 h y ±15 min. */
export function TimeField({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: ClockTime;
  onChange: (t: ClockTime) => void;
  onRemove?: () => void;
}) {
  const shift = (min: number) => onChange(minutesToClock(clockToMinutes(value) + min));
  return (
    <View style={styles.field}>
      <Label text={label} />
      <View style={[styles.shell, styles.stepper]}>
        <Icon name="clock" color={ink.mint} />
        <AppText variant="h3" style={styles.flex} accessibilityLiveRegion="polite">
          {formatClock(value)}
        </AppText>
        {onRemove ? <Chip role="button" label="Quitar" icon="close" onPress={onRemove} /> : null}
      </View>
      <View style={styles.steps}>
        <Chip role="button" label="−1 h" onPress={() => shift(-60)} accessibilityHint="Una hora antes" />
        <Chip role="button" label="−15 min" onPress={() => shift(-15)} accessibilityHint="Quince minutos antes" />
        <Chip role="button" label="+15 min" onPress={() => shift(15)} accessibilityHint="Quince minutos después" />
        <Chip role="button" label="+1 h" onPress={() => shift(60)} accessibilityHint="Una hora después" />
      </View>
    </View>
  );
}

function longDate(iso: ISODate): string {
  const d = parseISODate(iso);
  return d ? `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}` : iso;
}

/** Selector de fecha con botones de día anterior / siguiente. */
export function DateField({
  label,
  value,
  today,
  onChange,
  optional,
  error,
  emptyLabel = 'Sin fecha',
}: {
  label: string;
  value: ISODate | null;
  today: ISODate;
  onChange: (d: ISODate | null) => void;
  optional?: boolean;
  error?: string;
  emptyLabel?: string;
}) {
  const current = value ?? today;
  return (
    <View style={styles.field}>
      <Label text={label} optional={optional} />
      <View style={[styles.shell, styles.stepper, !!error && styles.invalid]}>
        <Icon name="calendar" color={ink.mint} />
        <View style={styles.flex} accessible accessibilityLabel={`${label}: ${value ? longDate(value) : emptyLabel}`}>
          <AppText variant="bodyStrong">{value ? formatRelativeDay(value, today) : emptyLabel}</AppText>
          {value ? (
            <AppText variant="caption" color={ink.muted}>
              {longDate(value)}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.steps}>
        {value ? (
          <>
            <Chip role="button" label="Día anterior" onPress={() => onChange(addDays(current, -1))} />
            <Chip role="button" label="Día siguiente" onPress={() => onChange(addDays(current, 1))} />
            {optional ? <Chip role="button" label="Quitar" icon="close" onPress={() => onChange(null)} /> : null}
          </>
        ) : (
          <Chip role="button" label="Elegir fecha" icon="plus" onPress={() => onChange(addDays(today, 30))} />
        )}
      </View>
      {error ? <ErrorText text={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: spacing.xs },
  shell: {
    minHeight: touch.primary,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.sm, minHeight: 112 },
  focused: { borderColor: palette.mintDeep, borderWidth: 2 },
  invalid: { borderColor: ink.coral, borderWidth: 2 },
  input: {
    flex: 1,
    minHeight: touch.min,
    color: ink.text,
    fontFamily: fonts.semibold,
    paddingVertical: spacing.xs,
  },
  inputMultiline: { minHeight: 88 },
  error: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  stepper: { paddingVertical: spacing.xs },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  radius: { borderRadius: radius.md },
});
