/**
 * Casos de uso que escriben datos. Las pantallas y el asistente de BUDDY usan estas funciones; nunca tocan el store.
 * Cada escritura registra autor (cuenta conectada) y persona (adulto mayor activo o indicado).
 */
import { spreadTimes } from '@/domain/time';
import type { Activity, ActivityKind, ClockTime, Contact, Elder, Meal, MealKind, Weekday } from '@/domain/types';
import { ALERT_KINDS } from '@/domain/types';
import { db, type Actor } from '@/infrastructure/local/db';

import { currentAuthorId, currentUserId, useSession } from './session';

export function actor(elderId: string | null): Actor {
  return { userId: currentUserId(), elderId, by: currentAuthorId() };
}

export function activeElderId(): string | null {
  // El adulto mayor con su propio acceso solo ve su perfil.
  const linked = useSession.getState().user?.elderId;
  if (useSession.getState().user?.role === 'elder' && linked) return linked;
  const userId = currentUserId();
  const account = db.list('accounts', userId)[0];
  const elders = db.list('elders', userId);
  return (elders.find((e) => e.id === account?.activeElderId) ?? elders.find((e) => e.setupDone) ?? elders[0])?.id ?? null;
}

function requireElder(elderId?: string | null): string {
  const id = elderId ?? activeElderId();
  if (!id) throw new Error('No hay un adulto mayor registrado.');
  return id;
}

// ── Adulto mayor ─────────────────────────────────────────────

export type ElderBasics = Pick<Elder, 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'age' | 'weightKg' | 'heightCm' | 'relation' | 'relationOther'>;

export const elderActions = {
  create(basics: ElderBasics): Elder {
    const userId = currentUserId();
    const elder = db.insert(
      'elders',
      {
        ...basics,
        allergies: [],
        conditions: [],
        avoid: [],
        surgeries: [],
        insurer: '',
        doctor: '',
        dietRestrictions: [],
        foodAllergies: [],
        checkinTime: null,
        summaries: 'daily',
        alertPrefs: Object.fromEntries(ALERT_KINDS.map((k) => [k, true])) as Elder['alertPrefs'],
        screen: { textScale: 'large', appearance: 'auto', voice: false, voiceRate: 0.9, maxSnoozes: 2 },
        equivalences: {},
        setupStep: 2,
        setupDone: false,
      },
      { userId, elderId: null },
    );
    // El adulto mayor es su propio "elderId" para filtrar sus datos.
    db.update('elders', elder.id, { elderId: elder.id });
    elderActions.setActive(elder.id);
    return db.get('elders', elder.id)!;
  },
  update(id: string, patch: Partial<Elder>) {
    return db.update('elders', id, patch);
  },
  setActive(id: string) {
    const userId = currentUserId();
    const account = db.list('accounts', userId)[0];
    if (account) db.update('accounts', account.id, { activeElderId: id });
  },
  remove(id: string) {
    db.remove('elders', id);
  },
};

// ── Contactos ────────────────────────────────────────────────

export const contactActions = {
  add(input: Pick<Contact, 'name' | 'relation' | 'phone'> & { primary?: boolean }, elderId?: string) {
    const id = requireElder(elderId);
    const existing = db.list('contacts', currentUserId(), id);
    const primary = input.primary ?? existing.length === 0;
    if (primary) existing.filter((c) => c.primary).forEach((c) => db.update('contacts', c.id, { primary: false }));
    return db.insert('contacts', { name: input.name.trim(), relation: input.relation.trim(), phone: input.phone.trim(), primary }, actor(id));
  },
  update(id: string, patch: Partial<Contact>) {
    const c = db.get('contacts', id);
    if (c && patch.primary) db.list('contacts', c.ownerUserId, c.elderId).filter((x) => x.primary && x.id !== id).forEach((x) => db.update('contacts', x.id, { primary: false }));
    return db.update('contacts', id, patch);
  },
  remove: (id: string) => db.remove('contacts', id),
  restore: (id: string) => db.restore('contacts', id),
};

// ── Rutina ───────────────────────────────────────────────────

export const routineActions = {
  setWater(glasses: number, times?: ClockTime[], elderId?: string) {
    const id = requireElder(elderId);
    const t = times ?? spreadTimes(glasses);
    const plan = db.list('waterPlans', currentUserId(), id)[0];
    if (plan) return db.update('waterPlans', plan.id, { glasses, times: t });
    return db.insert('waterPlans', { glasses, times: t }, actor(id));
  },
  addMeal(kind: MealKind, time: ClockTime, elderId?: string): Meal {
    return db.insert('meals', { kind, time }, actor(requireElder(elderId)));
  },
  updateMeal: (id: string, patch: Partial<Meal>) => db.update('meals', id, patch),
  removeMeal: (id: string) => db.remove('meals', id),
  restoreMeal: (id: string) => db.restore('meals', id),
  addActivity(
    input: { kind: ActivityKind; title: string; time: ClockTime; minutes?: number | null; days?: Weekday[]; contactId?: string | null; stepsGoal?: number | null },
    elderId?: string,
  ): Activity {
    return db.insert(
      'activities',
      {
        kind: input.kind,
        title: input.title,
        time: input.time,
        minutes: input.minutes ?? null,
        days: input.days ?? [],
        contactId: input.contactId ?? null,
        stepsGoal: input.stepsGoal ?? null,
      },
      actor(requireElder(elderId)),
    );
  },
  updateActivity: (id: string, patch: Partial<Activity>) => db.update('activities', id, patch),
  removeActivity: (id: string) => db.remove('activities', id),
  restoreActivity: (id: string) => db.restore('activities', id),
  setCheckinTime(time: ClockTime | null, elderId?: string) {
    return db.update('elders', requireElder(elderId), { checkinTime: time });
  },
  addReminder(title: string, time: ClockTime, days: Weekday[], elderId?: string) {
    return db.insert('reminders', { title, time, days }, actor(requireElder(elderId)));
  },
  removeReminder: (id: string) => db.remove('reminders', id),
  restoreReminder: (id: string) => db.restore('reminders', id),
  restoreAppointment: (id: string) => db.restore('appointments', id),
  addAppointment(title: string, date: string, time: ClockTime, place: string, elderId?: string) {
    return db.insert('appointments', { title, date, time, place }, actor(requireElder(elderId)));
  },
  removeAppointment: (id: string) => db.remove('appointments', id),
};

export const DEFAULT_MEALS: { kind: MealKind; time: ClockTime }[] = [
  { kind: 'breakfast', time: '07:30' },
  { kind: 'lunch', time: '12:30' },
  { kind: 'dinner', time: '18:30' },
];
