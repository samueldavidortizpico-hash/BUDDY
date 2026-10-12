import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet, ConfirmDialog, useToast } from '@/components/feedback';
import { Chip, ChipList, Field, Segmented, Stepper } from '@/components/forms';
import { Icon } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/states';
import { TimeField } from '@/components/time-picker';
import { WEEKDAY_SHORT, describeDays, intervalTimes, sortTimes, spreadTimes, toMinutes } from '@/domain/time';
import { appointmentAddress, type ActivityKind, type MealKind, type Weekday } from '@/domain/types';
import { digitsOnly, formatPhone, isValidColombianPhone, isValidName, parseDecimal } from '@/domain/validation';
import { strings } from '@/i18n';
import { contactActions, routineActions } from '@/state/actions';
import { useActiveElder, useRecords } from '@/state/data';
import { radius, spacing, touch } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatClock, parseISODate, toISODate } from '@/utils/dates';

const R = strings.routine;

export default function RoutineSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const elder = useActiveElder();
  const title = R.sections[section] ?? R.title;
  return (
    <ScreenContainer keyboard header={<ScreenHeader title={title} subtitle={elder ? strings.summary.caring(elder.firstName) : undefined} fallback="/routine" />}>
      {!elder ? null : section === 'water' ? (
        <Water />
      ) : section === 'meals' ? (
        <Meals />
      ) : section === 'activities' ? (
        <Activities />
      ) : section === 'contacts' ? (
        <Contacts />
      ) : section === 'checkin' ? (
        <Checkin />
      ) : section === 'appointments' ? (
        <Appointments />
      ) : (
        <Reminders />
      )}
    </ScreenContainer>
  );
}

function useUndo() {
  const toast = useToast();
  return (label: string, undo: () => void) => toast({ message: `${R.removed}: ${label}`, icon: 'trash', action: { label: strings.common.undo, onPress: undo } });
}

// ── Agua ─────────────────────────────────────────────────────
function Water() {
  const toast = useToast();
  const s = useStyles();
  const plan = useRecords('waterPlans')[0];
  const [glasses, setGlasses] = useState(plan?.glasses ?? 8);
  const [mode, setMode] = useState<'specific' | 'every'>('specific');
  const [times, setTimes] = useState(plan?.times ?? spreadTimes(8));
  const [every, setEvery] = useState(2);
  const [from, setFrom] = useState(plan?.times[0] ?? '08:00');
  const [to, setTo] = useState(plan?.times.at(-1) ?? '20:00');
  const regenerate = (g = glasses) => setTimes(mode === 'specific' ? spreadTimes(g, from, to) : intervalTimes(every, from).filter((x) => toMinutes(x) >= toMinutes(from) && toMinutes(x) <= toMinutes(to)));
  return (
    <View style={s.stack}>
      <Stepper label={strings.setup.routine.water} value={glasses} min={1} max={14} onChange={(g) => { setGlasses(g); setTimes(spreadTimes(g, from, to)); }} />
      <Segmented label={R.waterMode} value={mode} onChange={setMode} options={[{ key: 'specific', label: R.specific }, { key: 'every', label: R.everyX }]} />
      {mode === 'every' ? <Stepper label={strings.meds.everyHours} value={every} min={1} max={6} onChange={setEvery} format={strings.meds.hoursUnit} /> : null}
      <View style={s.row}>
        <View style={s.grow}><TimeField label={strings.meds.from} value={from} onChange={setFrom} /></View>
        <View style={s.grow}><TimeField label="Hasta" value={to} onChange={setTo} /></View>
      </View>
      <Button label={R.regenerate} icon="clock" variant="ghost" size="md" onPress={() => regenerate()} />
      {times.map((time, i) => (
        <TimeField key={`${time}-${i}`} label={`Vaso ${i + 1}`} value={time} onChange={(v) => setTimes(times.map((x, j) => (j === i ? v : x)))} onRemove={times.length > 1 ? () => setTimes(times.filter((_, j) => j !== i)) : undefined} />
      ))}
      <Button label={R.addTime} icon="plus" variant="ghost" size="md" onPress={() => setTimes([...times, '12:00'])} />
      <Button label={strings.common.save} icon="check" onPress={() => { routineActions.setWater(Math.max(glasses, times.length), sortTimes(times)); toast(strings.common.done); }} />
    </View>
  );
}

// ── Comidas ──────────────────────────────────────────────────
function Meals() {
  const s = useStyles();
  const undo = useUndo();
  const meals = useRecords('meals').slice().sort((a, b) => a.time.localeCompare(b.time));
  const [adding, setAdding] = useState<MealKind | null>(null);
  const F = strings.setup.food;
  return (
    <View style={s.stack}>
      {meals.length ? (
        meals.map((m) => (
          <View key={m.id} style={s.row}>
            <View style={s.grow}>
              <TimeField label={F.mealNames[m.kind]} value={m.time} onChange={(time) => routineActions.updateMeal(m.id, { time })} onRemove={() => { routineActions.removeMeal(m.id); undo(F.mealNames[m.kind], () => routineActions.restoreMeal(m.id)); }} />
            </View>
          </View>
        ))
      ) : (
        <EmptyState title={R.emptyGeneric} mood="look" />
      )}
      <AppText variant="secondaryStrong">{R.add}</AppText>
      <View style={s.wrap}>
        {(['breakfast', 'lunch', 'dinner', 'snack'] as MealKind[]).map((k) => (
          <Chip key={k} label={F.mealNames[k]} icon="plus" tone="yellow" onPress={() => setAdding(k)} />
        ))}
      </View>
      {adding ? (
        <TimeField
          label={F.mealNames[adding]}
          value={{ breakfast: '07:30', lunch: '12:30', dinner: '18:30', snack: '16:00' }[adding]}
          onChange={(time) => { routineActions.addMeal(adding, time); setAdding(null); }}
        />
      ) : null}
    </View>
  );
}

// ── Actividades ──────────────────────────────────────────────
const KINDS: ActivityKind[] = ['walk', 'stretch', 'air', 'breath', 'music', 'read', 'call', 'custom'];

function Activities() {
  const t = useTheme();
  const s = useStyles();
  const undo = useUndo();
  const acts = useRecords('activities');
  const contacts = useRecords('contacts');
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ActivityKind>('walk');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('17:00');
  const [minutes, setMinutes] = useState(15);
  const [days, setDays] = useState<Weekday[]>([]);
  const [contactId, setContactId] = useState<string | null>(null);
  const [steps, setSteps] = useState('');
  const save = () => {
    const contact = contacts.find((c) => c.id === contactId);
    routineActions.addActivity({
      kind,
      title: kind === 'custom' ? title.trim() || strings.activities.custom : kind === 'call' && contact ? `Llamar a ${contact.name}` : strings.activities[kind],
      time,
      minutes,
      days,
      contactId: kind === 'call' ? contactId : null,
      stepsGoal: steps.trim() ? parseDecimal(steps, 100, 50000) : null,
    });
    setOpen(false);
    setTitle('');
    setSteps('');
  };
  return (
    <View style={s.stack}>
      {acts.length ? (
        acts.map((a) => (
          <Card key={a.id} style={s.item}>
            <Icon name="walk" color={t.ink.mint} />
            <View style={s.flex}>
              <AppText variant="bodyStrong">{a.title}</AppText>
              <AppText variant="caption" color={t.c.muted}>{`${formatClock(a.time)} · ${describeDays(a.days)}${a.minutes ? ` · ${a.minutes} min` : ''}${a.stepsGoal ? ` · ${a.stepsGoal} pasos` : ''}`}</AppText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${strings.common.delete} ${a.title}`} onPress={() => { routineActions.removeActivity(a.id); undo(a.title, () => routineActions.restoreActivity(a.id)); }} style={s.iconBtn}>
              <Icon name="trash" color={t.ink.danger} size={20} />
            </Pressable>
          </Card>
        ))
      ) : (
        <EmptyState title={R.emptyGeneric} mood="look" />
      )}
      <Button label={R.add} icon="plus" variant="tonal" tone="mint" onPress={() => setOpen(true)} />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={R.sections.activities}>
        <View style={s.wrap}>
          {KINDS.map((k) => (
            <Chip key={k} label={strings.activities[k]} selected={kind === k} tone="mint" onPress={() => setKind(k)} />
          ))}
        </View>
        {kind === 'custom' ? <Field label={R.activityName} value={title} onChangeText={setTitle} /> : null}
        {kind === 'call' ? (
          <View style={s.wrap}>
            {contacts.length ? contacts.map((c) => <Chip key={c.id} label={c.name} selected={contactId === c.id} tone="lavender" onPress={() => setContactId(c.id)} />) : <AppText variant="caption">{strings.setup.contacts.empty}</AppText>}
          </View>
        ) : null}
        <TimeField label={strings.meds.times} value={time} onChange={setTime} />
        <Stepper label={R.minutes} value={minutes} min={5} max={120} step={5} onChange={setMinutes} />
        <DayPicker days={days} onChange={setDays} />
        <Field label={R.steps} optional value={steps} onChangeText={setSteps} keyboardType="number-pad" hint={R.stepsNote} />
        <Button label={strings.common.save} onPress={save} />
      </BottomSheet>
    </View>
  );
}

function DayPicker({ days, onChange }: { days: Weekday[]; onChange: (d: Weekday[]) => void }) {
  const s = useStyles();
  return (
    <View style={s.wrap}>
      <Chip label={strings.meds.allDays} selected={!days.length} onPress={() => onChange([])} />
      {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((d) => (
        <Chip key={d} label={WEEKDAY_SHORT[d]} selected={days.includes(d)} onPress={() => onChange(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])} />
      ))}
    </View>
  );
}

// ── Contactos ────────────────────────────────────────────────
function Contacts() {
  const t = useTheme();
  const s = useStyles();
  const undo = useUndo();
  const C = strings.setup.contacts;
  const contacts = useRecords('contacts');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [del, setDel] = useState<string | null>(null);
  const open = (id: string | 'new') => {
    const c = contacts.find((x) => x.id === id);
    setName(c?.name ?? '');
    setRelation(c?.relation ?? '');
    setPhone(c ? formatPhone(c.phone) : '');
    setErrors({});
    setEditing(id);
  };
  const save = () => {
    const e = { name: isValidName(name) ? undefined : C.errors.name, phone: isValidColombianPhone(phone) ? undefined : C.errors.phone };
    setErrors(e);
    if (e.name || e.phone) return;
    if (editing === 'new') contactActions.add({ name, relation, phone });
    else if (editing) contactActions.update(editing, { name: name.trim(), relation: relation.trim(), phone: phone.trim() });
    setEditing(null);
  };
  return (
    <View style={s.stack}>
      <AppText variant="secondary" color={t.c.muted}>{C.body}</AppText>
      {contacts.length ? (
        contacts.map((c) => (
          <Card key={c.id} style={s.item}>
            <Icon name="phone" color={t.ink.lavender} />
            <Pressable style={s.flex} onPress={() => open(c.id)} accessibilityRole="button" accessibilityLabel={`${strings.common.edit} ${c.name}`}>
              <AppText variant="bodyStrong">{c.name}</AppText>
              <AppText variant="caption" color={t.c.muted}>{[c.relation, formatPhone(c.phone), c.primary ? C.primary : ''].filter(Boolean).join(' · ')}</AppText>
            </Pressable>
            {!c.primary ? <Button label={C.primary} size="sm" variant="ghost" onPress={() => contactActions.update(c.id, { primary: true })} /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`${strings.common.delete} ${c.name}`} onPress={() => setDel(c.id)} style={s.iconBtn}>
              <Icon name="trash" color={t.ink.danger} size={20} />
            </Pressable>
          </Card>
        ))
      ) : (
        <EmptyState title={C.empty} mood="look" />
      )}
      <Button label={C.add} icon="plus" variant="tonal" tone="lavender" onPress={() => open('new')} />
      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? C.add : strings.common.edit}>
        <Field label={C.name} value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
        <ChipList label={C.relation} values={relation ? [relation] : []} onChange={(v) => setRelation(v.at(-1) ?? '')} suggestions={C.relationSuggest} tone="lavender" />
        <Field label={C.phone} value={phone} onChangeText={setPhone} error={errors.phone} hint={C.phoneHint} keyboardType="phone-pad" />
        <Button label={strings.common.save} onPress={save} />
      </BottomSheet>
      <ConfirmDialog
        visible={!!del}
        title={`${strings.common.delete}?`}
        confirmLabel={strings.common.delete}
        destructive
        onCancel={() => setDel(null)}
        onConfirm={() => {
          const c = contacts.find((x) => x.id === del);
          if (del) contactActions.remove(del);
          if (c && del) undo(c.name, () => contactActions.restore(del));
          setDel(null);
        }}
      />
    </View>
  );
}

// ── Chequeo ──────────────────────────────────────────────────
function Checkin() {
  const t = useTheme();
  const s = useStyles();
  const elder = useActiveElder();
  return (
    <View style={s.stack}>
      <AppText variant="secondary" color={t.c.muted}>{R.checkinBody}</AppText>
      {elder?.checkinTime ? (
        <>
          <TimeField label={R.checkinTime} value={elder.checkinTime} onChange={(v) => routineActions.setCheckinTime(v)} />
          <Button label={R.noCheckin} variant="ghost" size="md" onPress={() => routineActions.setCheckinTime(null)} />
        </>
      ) : (
        <Button label={R.checkinTime} icon="clock" onPress={() => routineActions.setCheckinTime('10:00')} />
      )}
    </View>
  );
}

// ── Citas ────────────────────────────────────────────────────
function Appointments() {
  const t = useTheme();
  const s = useStyles();
  const undo = useUndo();
  const A = strings.appointments;
  const list = useRecords('appointments').slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const [f, setF] = useState({ title: '', doctor: '', place: '', city: '', reference: '', phone: '', notes: '', questions: '' });
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [time, setTime] = useState('09:00');
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const add = () => {
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    if (!f.title.trim()) return setError(A.errors.title);
    if (!parseISODate(iso) || iso < toISODate(new Date())) return setError(strings.meds.errors.date);
    if (f.phone.trim() && digitsOnly(f.phone).length < 7) return setError(A.errors.phone);
    routineActions.addAppointment(f.title.trim(), iso, time, f.place.trim(), undefined, {
      doctor: f.doctor.trim(),
      city: f.city.trim(),
      reference: f.reference.trim(),
      phone: digitsOnly(f.phone),
      notes: f.notes.trim(),
      questions: f.questions.split(/\n|;/).map((q) => q.trim()).filter(Boolean),
    });
    setF({ title: '', doctor: '', place: '', city: '', reference: '', phone: '', notes: '', questions: '' });
    setError(null);
  };
  return (
    <View style={s.stack}>
      {list.map((a) => {
        const where = appointmentAddress(a);
        return (
          <Card key={a.id} style={s.item}>
            <Icon name="calendar" color={t.ink.yellow} />
            <View style={s.flex}>
              <AppText variant="bodyStrong">{a.title}</AppText>
              <AppText variant="caption" color={t.c.muted}>{`${a.date} · ${formatClock(a.time)}${a.doctor ? ` · ${a.doctor}` : ''}`}</AppText>
              {where ? <AppText variant="caption">{`${A.address}: ${where}`}</AppText> : null}
              {a.questions?.length ? <AppText variant="caption" color={t.c.muted}>{A.questionsCount(a.questions.length)}</AppText> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${strings.common.delete} ${a.title}`} onPress={() => { routineActions.removeAppointment(a.id); undo(a.title, () => routineActions.restoreAppointment?.(a.id)); }} style={s.iconBtn}>
              <Icon name="trash" color={t.ink.danger} size={20} />
            </Pressable>
          </Card>
        );
      })}
      <Field label={R.appointmentTitle} value={f.title} onChangeText={(v) => set({ title: v })} />
      <Field label={A.doctor} optional value={f.doctor} onChangeText={(v) => set({ doctor: v })} />
      <View style={s.row}>
        <Field label={strings.setup.who.day} value={day} onChangeText={(v) => setDay(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" style={s.third} />
        <Field label={strings.setup.who.month} value={month} onChangeText={(v) => setMonth(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" style={s.third} />
        <Field label={strings.setup.who.year} value={year} onChangeText={(v) => setYear(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" style={s.third} />
      </View>
      <TimeField label={strings.meds.times} value={time} onChange={setTime} />
      <AppText variant="h3">{A.address}</AppText>
      <Field label={A.street} optional value={f.place} onChangeText={(v) => set({ place: v })} hint={A.addressHint} icon="location" />
      <Field label={A.city} optional value={f.city} onChangeText={(v) => set({ city: v })} />
      <Field label={A.reference} optional value={f.reference} onChangeText={(v) => set({ reference: v })} />
      <Field label={A.phone} optional value={f.phone} onChangeText={(v) => set({ phone: v })} keyboardType="phone-pad" icon="phone" />
      <Field label={A.notes} optional value={f.notes} onChangeText={(v) => set({ notes: v })} multiline />
      <Field label={A.questions} optional value={f.questions} onChangeText={(v) => set({ questions: v })} hint={A.questionsHint} multiline />
      {error ? <AppText variant="caption" color={t.ink.danger}>{error}</AppText> : null}
      <Button label={R.add} icon="plus" onPress={add} />
    </View>
  );
}

// ── Recordatorios ────────────────────────────────────────────
function Reminders() {
  const t = useTheme();
  const s = useStyles();
  const undo = useUndo();
  const list = useRecords('reminders');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('11:00');
  const [days, setDays] = useState<Weekday[]>([]);
  return (
    <View style={s.stack}>
      {list.map((r) => (
        <Card key={r.id} style={s.item}>
          <Icon name="bell" color={t.ink.lavender} />
          <View style={s.flex}>
            <AppText variant="bodyStrong">{r.title}</AppText>
            <AppText variant="caption" color={t.c.muted}>{`${formatClock(r.time)} · ${describeDays(r.days)}`}</AppText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`${strings.common.delete} ${r.title}`} onPress={() => { routineActions.removeReminder(r.id); undo(r.title, () => routineActions.restoreReminder?.(r.id)); }} style={s.iconBtn}>
            <Icon name="trash" color={t.ink.danger} size={20} />
          </Pressable>
        </Card>
      ))}
      <Field label={R.reminderTitle} value={title} onChangeText={setTitle} />
      <TimeField label={strings.meds.times} value={time} onChange={setTime} />
      <DayPicker days={days} onChange={setDays} />
      <Button label={R.add} icon="plus" onPress={() => { if (title.trim()) { routineActions.addReminder(title.trim(), time, days); setTitle(''); } }} />
    </View>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    grow: { flexGrow: 1, flexBasis: 150 },
    third: { flexGrow: 1, flexBasis: 90 },
    stack: { gap: spacing.md },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.button },
    iconBtn: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  }),
);
