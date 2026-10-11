/**
 * Modo demostración (Ajustes > Avanzado, apagado por defecto). Crea UNA persona de ejemplo claramente marcada
 * "(demostración)" con una rutina mínima, y la borra al apagarlo. Nunca toca las personas reales.
 */
import { spreadTimes } from '@/domain/time';
import { db } from '@/infrastructure/local/db';
import { toISODate } from '@/utils/dates';

import { contactActions, elderActions, routineActions } from './actions';
import { medicationActions } from './care';
import { currentUserId } from './session';

const KEY = 'demoElderId';

export function enableDemo() {
  const userId = currentUserId();
  if (db.draft<string>(userId, KEY)) return;
  const elder = elderActions.create({
    firstName: 'Persona de ejemplo',
    lastName: '(demostración)',
    gender: 'undisclosed',
    birthDate: null,
    age: 78,
    weightKg: null,
    heightCm: null,
    relation: 'other',
    relationOther: 'Ejemplo',
  });
  elderActions.update(elder.id, { setupDone: true, setupStep: 8, checkinTime: '10:00' });
  routineActions.setWater(8, spreadTimes(8), elder.id);
  routineActions.addMeal('breakfast', '07:30', elder.id);
  routineActions.addMeal('lunch', '12:30', elder.id);
  routineActions.addMeal('dinner', '18:30', elder.id);
  routineActions.addActivity({ kind: 'walk', title: 'Caminar (ejemplo)', time: '17:00', minutes: 15 }, elder.id);
  contactActions.add({ name: 'Contacto de ejemplo', relation: 'Ejemplo', phone: '3000000000' }, elder.id);
  medicationActions.add(
    {
      name: 'Medicamento de ejemplo',
      activeIngredient: '',
      strength: '',
      form: 'tablet',
      doseAmount: 1,
      doseUnit: 'unit',
      schedule: { kind: 'times', times: ['08:00', '20:00'], days: [] },
      startDate: toISODate(new Date()),
      endDate: null,
      instructions: 'Dato de demostración',
      purpose: 'Ejemplo',
      description: '',
      unitsPerPackage: 30,
      unitsOnHand: 20,
      refillAlertDays: 7,
      photoUri: null,
      paused: false,
    },
    elder.id,
  );
  db.setDraft(userId, KEY, elder.id);
}

export function disableDemo() {
  const userId = currentUserId();
  const id = db.draft<string>(userId, KEY);
  if (!id) return;
  for (const coll of ['medications', 'doses', 'waterPlans', 'water', 'meals', 'mealLogs', 'activities', 'activityLogs', 'contacts', 'checkins', 'alerts', 'reminders', 'appointments'] as const) {
    db.list(coll, userId, id).forEach((r) => db.remove(coll, r.id));
  }
  db.remove('elders', id);
  const account = db.list('accounts', userId)[0];
  const next = db.list('elders', userId).find((e) => e.setupDone);
  if (account) db.update('accounts', account.id, { activeElderId: next?.id ?? null });
  db.setDraft(userId, KEY, undefined);
}
