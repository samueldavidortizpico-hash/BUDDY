import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet, ConfirmDialog, useToast } from '@/components/feedback';
import { Chip, Field, Segmented, Stepper } from '@/components/forms';
import { Icon } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { TimeField } from '@/components/time-picker';
import { CONSULT_TEXT, NO_MATCH_TEXT, type ReviewFinding } from '@/domain/review';
import { amountText } from '@/domain/schedule';
import { WEEKDAY_SHORT, addMinutes, sortTimes } from '@/domain/time';
import type { DoseUnit, MedForm, Medication, Weekday } from '@/domain/types';
import { normalizeText, parseDecimal } from '@/domain/validation';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { medicationActions, type MedicationInput } from '@/state/care';
import { useActiveElder, useRecords, useUserId } from '@/state/data';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { parseISODate, toISODate } from '@/utils/dates';

const M = strings.meds;
const FORMS: MedForm[] = ['tablet', 'capsule', 'syrup', 'drops', 'cream', 'injection', 'patch', 'other'];
const AMOUNTS = [0.25, 0.5, 1, 1.5, 2, 3];
const INTERVALS = [4, 6, 8, 12, 24];

interface Draft {
  photoUri: string | null;
  name: string;
  activeIngredient: string;
  strength: string;
  form: MedForm;
  amount: number;
  amountText: string;
  customAmount: boolean;
  kind: 'times' | 'interval';
  times: string[];
  everyHours: number;
  from: string;
  days: Weekday[];
  continuous: boolean;
  endDay: string;
  endMonth: string;
  endYear: string;
  instructions: string;
  purpose: string;
  description: string;
  perPackage: string;
  onHand: string;
  alertDays: number;
}

function fromMedication(m: Medication | null, photo: string | null): Draft {
  const end = m?.endDate ? parseISODate(m.endDate) : null;
  return {
    photoUri: photo ?? m?.photoUri ?? null,
    name: m?.name ?? '',
    activeIngredient: m?.activeIngredient ?? '',
    strength: m?.strength ?? '',
    form: m?.form ?? 'tablet',
    amount: m?.doseAmount ?? 1,
    amountText: m ? String(m.doseAmount).replace('.', ',') : '',
    customAmount: !!m && (m.doseUnit !== 'unit' || !AMOUNTS.includes(m.doseAmount)),
    kind: m?.schedule.kind ?? 'times',
    times: m?.schedule.kind === 'times' ? m.schedule.times : ['08:00'],
    everyHours: m?.schedule.kind === 'interval' ? m.schedule.everyHours : 8,
    from: m?.schedule.kind === 'interval' ? m.schedule.from : '08:00',
    days: m?.schedule.days ?? [],
    continuous: !m?.endDate,
    endDay: end ? String(end.getDate()) : '',
    endMonth: end ? String(end.getMonth() + 1) : '',
    endYear: end ? String(end.getFullYear()) : '',
    instructions: m?.instructions ?? '',
    purpose: m?.purpose ?? '',
    description: m?.description ?? '',
    perPackage: m?.unitsPerPackage != null ? String(m.unitsPerPackage) : '',
    onHand: m?.unitsOnHand != null ? String(m.unitsOnHand).replace('.', ',') : '',
    alertDays: m?.refillAlertDays ?? 7,
  };
}

/** Crear o editar un medicamento. Todo lo define el cuidador; BUDDY solo compara lo escrito al guardar. */
export default function MedicationForm() {
  const router = useRouter();
  const toast = useToast();
  const t = useTheme();
  const s = useStyles();
  const params = useLocalSearchParams<{ id?: string; elderId?: string; mode?: string; photo?: string }>();
  const userId = useUserId() ?? '';
  const active = useActiveElder();
  const elderId = params.elderId ?? active?.id ?? null;
  const editing = params.id ? db.get('medications', params.id) ?? null : null;
  const others = useRecords('medications', { elderId });
  const draftKey = `med.${params.id ?? 'new'}`;
  const [d, setD] = useState<Draft>(() => db.draft<Draft>(userId, draftKey) ?? fromMedication(editing, params.photo ?? null));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [result, setResult] = useState<{ findings: ReviewFinding[]; id: string } | null>(null);

  const set = (patch: Partial<Draft>) => {
    setD((prev) => {
      const next = { ...prev, ...patch };
      db.setDraft(userId, draftKey, next);
      return next;
    });
    setDirty(true);
  };

  const duplicate = useMemo(() => {
    const n = normalizeText(d.name);
    if (n.length < 3) return null;
    return others.find((o) => o.id !== params.id && (normalizeText(o.name).includes(n) || n.includes(normalizeText(o.name))));
  }, [d.name, others, params.id]);

  if (params.mode === 'scan' && !params.photo && !params.id) {
    return <Redirect href={{ pathname: '/medication/scan', params: { elderId: elderId ?? '' } }} />;
  }

  const liquid = d.form === 'syrup';
  const drops = d.form === 'drops';
  const doseUnit: DoseUnit = liquid ? 'ml' : drops ? 'drops' : d.form === 'cream' ? 'application' : 'unit';

  const save = () => {
    const e: Record<string, string> = {};
    if (d.name.trim().length < 2) e.name = M.errors.name;
    const amount = d.customAmount || liquid || drops ? parseDecimal(d.amountText, 0.05, 500) : d.amount;
    if (amount === null) e.dose = M.errors.dose;
    if (d.kind === 'times' && !d.times.length) e.times = M.errors.times;
    let endDate: string | null = null;
    if (!d.continuous) {
      const iso = `${d.endYear}-${d.endMonth.padStart(2, '0')}-${d.endDay.padStart(2, '0')}`;
      endDate = parseISODate(iso) && iso >= toISODate(new Date()) ? iso : null;
      if (!endDate) e.end = M.errors.date;
    }
    const perPackage = d.perPackage.trim() ? parseDecimal(d.perPackage, 1, 10000) : null;
    const onHand = d.onHand.trim() ? parseDecimal(d.onHand, 0, 100000) : null;
    if (d.perPackage.trim() && perPackage === null) e.perPackage = M.errors.number;
    if (d.onHand.trim() && onHand === null) e.onHand = M.errors.number;
    setErrors(e);
    if (Object.keys(e).length || !elderId) return;
    const input: MedicationInput = {
      name: d.name.trim(),
      activeIngredient: d.activeIngredient.trim(),
      strength: d.strength.trim(),
      form: d.form,
      doseAmount: amount!,
      doseUnit,
      schedule: d.kind === 'times' ? { kind: 'times', times: sortTimes(d.times), days: d.days } : { kind: 'interval', everyHours: d.everyHours, from: d.from, days: d.days },
      startDate: editing?.startDate ?? toISODate(new Date()),
      endDate,
      instructions: d.instructions.trim(),
      purpose: d.purpose.trim(),
      description: d.description.trim(),
      unitsPerPackage: perPackage,
      unitsOnHand: onHand,
      refillAlertDays: d.alertDays,
      photoUri: d.photoUri,
      paused: editing?.paused ?? false,
    };
    const r = editing ? medicationActions.update(editing.id, input) : medicationActions.add(input, elderId);
    db.setDraft(userId, draftKey, undefined);
    setDirty(false);
    const id = editing?.id ?? ('med' in r ? r.med?.id : undefined) ?? '';
    setResult({ findings: r.findings, id });
  };

  const toggleDay = (day: Weekday) => set({ days: d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day] });

  return (
    <ScreenContainer
      keyboard
      header={<ScreenHeader title={editing ? M.editTitle : M.newTitle} onBack={() => (dirty ? setLeaving(true) : router.back())} fallback="/routine" />}
      footer={<Button label={M.save} icon="check" onPress={save} haptic />}
    >
      <View style={s.stack}>
        {d.photoUri ? (
          <Card style={s.photoCard}>
            <Image source={{ uri: d.photoUri }} style={s.photo} contentFit="cover" accessibilityLabel={M.photo} />
            <View style={s.flex}>
              <AppText variant="secondaryStrong">{M.photo}</AppText>
              <AppText variant="caption" color={t.c.muted}>
                {M.scanNote}
              </AppText>
              <Button label={M.retake} size="sm" variant="ghost" icon="camera" onPress={() => router.replace({ pathname: '/medication/scan', params: { elderId: elderId ?? '' } })} />
            </View>
          </Card>
        ) : null}

        <Field label={M.name} value={d.name} onChangeText={(v) => set({ name: v })} placeholder={M.namePlaceholder} error={errors.name} icon="meds" autoCapitalize="words" />
        {duplicate ? (
          <View style={s.warn}>
            <Icon name="warning" color={t.ink.yellow} size={20} />
            <AppText variant="caption" style={s.flex}>
              {M.duplicate(duplicate.name)}
            </AppText>
          </View>
        ) : null}
        <Field label={M.ingredient} optional value={d.activeIngredient} onChangeText={(v) => set({ activeIngredient: v })} hint={M.ingredientHint} />
        <Field label={M.strength} optional value={d.strength} onChangeText={(v) => set({ strength: v })} hint={M.strengthHint} placeholder="50 mg" />

        <Section title={M.form}>
          {FORMS.map((f) => (
            <Chip key={f} label={M.forms[f]} selected={d.form === f} tone="coral" onPress={() => set({ form: f })} />
          ))}
        </Section>

        <Section title={M.dose} hint={M.doseHint} error={errors.dose}>
          {liquid || drops ? null : (
            <>
              {AMOUNTS.map((a) => (
                <Chip key={a} label={amountText(a)} selected={!d.customAmount && d.amount === a} tone="coral" onPress={() => set({ amount: a, customAmount: false })} />
              ))}
              <Chip label={M.doseOther} selected={d.customAmount} tone="coral" onPress={() => set({ customAmount: true })} />
            </>
          )}
        </Section>
        {liquid || drops || d.customAmount ? (
          <Field
            label={liquid ? M.doseMl : drops ? M.doseDrops : M.doseOther}
            value={d.amountText}
            onChangeText={(v) => set({ amountText: v })}
            keyboardType="decimal-pad"
            error={errors.dose}
          />
        ) : null}

        <Section title={M.frequency}>
          <Segmented label={M.frequency} value={d.kind} onChange={(kind) => set({ kind })} options={[{ key: 'times', label: M.fixed }, { key: 'interval', label: M.interval }]} />
        </Section>
        {d.kind === 'times' ? (
          <View style={s.stack}>
            {d.times.map((time, i) => (
              <TimeField
                key={`${time}-${i}`}
                label={`${M.times} ${i + 1}`}
                value={time}
                onChange={(v) => set({ times: d.times.map((x, j) => (j === i ? v : x)) })}
                onRemove={d.times.length > 1 ? () => set({ times: d.times.filter((_, j) => j !== i) }) : undefined}
              />
            ))}
            {errors.times ? <AppText variant="caption" color={t.ink.danger}>{errors.times}</AppText> : null}
            <Button label={M.addTime} icon="plus" variant="ghost" size="md" onPress={() => set({ times: [...d.times, addMinutes(d.times.at(-1) ?? '08:00', 12 * 60)] })} />
          </View>
        ) : (
          <View style={s.stack}>
            <Section title={M.everyHours}>
              {INTERVALS.map((h) => (
                <Chip key={h} label={M.hoursUnit(h)} selected={d.everyHours === h} tone="coral" onPress={() => set({ everyHours: h })} />
              ))}
            </Section>
            <TimeField label={M.from} value={d.from} onChange={(v) => set({ from: v })} />
          </View>
        )}
        <Section title={M.days}>
          <Chip label={M.allDays} selected={!d.days.length} tone="mint" onPress={() => set({ days: [] })} />
          {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((day) => (
            <Chip key={day} label={WEEKDAY_SHORT[day]} selected={d.days.includes(day)} tone="mint" onPress={() => toggleDay(day)} />
          ))}
        </Section>

        <Section title={M.duration}>
          <Segmented label={M.duration} value={d.continuous ? 'c' : 'u'} onChange={(v) => set({ continuous: v === 'c' })} options={[{ key: 'c', label: M.continuous }, { key: 'u', label: M.until }]} />
        </Section>
        {!d.continuous ? (
          <View style={s.row}>
            <Field label={strings.setup.who.day} value={d.endDay} onChangeText={(v) => set({ endDay: v.replace(/\D/g, '').slice(0, 2) })} keyboardType="number-pad" style={s.third} />
            <Field label={strings.setup.who.month} value={d.endMonth} onChangeText={(v) => set({ endMonth: v.replace(/\D/g, '').slice(0, 2) })} keyboardType="number-pad" style={s.third} />
            <Field label={strings.setup.who.year} value={d.endYear} onChangeText={(v) => set({ endYear: v.replace(/\D/g, '').slice(0, 4) })} keyboardType="number-pad" error={errors.end} style={s.third} />
          </View>
        ) : null}

        <Section title={M.instructions}>
          {M.instructionChips.map((c) => (
            <Chip key={c} label={c} selected={d.instructions.includes(c)} onPress={() => set({ instructions: d.instructions.includes(c) ? d.instructions.replace(c, '').replace(/^[,\s]+|[,\s]+$/g, '').replace(/,\s*,/g, ',') : [d.instructions, c].filter(Boolean).join(', ') })} />
          ))}
        </Section>
        <Field label={M.instructions} optional value={d.instructions} onChangeText={(v) => set({ instructions: v })} multiline />
        <Field label={M.purpose} optional value={d.purpose} onChangeText={(v) => set({ purpose: v })} hint={M.purposeHint} />
        <Field label={M.description} optional value={d.description} onChangeText={(v) => set({ description: v })} hint={M.descriptionHint} multiline />

        <Card variant="tint" tone="yellow" style={s.stack}>
          <AppText variant="h3">{M.stock}</AppText>
          <AppText variant="caption">{M.stockHint}</AppText>
          <Field label={M.perPackage} optional value={d.perPackage} onChangeText={(v) => set({ perPackage: v })} keyboardType="number-pad" error={errors.perPackage} />
          <Field label={M.onHand} optional value={d.onHand} onChangeText={(v) => set({ onHand: v })} keyboardType="decimal-pad" error={errors.onHand} />
          <Stepper label={M.alertDays} value={d.alertDays} min={1} max={30} onChange={(v) => set({ alertDays: v })} format={M.daysUnit} />
        </Card>

        <Card style={s.stack}>
          <View style={s.soonRow}>
            <AppText variant="h3" style={s.flex}>{M.pharmaTitle}</AppText>
            <View style={[s.soon, t.hairline]}>
              <AppText variant="meta" color={t.ink.lavender}>{strings.common.soon}</AppText>
            </View>
          </View>
          <AppText variant="secondary" color={t.c.muted}>
            {M.pharmaBody}
          </AppText>
        </Card>
      </View>

      <BottomSheet
        visible={!!result}
        title={M.reviewTitle}
        onClose={() => {
          setResult(null);
          router.back();
        }}
      >
        <AppText variant="caption" color={t.c.muted}>
          {M.reviewNote}
        </AppText>
        {result?.findings.length ? (
          <>
            {result.findings.map((f) => (
              <View key={f.reason} style={s.warn}>
                <Icon name="warning" color={t.ink.yellow} />
                <AppText variant="secondary" style={s.flex}>
                  {f.reason}
                </AppText>
              </View>
            ))}
          </>
        ) : (
          <View style={s.ok}>
            <Icon name="info" color={t.ink.mint} />
            <AppText variant="secondary" style={s.flex}>
              {NO_MATCH_TEXT}
            </AppText>
          </View>
        )}
        <AppText variant="secondaryStrong">{CONSULT_TEXT}</AppText>
        <Button
          label={strings.common.done}
          onPress={() => {
            toast(M.saved);
            setResult(null);
            router.back();
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        visible={leaving}
        title={strings.common.discardTitle}
        body={strings.common.discardBody}
        confirmLabel={strings.common.discard}
        cancelLabel={strings.common.keepEditing}
        destructive
        onConfirm={() => {
          db.setDraft(userId, draftKey, undefined);
          setLeaving(false);
          router.back();
        }}
        onCancel={() => setLeaving(false)}
      />
    </ScreenContainer>
  );
}

function Section({ title, hint, error, children }: { title: string; hint?: string; error?: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="secondaryStrong">{title}</AppText>
      {hint ? (
        <AppText variant="caption" color={t.c.muted}>
          {hint}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>{children}</View>
      {error ? (
        <AppText variant="caption" color={t.ink.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    soonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    soon: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: 999, backgroundColor: t.c.lavenderPale },
    flex: { flex: 1 },
    stack: { gap: spacing.md },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    third: { flexGrow: 1, flexBasis: 90 },
    photoCard: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
    photo: { width: 96, height: 96, borderRadius: radius.md },
    warn: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.yellowPale, ...t.hairline },
    ok: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.mintPale, ...t.hairline },
  }),
);
