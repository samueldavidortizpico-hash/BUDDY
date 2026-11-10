/**
 * Casos de uso que escriben datos. Las pantallas y el asistente de BUDDY usan estas funciones; nunca tocan el store.
 * Cada escritura registra autor (cuenta conectada) y persona (adulto mayor activo o indicado).
 *
 * Autorización (auditoría 2026-11-10, SEC-02 y SEC-03): la base ya impide salir de la cuenta y la persona de la sesión;
 * aquí cada caso de uso consulta además la matriz de roles con el rol EFECTIVO (`allowed`). El perfil, la rutina y los
 * contactos los configura el administrador; el adulto mayor solo cambia la apariencia de su pantalla (`setLook`).
 * Sin permiso, los casos de uso que devuelven un valor opcional no hacen nada; los que deben devolver el registro
 * creado lanzan un error (las pantallas y el asistente solo los ofrecen a quien puede usarlos).
 */
import { isLinkedRole, type Permission } from '@/domain/permissions';
import { spreadTimes } from '@/domain/time';
import type { Activity, ActivityKind, Appointment, ClockTime, Contact, Elder, Meal, MealKind, Weekday } from '@/domain/types';
import { ALERT_KINDS } from '@/domain/types';
import { db, newId, type Actor, type Patch } from '@/infrastructure/local/db';

import { actingRole, allowed, currentAuthorId, currentUserId, useSession } from './session';

export function actor(elderId: string | null): Actor {
  return { userId: currentUserId(), elderId, by: currentAuthorId() };
}

export function activeElderId(): string | null {
  // El adulto mayor con su propio acceso solo ve su perfil.
  const linked = useSession.getState().user?.elderId;
  if (isLinkedRole(useSession.getState().user?.role) && linked) return linked;
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

/** Para los casos de uso que deben devolver el registro creado: sin permiso no hay nada que devolver. */
function need(action: Permission, elderId?: string | null) {
  if (!allowed(action, elderId)) throw new Error('BUDDY: esta acción es del administrador.');
}

// ── Adulto mayor ─────────────────────────────────────────────

export type ElderBasics = Pick<Elder, 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'age' | 'weightKg' | 'heightCm' | 'relation' | 'relationOther' | 'phone'>;

export const elderActions = {
  create(basics: ElderBasics): Elder {
    need('edit_profile');
    const userId = currentUserId();
    // El adulto mayor es su propio "elderId" (así se filtran sus datos). El id se genera antes de insertar: la persona
    // es un metadato protegido y ya no se reescribe después.
    const id = newId();
    db.insert(
      'elders',
      {
        id,
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
      { userId, elderId: id },
    );
    elderActions.setActive(id);
    return db.get('elders', id)!;
  },
  update(id: string, patch: Patch<'elders'>) {
    return allowed('edit_profile', id) ? db.update('elders', id, patch) : undefined;
  },
  /**
   * Apariencia de SU pantalla (tamaño de letra y tema): lo único del perfil que cambia el propio adulto mayor, con su
   * cuenta o en el teléfono entregado. La rutina y el resto del perfil son del administrador.
   */
  setLook(id: string, patch: Partial<Pick<Elder['screen'], 'textScale' | 'appearance'>>) {
    const elder = db.get('elders', id);
    if (!elder || actingRole(id) === 'nurse') return undefined;
    const { textScale = elder.screen.textScale, appearance = elder.screen.appearance } = patch;
    return db.update('elders', id, { screen: { ...elder.screen, textScale, appearance } });
  },
  setActive(id: string) {
    if (!allowed('settings') || !db.get('elders', id)) return;
    const account = db.list('accounts', currentUserId())[0];
    if (account) db.update('accounts', account.id, { activeElderId: id });
  },
  remove(id: string) {
    if (allowed('edit_profile', id)) db.remove('elders', id);
  },
};

// ── Contactos ────────────────────────────────────────────────

export const contactActions = {
  add(input: Pick<Contact, 'name' | 'relation' | 'phone'> & { primary?: boolean }, elderId?: string) {
    const id = requireElder(elderId);
    need('edit_routine', id);
    const existing = db.list('contacts', currentUserId(), id);
    const primary = input.primary ?? existing.length === 0;
    if (primary) existing.filter((c) => c.primary).forEach((c) => db.update('contacts', c.id, { primary: false }));
    return db.insert('contacts', { name: input.name.trim(), relation: input.relation.trim(), phone: input.phone.trim(), primary }, actor(id));
  },
  update(id: string, patch: Patch<'contacts'>) {
    const c = db.get('contacts', id);
    if (!c || !allowed('edit_routine', c.elderId)) return undefined;
    if (patch.primary) db.list('contacts', c.ownerUserId, c.elderId).filter((x) => x.primary && x.id !== id).forEach((x) => db.update('contacts', x.id, { primary: false }));
    return db.update('contacts', id, patch);
  },
  remove: (id: string) => (allowed('edit_routine', db.get('contacts', id)?.elderId) ? db.remove('contacts', id) : undefined),
  restore: (id: string) => (allowed('edit_routine', db.get('contacts', id)?.elderId) ? db.restore('contacts', id) : undefined),
};

// ── Rutina ───────────────────────────────────────────────────

/** Cambia, borra o restaura un elemento de la rutina solo si el rol efectivo puede configurarla. */
const routine = <T>(elderId: string | null | undefined, run: () => T): T | undefined => (allowed('edit_routine', elderId) ? run() : undefined);

export const routineActions = {
  setWater(glasses: number, times?: ClockTime[], elderId?: string) {
    const id = requireElder(elderId);
    need('edit_routine', id);
    const t = times ?? spreadTimes(glasses);
    const plan = db.list('waterPlans', currentUserId(), id)[0];
    if (plan) return db.update('waterPlans', plan.id, { glasses, times: t });
    return db.insert('waterPlans', { glasses, times: t }, actor(id));
  },
  addMeal(kind: MealKind, time: ClockTime, elderId?: string): Meal {
    const id = requireElder(elderId);
    need('edit_routine', id);
    return db.insert('meals', { kind, time }, actor(id));
  },
  updateMeal: (id: string, patch: Patch<'meals'>) => routine(db.get('meals', id)?.elderId, () => db.update('meals', id, patch)),
  removeMeal: (id: string) => routine(db.get('meals', id)?.elderId, () => db.remove('meals', id)),
  restoreMeal: (id: string) => routine(db.get('meals', id)?.elderId, () => db.restore('meals', id)),
  addActivity(
    input: { kind: ActivityKind; title: string; time: ClockTime; minutes?: number | null; days?: Weekday[]; contactId?: string | null; stepsGoal?: number | null },
    elderId?: string,
  ): Activity {
    const id = requireElder(elderId);
    need('edit_routine', id);
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
      actor(id),
    );
  },
  updateActivity: (id: string, patch: Patch<'activities'>) => routine(db.get('activities', id)?.elderId, () => db.update('activities', id, patch)),
  removeActivity: (id: string) => routine(db.get('activities', id)?.elderId, () => db.remove('activities', id)),
  restoreActivity: (id: string) => routine(db.get('activities', id)?.elderId, () => db.restore('activities', id)),
  setCheckinTime(time: ClockTime | null, elderId?: string) {
    const id = requireElder(elderId);
    return routine(id, () => db.update('elders', id, { checkinTime: time }));
  },
  /** `date`: solo ese día (mensaje del cuidador); sin fecha se repite según `days`. */
  addReminder(title: string, time: ClockTime, days: Weekday[], elderId?: string, date: string | null = null) {
    const id = requireElder(elderId);
    need('edit_routine', id);
    return db.insert('reminders', { title, time, days, date }, actor(id));
  },
  removeReminder: (id: string) => routine(db.get('reminders', id)?.elderId, () => db.remove('reminders', id)),
  restoreReminder: (id: string) => routine(db.get('reminders', id)?.elderId, () => db.restore('reminders', id)),
  restoreAppointment: (id: string) => routine(db.get('appointments', id)?.elderId, () => db.restore('appointments', id)),
  addAppointment(title: string, date: string, time: ClockTime, place: string, elderId?: string, extra: Partial<Pick<Appointment, 'doctor' | 'institution' | 'city' | 'reference' | 'phone' | 'notes' | 'questions'>> = {}) {
    const id = requireElder(elderId);
    need('edit_routine', id);
    return db.insert('appointments', { title, date, time, place, ...extra }, actor(id));
  },
  updateAppointment: (id: string, patch: Patch<'appointments'>) => routine(db.get('appointments', id)?.elderId, () => db.update('appointments', id, patch)),
  removeAppointment: (id: string) => routine(db.get('appointments', id)?.elderId, () => db.remove('appointments', id)),
};

export const DEFAULT_MEALS: { kind: MealKind; time: ClockTime }[] = [
  { kind: 'breakfast', time: '07:30' },
  { kind: 'lunch', time: '12:30' },
  { kind: 'dinner', time: '18:30' },
];
