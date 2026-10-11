import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Notice, SectionHeader } from '@/components/blocks';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { useToast } from '@/components/feedback';
import { DateField, Field, TextArea, TimeField } from '@/components/field';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { INTENSITY_LABELS, SYMPTOMS, useSymptoms, wellbeingActions, type SymptomDraft } from '@/features/wellbeing/hooks';
import type { Intensity } from '@/types/domain';
import { ink, palette, radius, spacing, tones, touch, type Tone } from '@/theme';
import { formatClock, formatRelativeDay, toClock, toISODate } from '@/utils/dates';
import { successHaptic, warningHaptic } from '@/utils/haptics';

const LEVEL_TONE: Record<Intensity, Tone> = { 1: 'mint', 2: 'yellow', 3: 'coral' };

export default function Symptoms() {
  const router = useRouter();
  const toast = useToast();
  const today = toISODate(new Date());
  const recent = useSymptoms().slice(-3).reverse();
  const [draft, setDraft] = useState<SymptomDraft>(() => ({
    symptom: '',
    otherText: '',
    intensity: 1,
    date: today,
    time: toClock(new Date()),
    notes: '',
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof SymptomDraft, string>>>({});
  const set = <K extends keyof SymptomDraft>(k: K, v: SymptomDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const result = wellbeingActions.saveSymptom(draft);
    if (!result.ok) {
      warningHaptic();
      setErrors(result.errors);
      return;
    }
    successHaptic();
    toast({ message: 'Síntoma registrado. Queda en tu historial.', icon: 'check' });
    if (router.canGoBack()) router.back();
  };

  return (
    <ScreenContainer keyboard header={<ScreenHeader title="Registrar síntomas" />}>
      <View style={styles.stack}>
        <View style={styles.intro}>
          <AppText variant="h2">¿Qué estás sintiendo?</AppText>
          <AppText variant="secondary" color={ink.muted}>
            Selecciona un síntoma y su intensidad.
          </AppText>
        </View>

        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Síntoma">
          {SYMPTOMS.map((s) => (
            <Chip key={s} label={s} selected={draft.symptom === s} onPress={() => set('symptom', s)} />
          ))}
        </View>
        {errors.symptom ? (
          <AppText variant="caption" color={ink.coral} accessibilityRole="alert">
            {errors.symptom}
          </AppText>
        ) : null}
        {draft.symptom === 'Otro' ? (
          <Field label="¿Cuál?" placeholder="Describe el síntoma" value={draft.otherText} onChangeText={(v) => set('otherText', v)} error={errors.otherText} />
        ) : null}

        <Card style={styles.intensity}>
          <View style={styles.row}>
            <AppText variant="bodyStrong" style={styles.flex}>
              Intensidad
            </AppText>
            <AppText variant="secondaryStrong" color={tones[LEVEL_TONE[draft.intensity]].fg}>
              {INTENSITY_LABELS[draft.intensity]}
            </AppText>
          </View>
          <View style={styles.levels} accessibilityRole="radiogroup" accessibilityLabel="Intensidad">
            {([1, 2, 3] as Intensity[]).map((level) => {
              const active = draft.intensity >= level;
              const t = tones[LEVEL_TONE[level]];
              return (
                <PressableScale
                  key={level}
                  haptic
                  accessibilityRole="radio"
                  accessibilityLabel={INTENSITY_LABELS[level]}
                  accessibilityState={{ checked: draft.intensity === level }}
                  onPress={() => set('intensity', level)}
                  style={[styles.level, { backgroundColor: active ? t.bg : palette.slatePale }]}
                >
                  <View style={[styles.levelNum, { backgroundColor: active ? t.solid : palette.levelIdle }]}>
                    <AppText variant="captionStrong" color={ink.title}>
                      {level}
                    </AppText>
                  </View>
                  <AppText variant="captionStrong" color={active ? t.fg : ink.muted}>
                    {INTENSITY_LABELS[level]}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>
        </Card>

        <TimeField label="Hora" value={draft.time} onChange={(v) => set('time', v)} />
        <DateField label="Fecha" value={draft.date} today={today} onChange={(d) => set('date', d ?? today)} error={errors.date} />
        <TextArea label="Notas" optional placeholder="Describe brevemente lo que sientes…" value={draft.notes} onChangeText={(v) => set('notes', v)} />

        <Notice text="Este registro ayuda a tu seguimiento; no indica la causa de lo que sientes. Si el síntoma es intenso o urgente, contacta a un profesional o llama a la línea de emergencias 123." />
        <Button label="Guardar síntoma" icon="check" onPress={save} />

        {recent.length ? (
          <View style={styles.recent}>
            <SectionHeader title="Tus últimos registros" />
            {recent.map((s) => (
              <View key={s.id} style={styles.recentRow} accessible accessibilityLabel={`${s.symptom}, ${INTENSITY_LABELS[s.intensity]}, ${formatRelativeDay(s.date, today)}`}>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {s.symptom}
                </AppText>
                <AppText variant="caption" color={ink.muted}>
                  {`${INTENSITY_LABELS[s.intensity]} · ${formatRelativeDay(s.date, today)} ${formatClock(s.time)}`}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: spacing.lg, paddingTop: spacing.xs },
  intro: { gap: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  intensity: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  levels: { flexDirection: 'row', gap: spacing.xs },
  level: { flex: 1, minHeight: touch.primary + 8, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', gap: spacing.xxs, padding: spacing.xs },
  levelNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  recent: { gap: spacing.xs },
  recentRow: { backgroundColor: palette.white, borderRadius: radius.md, padding: spacing.md, gap: 2, borderWidth: 1, borderColor: palette.line },
});
