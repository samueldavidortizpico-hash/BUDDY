/**
 * Pasos del asistente de registro del adulto mayor. Cada paso recibe la persona (si ya existe) y devuelve, con
 * `useStepState`, su estado local + validación + `save()`. El orquestador (app/(caregiver)/setup) decide el orden.
 */
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip, ChipList, Field, Segmented, Stepper } from '@/components/forms';
import { Icon } from '@/components/icon';
import { TimeField } from '@/components/time-picker';
import { describeDays, sortTimes, spreadTimes } from '@/domain/time';
import type { ActivityKind, ClockTime, Elder, Gender, MealKind, Relation } from '@/domain/types';
import { ALERT_KINDS } from '@/domain/types';
import { digitsOnly, formatPhone, isValidColombianPhone, isValidName, parseDecimal } from '@/domain/validation';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { DEFAULT_MEALS, contactActions, elderActions, routineActions, type ElderBasics } from '@/state/actions';
import { useRecords, useUserId } from '@/state/data';
import { useSession } from '@/state/session';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock, parseISODate, toISODate } from '@/utils/dates';

const S = strings.setup;

export interface StepHandle {
  /** Valida y guarda. Devuelve false si hay errores (los muestra el propio paso). */
  save: () => boolean;
  dirty: boolean;
}

/** Estado de un paso con borrador persistido por cuenta (`drafts[userId]['setup.<key>']`). */
function useDraft<T>(key: string, initial: () => T): [T, (patch: Partial<T>) => void, boolean] {
  const userId = useUserId() ?? 'anon';
  const draftKey = `setup.${key}`;
  const [state, setState] = useState<T>(() => db.draft<T>(userId, draftKey) ?? initial());
  const [dirty, setDirty] = useState(false);
  const update = (patch: Partial<T>) => {
    setState((s) => {
      const next = { ...s, ...patch };
      db.setDraft(userId, draftKey, next);
      return next;
    });
    setDirty(true);
  };
  return [state, update, dirty];
}

export function clearDraft(key: string) {
  const userId = useSession.getState().user?.id;
  if (userId) db.setDraft(userId, `setup.${key}`, undefined);
}

// ── 1. Quién es ──────────────────────────────────────────────

interface WhoDraft {
  firstName: string;
  lastName: string;
  gender: Gender | null;
  mode: 'date' | 'age';
  day: string;
  month: string;
  year: string;
  age: number;
  weight: string;
  height: string;
  relation: Relation;
  relationOther: string;
  phone: string;
}

export function useWhoStep(elder: Elder | null): StepHandle & { view: React.ReactNode } {
  const W = S.who;
  const [d, set, dirty] = useDraft<WhoDraft>(elder ? `${elder.id}.who` : 'new.who', () => {
    const b = elder?.birthDate ? parseISODate(elder.birthDate) : null;
    return {
      firstName: elder?.firstName ?? '',
      lastName: elder?.lastName ?? '',
      gender: elder?.gender ?? null,
      mode: elder?.birthDate ? 'date' : 'age',
      day: b ? String(b.getDate()) : '',
      month: b ? String(b.getMonth() + 1) : '',
      year: b ? String(b.getFullYear()) : '',
      age: elder?.age ?? 75,
      weight: elder?.weightKg ? String(elder.weightKg) : '',
      height: elder?.heightCm ? String(elder.heightCm) : '',
      relation: elder?.relation ?? 'mother',
      relationOther: elder?.relationOther ?? '',
      phone: elder?.phone ?? '',
    };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const birthISO = () => {
    const y = Number(d.year);
    const m = Number(d.month);
    const day = Number(d.day);
    if (!y || !m || !day) return null;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = parseISODate(iso);
    const now = new Date();
    return date && y > 1900 && date < now && now.getFullYear() - y >= 40 ? toISODate(date) : null;
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (!isValidName(d.firstName)) e.firstName = W.errors.firstName;
    if (!d.gender) e.gender = W.errors.gender;
    const birthDate = d.mode === 'date' ? birthISO() : null;
    if (d.mode === 'date' && !birthDate) e.date = W.errors.date;
    const weight = d.weight.trim() ? parseDecimal(d.weight, 25, 250) : null;
    const height = d.height.trim() ? parseDecimal(d.height, 100, 230) : null;
    if (d.weight.trim() && weight === null) e.weight = W.errors.weight;
    if (d.height.trim() && height === null) e.height = W.errors.height;
    if (d.phone.trim() && !isValidColombianPhone(d.phone)) e.phone = strings.setup.contacts.errors.phone;
    setErrors(e);
    if (Object.keys(e).length) return false;
    const basics: ElderBasics = {
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      gender: d.gender!,
      birthDate,
      age: d.mode === 'age' ? d.age : null,
      weightKg: weight,
      heightCm: height,
      relation: d.relation,
      relationOther: d.relation === 'other' ? d.relationOther.trim() : '',
      phone: digitsOnly(d.phone),
    };
    if (elder) elderActions.update(elder.id, basics);
    else elderActions.create(basics);
    clearDraft(elder ? `${elder.id}.who` : 'new.who');
    return true;
  };

  const view = (
    <View style={styles.stack}>
      <Field label={W.firstName} value={d.firstName} onChangeText={(v) => set({ firstName: v })} error={errors.firstName} autoCapitalize="words" icon="user" />
      <Field label={W.lastName} optional value={d.lastName} onChangeText={(v) => set({ lastName: v })} autoCapitalize="words" />
      <Group label={W.gender} error={errors.gender}>
        {(Object.keys(W.genders) as Gender[]).map((g) => (
          <Chip key={g} label={W.genders[g]} selected={d.gender === g} onPress={() => set({ gender: g })} />
        ))}
      </Group>
      <Group label={W.ageMode}>
        <Segmented label={W.ageMode} value={d.mode} onChange={(mode) => set({ mode })} options={[{ key: 'age', label: W.onlyAge }, { key: 'date', label: W.knowDate }]} />
      </Group>
      {d.mode === 'age' ? (
        <Stepper label={W.age} value={d.age} min={40} max={115} onChange={(age) => set({ age })} format={W.ageUnit} />
      ) : (
        <View style={styles.stack}>
          <View style={styles.row}>
            <Field label={W.day} value={d.day} onChangeText={(v) => set({ day: v.replace(/\D/g, '').slice(0, 2) })} keyboardType="number-pad" style={styles.third} />
            <Field label={W.month} value={d.month} onChangeText={(v) => set({ month: v.replace(/\D/g, '').slice(0, 2) })} keyboardType="number-pad" style={styles.third} />
            <Field label={W.year} value={d.year} onChangeText={(v) => set({ year: v.replace(/\D/g, '').slice(0, 4) })} keyboardType="number-pad" style={styles.third} />
          </View>
          {errors.date ? <ErrorText text={errors.date} /> : null}
        </View>
      )}
      <View style={styles.row}>
        <Field label={W.weight} optional value={d.weight} onChangeText={(v) => set({ weight: v })} keyboardType="decimal-pad" error={errors.weight} style={styles.half} />
        <Field label={W.height} optional value={d.height} onChangeText={(v) => set({ height: v })} keyboardType="number-pad" error={errors.height} style={styles.half} />
      </View>
      <Group label={W.relation}>
        {(Object.keys(W.relations) as Relation[]).map((r) => (
          <Chip key={r} label={W.relations[r]} selected={d.relation === r} onPress={() => set({ relation: r })} tone="lavender" />
        ))}
      </Group>
      {d.relation === 'other' ? <Field label={W.relationOther} value={d.relationOther} onChangeText={(v) => set({ relationOther: v })} /> : null}
      <Field label={W.phone} optional hint={W.phoneWhy} value={d.phone} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" icon="phone" error={errors.phone} />
    </View>
  );
  return { save, dirty, view };
}

// ── 2. Salud ─────────────────────────────────────────────────

export function useHealthStep(elder: Elder): StepHandle & { view: React.ReactNode } {
  const H = S.health;
  const t = useTheme();
  const [d, set, dirty] = useDraft(`${elder.id}.health`, () => ({
    allergies: elder.allergies,
    conditions: elder.conditions,
    avoid: elder.avoid,
    surgeries: elder.surgeries,
    insurer: elder.insurer,
    doctor: elder.doctor,
  }));
  const save = () => {
    elderActions.update(elder.id, { ...d, insurer: d.insurer.trim(), doctor: d.doctor.trim() });
    clearDraft(`${elder.id}.health`);
    return true;
  };
  const view = (
    <View style={styles.stack}>
      <Note icon="info" text={H.note} color={t.ink.info} />
      <ChipList label={H.allergies} values={d.allergies} onChange={(v) => set({ allergies: v })} suggestions={H.allergiesSuggest} placeholder={H.placeholder} tone="coral" />
      <ChipList label={H.conditions} values={d.conditions} onChange={(v) => set({ conditions: v })} suggestions={H.conditionsSuggest} placeholder={H.placeholder} tone="lavender" />
      <ChipList label={H.avoid} values={d.avoid} onChange={(v) => set({ avoid: v })} suggestions={H.avoidSuggest} placeholder={H.placeholder} tone="yellow" />
      <ChipList label={H.surgeries} values={d.surgeries} onChange={(v) => set({ surgeries: v })} placeholder={H.placeholder} tone="sky" />
      <Field label={H.insurer} optional value={d.insurer} onChangeText={(v) => set({ insurer: v })} />
      <Field label={H.doctor} optional value={d.doctor} onChangeText={(v) => set({ doctor: v })} autoCapitalize="words" />
    </View>
  );
  return { save, dirty, view };
}

// ── 3. Alimentación ──────────────────────────────────────────

export function useFoodStep(elder: Elder): StepHandle & { view: React.ReactNode } {
  const F = S.food;
  const t = useTheme();
  const existing = useRecords('meals', { elderId: elder.id });
  const [d, set, dirty] = useDraft(`${elder.id}.food`, () => ({
    restrictions: elder.dietRestrictions,
    foodAllergies: elder.foodAllergies,
    meals: existing.length
      ? existing.map((m) => ({ kind: m.kind, time: m.time, on: true }))
      : [...DEFAULT_MEALS.map((m) => ({ ...m, on: true })), { kind: 'snack' as MealKind, time: '10:00', on: false }, { kind: 'snack' as MealKind, time: '16:00', on: false }],
  }));
  const toggleRestriction = (r: string) =>
    set({ restrictions: d.restrictions.includes(r) ? d.restrictions.filter((x) => x !== r) : [...d.restrictions, r] });
  const save = () => {
    elderActions.update(elder.id, { dietRestrictions: d.restrictions, foodAllergies: d.foodAllergies });
    existing.forEach((m) => routineActions.removeMeal(m.id));
    d.meals.filter((m) => m.on).forEach((m) => routineActions.addMeal(m.kind, m.time, elder.id));
    clearDraft(`${elder.id}.food`);
    return true;
  };
  const view = (
    <View style={styles.stack}>
      <Group label={F.restrictions}>
        {F.restrictionOptions.map((r) => (
          <Chip key={r} label={r} selected={d.restrictions.includes(r)} onPress={() => toggleRestriction(r)} tone="yellow" />
        ))}
      </Group>
      <ChipList
        label={F.other}
        values={d.restrictions.filter((r) => !F.restrictionOptions.includes(r))}
        onChange={(v) => set({ restrictions: [...d.restrictions.filter((r) => F.restrictionOptions.includes(r)), ...v] })}
        placeholder={S.health.placeholder}
        tone="yellow"
      />
      <ChipList label={F.allergies} values={d.foodAllergies} onChange={(v) => set({ foodAllergies: v })} placeholder={S.health.placeholder} tone="coral" />
      <AppText variant="h3">{F.meals}</AppText>
      <AppText variant="caption" color={t.c.muted}>
        {F.mealsHint}
      </AppText>
      {d.meals.map((m, i) => (
        <View key={`${m.kind}-${i}`} style={styles.mealRow}>
          <Chip label={F.mealNames[m.kind]} selected={m.on} tone="yellow" onPress={() => set({ meals: d.meals.map((x, j) => (j === i ? { ...x, on: !x.on } : x)) })} />
          {m.on ? (
            <View style={styles.flex}>
              <TimeField label={F.mealNames[m.kind]} value={m.time} onChange={(time) => set({ meals: d.meals.map((x, j) => (j === i ? { ...x, time } : x)) })} />
            </View>
          ) : null}
        </View>
      ))}
      <Button label={F.addSnack} icon="plus" variant="ghost" size="md" onPress={() => set({ meals: [...d.meals, { kind: 'snack', time: '15:00', on: true }] })} />
    </View>
  );
  return { save, dirty, view };
}

// ── 4. Medicamentos ──────────────────────────────────────────

export function useMedsStep(elder: Elder): StepHandle & { view: React.ReactNode } {
  const M = S.meds;
  const router = useRouter();
  const t = useTheme();
  const meds = useRecords('medications', { elderId: elder.id });
  const go = (mode: 'manual' | 'scan') => router.push({ pathname: '/medication/new', params: { elderId: elder.id, mode } } as unknown as Href);
  const view = (
    <View style={styles.stack}>
      <AppText variant="secondary" color={t.c.muted}>
        {M.body}
      </AppText>
      {meds.length ? (
        meds.map((m) => (
          <Card key={m.id} style={styles.medRow}>
            <Icon name="meds" color={t.ink.coral} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{m.name}</AppText>
              <AppText variant="caption" color={t.c.muted}>
                {m.strength}
              </AppText>
            </View>
          </Card>
        ))
      ) : (
        <AppText variant="secondary" color={t.c.muted}>
          {M.empty}
        </AppText>
      )}
      <Button label={M.manual} icon="pencil" variant="tonal" tone="coral" onPress={() => go('manual')} />
      <Button label={M.scan} icon="camera" variant="tonal" tone="coral" onPress={() => go('scan')} />
      <Button label={M.buddy} icon="sparkle" variant="tonal" tone="mint" onPress={() => router.push('/buddy' as Href)} />
    </View>
  );
  return { save: () => true, dirty: false, view };
}

// ── Registro rápido: solo la hora del chequeo (V3.0) ─────────

/** Paso corto del registro rápido: la hora del chequeo diario (agua y actividades quedan en "Primeros pasos"). */
export function useCheckinStep(elder: Elder): StepHandle & { view: React.ReactNode } {
  const R = S.routine;
  const t = useTheme();
  const [d, set, dirty] = useDraft(`${elder.id}.checkin`, () => ({ checkin: elder.checkinTime ?? '10:00' }));
  const save = () => {
    routineActions.setCheckinTime(d.checkin, elder.id);
    clearDraft(`${elder.id}.checkin`);
    return true;
  };
  const view = (
    <View style={styles.stack}>
      <TimeField label={R.checkin} value={d.checkin} onChange={(v) => set({ checkin: v })} />
      <AppText variant="caption" color={t.c.muted}>
        {R.checkinHint}
      </AppText>
    </View>
  );
  return { save, dirty, view };
}

// ── 5. Contactos ─────────────────────────────────────────────

export function useContactsStep(elder: Elder): StepHandle & { view: React.ReactNode } {
  const C = S.contacts;
  const t = useTheme();
  const contacts = useRecords('contacts', { elderId: elder.id });
  const [d, set, dirty] = useDraft(`${elder.id}.contact`, () => ({ name: '', relation: '', phone: '' }));
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const add = () => {
    const e = { name: isValidName(d.name) ? undefined : C.errors.name, phone: isValidColombianPhone(d.phone) ? undefined : C.errors.phone };
    setErrors(e);
    if (e.name || e.phone) return false;
    contactActions.add({ name: d.name, relation: d.relation, phone: d.phone }, elder.id);
    set({ name: '', relation: '', phone: '' });
    return true;
  };
  const save = () => {
    // Si escribió un contacto sin agregarlo, se guarda al continuar.
    if (d.name.trim() || d.phone.trim()) return add();
    clearDraft(`${elder.id}.contact`);
    return true;
  };
  const view = (
    <View style={styles.stack}>
      <AppText variant="secondary" color={t.c.muted}>
        {C.body}
      </AppText>
      {contacts.length ? (
        contacts.map((c) => (
          <Card key={c.id} style={styles.medRow}>
            <Icon name="phone" color={t.ink.lavender} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{c.name}</AppText>
              <AppText variant="caption" color={t.c.muted}>
                {[c.relation, formatPhone(c.phone), c.primary ? C.primary : ''].filter(Boolean).join(' · ')}
              </AppText>
            </View>
            {!c.primary ? <Button label={C.primary} size="sm" variant="ghost" onPress={() => contactActions.update(c.id, { primary: true })} /> : null}
          </Card>
        ))
      ) : (
        <AppText variant="secondary" color={t.c.muted}>
          {C.empty}
        </AppText>
      )}
      <Field label={C.name} value={d.name} onChangeText={(v) => set({ name: v })} error={errors.name} autoCapitalize="words" icon="user" />
      <ChipList label={C.relation} values={d.relation ? [d.relation] : []} onChange={(v) => set({ relation: v.at(-1) ?? '' })} suggestions={C.relationSuggest} tone="lavender" />
      <Field label={C.phone} value={d.phone} onChangeText={(v) => set({ phone: v })} error={errors.phone} hint={C.phoneHint} keyboardType="phone-pad" icon="phone" />
      <Button label={C.add} icon="plus" variant="tonal" tone="lavender" onPress={add} />
    </View>
  );
  return { save, dirty, view };
}

// ── 6. Rutina ────────────────────────────────────────────────

const QUICK_ACTIVITIES: { kind: ActivityKind; minutes: number; time: ClockTime }[] = [
  { kind: 'walk', minutes: 15, time: '17:00' },
  { kind: 'stretch', minutes: 10, time: '09:00' },
  { kind: 'air', minutes: 10, time: '11:00' },
  { kind: 'breath', minutes: 5, time: '20:00' },
  { kind: 'music', minutes: 20, time: '15:00' },
  { kind: 'read', minutes: 20, time: '19:00' },
];

export function useRoutineStep(elder: Elder): StepHandle & { view: React.ReactNode } {
  const R = S.routine;
  const t = useTheme();
  const plan = useRecords('waterPlans', { elderId: elder.id })[0];
  const acts = useRecords('activities', { elderId: elder.id });
  const [d, set, dirty] = useDraft(`${elder.id}.routine`, () => ({
    glasses: plan?.glasses ?? 8,
    times: plan?.times ?? spreadTimes(8),
    checkin: elder.checkinTime ?? '10:00',
    activities: acts.length ? acts.map((a) => a.kind) : (['walk'] as ActivityKind[]),
  }));
  const setGlasses = (g: number) => set({ glasses: g, times: spreadTimes(g) });
  const toggle = (k: ActivityKind) => set({ activities: d.activities.includes(k) ? d.activities.filter((x) => x !== k) : [...d.activities, k] });
  const save = () => {
    routineActions.setWater(d.glasses, sortTimes(d.times), elder.id);
    routineActions.setCheckinTime(d.checkin, elder.id);
    const have = new Set(acts.map((a) => a.kind));
    QUICK_ACTIVITIES.filter((q) => d.activities.includes(q.kind) && !have.has(q.kind)).forEach((q) =>
      routineActions.addActivity({ kind: q.kind, title: strings.activities[q.kind], time: q.time, minutes: q.minutes }, elder.id),
    );
    acts.filter((a) => a.kind !== 'custom' && a.kind !== 'call' && !d.activities.includes(a.kind)).forEach((a) => routineActions.removeActivity(a.id));
    clearDraft(`${elder.id}.routine`);
    return true;
  };
  const view = (
    <View style={styles.stack}>
      <Stepper label={R.water} value={d.glasses} min={1} max={14} onChange={setGlasses} />
      <AppText variant="secondaryStrong">{R.waterTimes}</AppText>
      <View style={styles.times}>
        {d.times.map((time, i) => (
          <View key={`${time}-${i}`} style={styles.timeCell}>
            <TimeField label={`Vaso ${i + 1}`} value={time} onChange={(v) => set({ times: d.times.map((x, j) => (j === i ? v : x)) })} />
          </View>
        ))}
      </View>
      <TimeField label={R.checkin} value={d.checkin} onChange={(v) => set({ checkin: v })} />
      <AppText variant="caption" color={t.c.muted}>
        {R.checkinHint}
      </AppText>
      <Group label={R.activities}>
        {QUICK_ACTIVITIES.map((q) => (
          <Chip key={q.kind} label={`${strings.activities[q.kind]} · ${formatClock(q.time)}`} selected={d.activities.includes(q.kind)} onPress={() => toggle(q.kind)} tone="mint" />
        ))}
      </Group>
      <AppText variant="caption" color={t.c.muted}>
        {R.activitiesHint} {describeDays([])}.
      </AppText>
    </View>
  );
  return { save, dirty, view };
}

// ── 7. Avisos ────────────────────────────────────────────────

export function useAlertsStep(elder: Elder): StepHandle & { view: React.ReactNode } {
  const A = S.alerts;
  const [d, set, dirty] = useDraft(`${elder.id}.alerts`, () => ({ summaries: elder.summaries, alertPrefs: elder.alertPrefs }));
  const save = () => {
    elderActions.update(elder.id, d);
    clearDraft(`${elder.id}.alerts`);
    return true;
  };
  const view = (
    <View style={styles.stack}>
      <Group label={A.summaries}>
        <Segmented
          label={A.summaries}
          value={d.summaries}
          onChange={(summaries) => set({ summaries })}
          options={(['daily', 'weekly', 'none'] as const).map((k) => ({ key: k, label: A.summaryOptions[k] }))}
        />
      </Group>
      <Group label={A.which}>
        {ALERT_KINDS.map((k) => (
          <Chip
            key={k}
            label={strings.alertKinds[k]}
            selected={d.alertPrefs[k]}
            tone={k === 'help_requested' ? 'red' : 'yellow'}
            onPress={() => set({ alertPrefs: { ...d.alertPrefs, [k]: !d.alertPrefs[k] } })}
          />
        ))}
      </Group>
    </View>
  );
  return { save, dirty, view };
}

// ── Piezas comunes ───────────────────────────────────────────

export function Group({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="secondaryStrong">{label}</AppText>
      <View style={styles.wrap}>{children}</View>
      {error ? <ErrorText text={error} /> : null}
    </View>
  );
}

function ErrorText({ text }: { text: string }) {
  const t = useTheme();
  return (
    <AppText variant="caption" color={t.ink.danger} accessibilityLiveRegion="polite">
      {text}
    </AppText>
  );
}

export function Note({ icon, text, color }: { icon: 'info' | 'shield' | 'warning'; text: string; color: string }) {
  const s = useNoteStyles();
  return (
    <View style={s.note}>
      <Icon name={icon} color={color} />
      <AppText variant="caption" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

const useNoteStyles = makeStyles((t) =>
  StyleSheet.create({
    note: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.surface2, ...t.hairline },
  }),
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: spacing.md },
  group: { gap: spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  half: { flexGrow: 1, flexBasis: 140 },
  third: { flexGrow: 1, flexBasis: 90 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  times: { gap: spacing.xs },
  timeCell: {},
});
