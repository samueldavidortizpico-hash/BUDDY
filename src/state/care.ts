/**
 * Casos de uso del cuidado diario: medicamentos, tomas, existencias, avisos y respuestas del adulto mayor.
 * Los avisos son idempotentes: no se repite uno pendiente del mismo tipo para el mismo registro.
 */
import { reviewMedication, type ReviewFinding } from '@/domain/review';
import { displayStatus, missingDoses, snoozeTarget } from '@/domain/schedule';
import { afterDose, afterPurchase, estimateStock } from '@/domain/stock';
import type { Alert, AlertKind, Answer3, Medication, MealLog, Role } from '@/domain/types';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { toISODate } from '@/utils/dates';

import { actor, activeElderId } from './actions';
import { currentUserId } from './session';

const AK = strings.alertKinds;

function elderOrActive(elderId?: string | null) {
  const id = elderId ?? activeElderId();
  if (!id) throw new Error('No hay un adulto mayor registrado.');
  return id;
}

// ── Avisos ───────────────────────────────────────────────────

export const alertActions = {
  /** Crea un aviso si no hay uno pendiente igual (mismo tipo y registro) y si el cuidador lo quiere recibir. */
  raise(kind: AlertKind, detail: string, refId: string | null, elderId: string, title: string = AK[kind]): Alert | null {
    const userId = currentUserId();
    const elder = db.get('elders', elderId);
    const account = db.list('accounts', userId)[0];
    if (elder && elder.alertPrefs[kind] === false) return null;
    if (account && account.myAlerts[kind] === false && kind !== 'help_requested') return null;
    const dup = db.list('alerts', userId, elderId).find((a) => a.kind === kind && a.refId === refId && a.status === 'pending');
    if (dup) return dup;
    return db.insert('alerts', { kind, title, detail, refId, status: 'pending', snoozedUntil: null }, { userId, elderId });
  },
  attend: (id: string) => db.update('alerts', id, { status: 'attended' }),
  reopen: (id: string) => db.update('alerts', id, { status: 'pending' }),
  snooze(id: string, hours = 24) {
    return db.update('alerts', id, { snoozedUntil: new Date(Date.now() + hours * 3_600_000).toISOString() });
  },
};

// ── Medicamentos ─────────────────────────────────────────────

export type MedicationInput = Omit<Medication, keyof import('@/domain/types').SyncMeta>;

function runReview(med: Medication): ReviewFinding[] {
  const elder = med.elderId ? db.get('elders', med.elderId) : undefined;
  if (!elder) return [];
  const others = db.list('medications', med.ownerUserId, med.elderId);
  const findings = reviewMedication(med, elder, others);
  for (const f of findings) alertActions.raise(f.kind, f.reason, med.id, elder.id);
  return findings;
}

export const medicationActions = {
  add(input: MedicationInput, elderId?: string): { med: Medication; findings: ReviewFinding[] } {
    const id = elderOrActive(elderId);
    const med = db.insert('medications', input, actor(id));
    doseActions.sync(id, new Date());
    return { med, findings: runReview(med) };
  },
  update(id: string, patch: Partial<MedicationInput>): { med: Medication | undefined; findings: ReviewFinding[] } {
    const med = db.update('medications', id, patch);
    if (!med) return { med, findings: [] };
    // Las tomas futuras de hoy que ya no corresponden se eliminan; las respondidas se conservan.
    const today = toISODate(new Date());
    db.list('doses', med.ownerUserId, med.elderId)
      .filter((d) => d.medicationId === id && d.date === today && d.status === 'pending')
      .forEach((d) => db.remove('doses', d.id));
    if (med.elderId) doseActions.sync(med.elderId, new Date());
    return { med, findings: runReview(med) };
  },
  pause: (id: string, paused: boolean) => medicationActions.update(id, { paused }),
  remove(id: string) {
    const med = db.remove('medications', id);
    if (med) {
      const today = toISODate(new Date());
      db.list('doses', med.ownerUserId, med.elderId).filter((d) => d.medicationId === id && d.date >= today && d.status === 'pending').forEach((d) => db.remove('doses', d.id));
    }
    return med;
  },
  restore(id: string) {
    const med = db.restore('medications', id);
    if (med?.elderId) doseActions.sync(med.elderId, new Date());
    return med;
  },
  /** Suma una compra (cajas × unidades por caja + sueltas) y cierra los avisos de existencias. */
  registerPurchase(id: string, input: { packages?: number; units?: number }) {
    const med = db.get('medications', id);
    if (!med) return undefined;
    const unitsOnHand = afterPurchase(med.unitsOnHand, { ...input, unitsPerPackage: med.unitsPerPackage });
    const added = unitsOnHand - (med.unitsOnHand ?? 0);
    db.insert('stock', { medicationId: id, units: added, note: 'Compra' }, { userId: med.ownerUserId, elderId: med.elderId });
    db.list('alerts', med.ownerUserId, med.elderId)
      .filter((a) => (a.kind === 'stock_low' || a.kind === 'stock_out') && a.refId === id && a.status === 'pending')
      .forEach((a) => alertActions.attend(a.id));
    return db.update('medications', id, { unitsOnHand });
  },
  /** Corrección manual de existencias. */
  setStock(id: string, unitsOnHand: number | null) {
    const med = db.update('medications', id, { unitsOnHand });
    if (med) checkStock(med);
    return med;
  },
};

function checkStock(med: Medication) {
  if (!med.elderId) return;
  const est = estimateStock(med, toISODate(new Date()));
  if (est.level === 'out') alertActions.raise('stock_out', `${med.name}: no quedan unidades registradas.`, med.id, med.elderId);
  else if (est.level === 'low') alertActions.raise('stock_low', `${med.name}: quedan unos ${est.daysLeft} días (estimado).`, med.id, med.elderId);
}

// ── Tomas ────────────────────────────────────────────────────

export const doseActions = {
  /** Crea las tomas de hoy que falten para la persona. */
  sync(elderId: string, now: Date) {
    const userId = currentUserId();
    const date = toISODate(now);
    const meds = db.list('medications', userId, elderId);
    const doses = db.list('doses', userId, elderId);
    for (const d of missingDoses(meds, doses, date)) db.insert('doses', d, { userId, elderId });
  },
  confirm(doseId: string, by: Role) {
    const dose = db.update('doses', doseId, { status: 'taken', respondedAt: new Date().toISOString(), answeredBy: by });
    const med = dose ? db.get('medications', dose.medicationId) : undefined;
    if (med && med.unitsOnHand !== null) {
      const next = db.update('medications', med.id, { unitsOnHand: afterDose(med.unitsOnHand, med.doseAmount) });
      if (next) checkStock(next);
    }
    // Cierra el aviso de "sin confirmar" de esa toma, si lo había.
    if (dose) db.list('alerts', dose.ownerUserId, dose.elderId).filter((a) => a.kind === 'dose_unconfirmed' && a.refId === doseId && a.status === 'pending').forEach((a) => alertActions.attend(a.id));
    return dose;
  },
  snooze(doseId: string, by: Role) {
    const dose = db.get('doses', doseId);
    if (!dose) return undefined;
    return db.update('doses', doseId, { status: 'snoozed', snoozedTo: snoozeTarget(new Date()), snoozeCount: dose.snoozeCount + 1, answeredBy: by, respondedAt: new Date().toISOString() });
  },
  skip(doseId: string, by: Role) {
    return db.update('doses', doseId, { status: 'skipped', respondedAt: new Date().toISOString(), answeredBy: by });
  },
  /** El cuidador corrige una respuesta (vuelve a pendiente). */
  reset(doseId: string) {
    return db.update('doses', doseId, { status: 'pending', respondedAt: null, snoozedTo: null, answeredBy: null });
  },
};

/** Revisa tomas sin confirmar y existencias y levanta los avisos que correspondan. */
export function evaluateAlerts(elderId: string, now: Date) {
  const userId = currentUserId();
  const date = toISODate(now);
  const meds = new Map(db.list('medications', userId, elderId).map((m) => [m.id, m]));
  for (const d of db.list('doses', userId, elderId).filter((x) => x.date === date)) {
    const med = meds.get(d.medicationId);
    if (med && displayStatus(d, now) === 'unconfirmed') {
      alertActions.raise('dose_unconfirmed', `${med.name} de las ${d.time} sigue sin confirmar.`, d.id, elderId);
    }
  }
  meds.forEach((m) => checkStock(m));
}

// ── Respuestas del adulto mayor ──────────────────────────────

export const elderAnswers = {
  addWater(elderId?: string) {
    const id = elderOrActive(elderId);
    const now = new Date();
    return db.insert('water', { date: toISODate(now), at: now.toISOString() }, actor(id));
  },
  undoWater: (entryId: string) => db.remove('water', entryId),
  meal(mealId: string, answer: MealLog['answer'], elderId?: string) {
    const id = elderOrActive(elderId);
    const date = toISODate(new Date());
    const prev = db.list('mealLogs', currentUserId(), id).find((m) => m.mealId === mealId && m.date === date);
    if (prev) return db.update('mealLogs', prev.id, { answer });
    return db.insert('mealLogs', { mealId, date, answer }, actor(id));
  },
  activity(activityId: string, done: boolean, elderId?: string) {
    const id = elderOrActive(elderId);
    const date = toISODate(new Date());
    const prev = db.list('activityLogs', currentUserId(), id).find((m) => m.activityId === activityId && m.date === date);
    if (prev) return db.update('activityLogs', prev.id, { done });
    return db.insert('activityLogs', { activityId, date, done }, actor(id));
  },
  checkin(patch: { mood?: Answer3; sleep?: Answer3; unwell?: boolean }, elderId?: string) {
    const id = elderOrActive(elderId);
    const date = toISODate(new Date());
    const prev = db.list('checkins', currentUserId(), id).find((c) => c.date === date);
    const rec = prev ? db.update('checkins', prev.id, patch)! : db.insert('checkins', { date, mood: null, sleep: null, unwell: null, ...patch }, actor(id));
    if (patch.unwell === true || patch.mood === 'bad') {
      const elder = db.get('elders', id);
      alertActions.raise('checkin_unwell', `${elder?.firstName ?? 'Tu familiar'} respondió en el chequeo que no se siente bien.`, rec.id, id);
    }
    return rec;
  },
  requestHelp(elderId?: string) {
    const id = elderOrActive(elderId);
    const elder = db.get('elders', id);
    return alertActions.raise('help_requested', `${elder?.firstName ?? 'Tu familiar'} tocó "Pedir ayuda" a las ${new Date().toTimeString().slice(0, 5)}.`, `help-${Date.now()}`, id);
  },
};
