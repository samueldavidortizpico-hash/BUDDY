import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Notice, StatusBadge } from '@/components/blocks';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { SuccessBurst, useToast } from '@/components/feedback';
import { DateField, Field, TextArea, TimeField } from '@/components/field';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import {
  doseLabel,
  emptyDraft,
  FORMS,
  FREQUENCIES,
  medicationActions,
  STRENGTH_UNITS,
  useMedications,
  validateDraft,
  type DraftErrors,
  type MedicationDraft,
} from '@/features/medications/hooks';
import { ink, palette, radius, spacing } from '@/theme';
import { clockToMinutes, minutesToClock, toISODate } from '@/utils/dates';
import { successHaptic, warningHaptic } from '@/utils/haptics';

function Group({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="captionStrong">{label}</AppText>
      {hint ? (
        <AppText variant="caption" color={ink.muted}>
          {hint}
        </AppText>
      ) : null}
      <View style={styles.chips}>{children}</View>
      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Icon name="warning" size={18} color={ink.coral} />
          <AppText variant="caption" color={ink.coral} style={styles.flex}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export default function AddMedication() {
  const router = useRouter();
  const toast = useToast();
  const today = toISODate(new Date());
  const meds = useMedications();
  const [draft, setDraft] = useState<MedicationDraft>(() => emptyDraft(today));
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const { errors, warnings } = validateDraft(draft, meds, today);
  const shown: DraftErrors = submitted ? errors : {};
  const set = <K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const close = () => (router.canGoBack() ? router.back() : router.replace('/medications'));

  const save = () => {
    setSubmitted(true);
    const result = medicationActions.add(draft);
    if (!result.ok) {
      warningHaptic();
      toast({ message: `Revisa ${Object.keys(result.errors).length} campo(s) marcados en rojo.`, icon: 'warning' });
      return;
    }
    successHaptic();
    setSaved(result.medication.name);
  };

  if (saved) {
    return (
      <ScreenContainer header={<ScreenHeader title="Agregar medicamento" showBack={false} />}>
        <SuccessBurst
          title="Medicamento guardado"
          text={`${saved} ya aparece en tu lista y en tus tomas de hoy. Las notificaciones del teléfono llegarán próximamente.`}
        >
          <Button label="Ver mis medicamentos" onPress={close} />
          <Button
            label="Agregar otro"
            variant="secondary"
            onPress={() => {
              setDraft(emptyDraft(today));
              setSubmitted(false);
              setSaved(null);
            }}
          />
        </SuccessBurst>
      </ScreenContainer>
    );
  }

  const nextTime = draft.times.length ? minutesToClock(clockToMinutes(draft.times[draft.times.length - 1]) + 4 * 60) : '08:00';

  return (
    <ScreenContainer keyboard header={<ScreenHeader title="Agregar medicamento" backLabel="Cancelar" onBack={close} />}>
      <View style={styles.form}>
        <Notice text="Escribe los datos tal como aparecen en tu fórmula o en la caja. BUDDY no verifica dosis ni interacciones." />

        <Field
          label="Nombre del medicamento"
          icon="meds"
          placeholder="Ej.: Losartán"
          value={draft.name}
          onChangeText={(v) => set('name', v)}
          error={shown.name}
          autoCapitalize="sentences"
          returnKeyType="next"
        />

        <View style={styles.group}>
          <Field
            label="Concentración"
            placeholder="Ej.: 50"
            keyboardType="decimal-pad"
            value={draft.strengthValue}
            onChangeText={(v) => set('strengthValue', v)}
            error={shown.strengthValue}
            hint="Cuánto principio activo trae cada unidad. Viene impreso en la caja."
          />
          <View style={styles.chips} accessibilityLabel="Unidad de la concentración">
            {STRENGTH_UNITS.map((u) => (
              <Chip key={u} label={u} selected={draft.strengthUnit === u} onPress={() => set('strengthUnit', u)} />
            ))}
          </View>
        </View>

        <Group label="Presentación" error={shown.form}>
          {FORMS.map((f) => (
            <Chip key={f.key} label={f.key} selected={draft.form === f.key} onPress={() => set('form', f.key)} />
          ))}
        </Group>

        <Field
          label={draft.form ? `Dosis (${doseLabel({ doseAmount: '2', form: draft.form }).replace(/^2 /, '')} por toma)` : 'Dosis por toma'}
          placeholder="Ej.: 1"
          keyboardType="decimal-pad"
          value={draft.doseAmount}
          onChangeText={(v) => set('doseAmount', v)}
          error={shown.doseAmount}
          hint="Cuánto tomas cada vez. Es distinto de la concentración."
        />

        <Group label="Frecuencia">
          {FREQUENCIES.map((f) => (
            <Chip key={f.key} label={f.label} selected={draft.frequency === f.key} onPress={() => set('frequency', f.key)} />
          ))}
        </Group>

        {draft.frequency === 'as_needed' ? (
          <Notice icon="bell" text="Con “Solo si lo necesito” BUDDY no programa recordatorios para este medicamento." />
        ) : (
          <View style={styles.group}>
            {draft.times.map((t, i) => (
              <TimeField
                key={`${i}-${draft.times.length}`}
                label={`Hora de la toma ${i + 1}`}
                value={t}
                onChange={(v) => set('times', draft.times.map((x, j) => (j === i ? v : x)))}
                onRemove={() => set('times', draft.times.filter((_, j) => j !== i))}
              />
            ))}
            <Button
              label={draft.times.length ? 'Agregar otra hora' : 'Agregar hora de toma'}
              variant="secondary"
              icon="plus"
              onPress={() => set('times', [...draft.times, nextTime])}
            />
            {shown.times ? (
              <View style={styles.error} accessibilityRole="alert">
                <Icon name="warning" size={18} color={ink.coral} />
                <AppText variant="caption" color={ink.coral} style={styles.flex}>
                  {shown.times}
                </AppText>
              </View>
            ) : null}
          </View>
        )}

        <TextArea
          label="Indicaciones"
          optional
          placeholder="Ej.: Después del desayuno"
          value={draft.instructions}
          onChangeText={(v) => set('instructions', v)}
        />

        <DateField label="Fecha de inicio" value={draft.startDate} today={today} onChange={(d) => set('startDate', d ?? today)} error={shown.startDate} />
        <DateField
          label="Fecha de fin"
          optional
          value={draft.endDate}
          today={today}
          emptyLabel="Sin fecha de fin"
          onChange={(d) => set('endDate', d)}
          error={shown.endDate}
        />

        <PressableScale
          onPress={() => toast({ message: 'La foto del envase estará disponible próximamente.', icon: 'camera' })}
          accessibilityLabel="Foto del envase. Próximamente"
          style={styles.photo}
        >
          <View style={styles.photoIcon}>
            <Icon name="camera" color={ink.mint} />
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Foto del envase</AppText>
            <AppText variant="caption" color={ink.muted}>
              Ayudará a identificarlo fácilmente
            </AppText>
          </View>
          <StatusBadge label="Próximamente" tone="slate" />
        </PressableScale>

        {warnings.map((w) => (
          <Notice key={w} icon="warning" text={w} />
        ))}
        {submitted && Object.keys(errors).length > 0 ? (
          <View style={styles.error} accessibilityRole="alert">
            <Icon name="warning" size={18} color={ink.coral} />
            <AppText variant="captionStrong" color={ink.coral} style={styles.flex}>
              {`Hay ${Object.keys(errors).length} campo(s) por revisar.`}
            </AppText>
          </View>
        ) : null}
        <Button label="Guardar medicamento" icon="check" onPress={save} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { gap: spacing.lg, paddingTop: spacing.xs },
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  error: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  photo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B7D2CB',
    backgroundColor: palette.white,
  },
  photoIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: palette.mintPale, alignItems: 'center', justifyContent: 'center' },
});
