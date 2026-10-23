/**
 * Casos de uso del cuidado diario: medicamentos, tomas, existencias, avisos y respuestas del adulto mayor.
 * Los avisos son idempotentes: no se repite uno pendiente del mismo tipo para el mismo registro.
 */
import { reviewMedication, type ReviewFinding } from '@/domain/review';
import { displayStatus, dueForReview, escalationOf, missingDoses, snoozeTarget, timesOn } from '@/domain/schedule';
import { afterDose, afterPurchase, estimateStock } from '@/domain/stock';
import { withDoseSlots } from '@/domain/dose-safety';
import { toMinutes } from '@/domain/time';
import type { Alert, AlertKind, Answer3, DoseEvent, Medication, MealLog, Role } from '@/domain/types';
import type { HeartbeatKind, NotificationPermission } from '@/domain/verification';
import { db } from '@/infrastructure/local/db';
import { createLocalHeartbeats } from '@/infrastructure/local/heartbeats';
import { strings } from '@/i18n';
import { cancelDoseNotifications } from '@/infrastructure/notifications';
import { atClock, toISODate } from '@/utils/dates';

import { actor, activeElderId } from './actions';
import { currentAuthorId, currentUserId } from './session';

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
    // Si ya llega con pocas unidades, se avisa de una vez (antes esperaba a la primera toma confirmada).
    checkStock(med);
    return { med, findings: runReview(med) };
  },
  update(id: string, patch: Partial<MedicationInput>): { med: Medication | undefined; findings: ReviewFinding[] } {
    const before = db.get('medications', id);
    if (!before || before.deletedAt) return { med: undefined, findings: [] };
    const now = new Date();
    if (before.elderId) doseActions.sync(before.elderId, now);
    const med = db.update('medications', id, patch)!;
    const changed = ['schedule', 'startDate', 'endDate', 'paused'].some(key => key in patch && JSON.stringify(before[key as keyof Medication]) !== JSON.stringify(med[key as keyof Medication]));
    if (changed) {
      const today = toISODate(now);
      const all = withDoseSlots(db.list('doses', med.ownerUserId, med.elderId).filter(d => d.medicationId === id));
      for (const date of new Set(all.filter(d => d.date >= today).map(d => d.date))) {
        const day = all.filter(d => d.date === date);
        const times = timesOn(med, date);
        // R3: con una toma ya registrada, el cupo de hoy se congela y el horario nuevo completo rige mañana. Sin registros,
        // el horario nuevo rige hoy (R2: pendientes ≤ programadas − registradas = programadas).
        const registered = day.some(d => d.status === 'taken' || d.status === 'skipped');
        const dayLimit = registered ? Math.min(day.length, times.length, ...day.map(d => d.dayLimit ?? day.length)) : times.length;
        for (const d of day) {
          const patch: Partial<DoseEvent> = { slot: d.slot, dayLimit };
          if (d.status === 'taken' || d.status === 'skipped') {
            // La hora registrada se conserva; el cambio queda como otro evento.
            writeDose(d, patch, 'schedule_changed', 'caregiver');
          } else if (d.cancelledAt) {
            // Una posición cancelada por bajar la frecuencia vuelve si el horario la recupera y nada se registró hoy.
            if (!registered && d.slot < dayLimit) {
              const time = times[d.slot];
              writeDose(d, { ...patch, time, status: 'pending', snoozedTo: null, cancelledAt: null, safetyHold: atClock(date, time) <= now }, 'reschedule', 'caregiver');
            }
          } else {
            if (d.slot >= dayLimit) {
              cancelDose(d, 'caregiver', patch);
            } else {
              const time = times[d.slot];
              closeDoseAlerts(d);
              cancelNotices(d);
              writeDose(d, { ...patch, time, status: 'pending', snoozedTo: null,
                safetyHold: d.safetyHold || (time !== d.time && atClock(date, time) <= now) }, 'reschedule', 'caregiver');
            }
          }
        }
      }
      if (med.elderId) doseActions.sync(med.elderId, now);
    }
    return { med, findings: runReview(med) };
  },
  pause: (id: string, paused: boolean) => medicationActions.update(id, { paused }),
  remove(id: string) {
    const med = db.remove('medications', id);
    if (med) {
      const today = toISODate(new Date());
      const related = db.list('doses', med.ownerUserId, med.elderId).filter(d => d.medicationId === id);
      related.filter(d => d.date >= today && d.status !== 'taken' && d.status !== 'skipped' && !d.cancelledAt).forEach(d => cancelDose(d, 'caregiver'));
      const refs = new Set([id, ...related.map(d => d.id)]);
      db.list('alerts', med.ownerUserId, med.elderId).filter(a => a.status === 'pending' && a.refId && refs.has(a.refId)).forEach(a => alertActions.attend(a.id));
      void cancelDoseNotifications(id).catch(() => recordCancellationFailure(med.elderId));
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
    const next = db.update('medications', id, { unitsOnHand });
    if (next) checkStock(next);
    return next;
  },
  /** Corrección manual de existencias. */
  setStock(id: string, unitsOnHand: number | null) {
    const med = db.update('medications', id, { unitsOnHand });
    if (med) checkStock(med);
    return med;
  },
};

/**
 * Un solo aviso por medicamento y nivel en cada ciclo: aunque el cuidador lo marque como atendido sin comprar, las
 * tomas siguientes no repiten el aviso. El ciclo se reinicia cuando las existencias vuelven a nivel normal (compra o
 * corrección). A 0 hay un aviso adicional ("agotado").
 */
function checkStock(med: Medication) {
  if (!med.elderId) return;
  const est = estimateStock(med, toISODate(new Date()));
  db.list('alerts', med.ownerUserId, med.elderId)
    .filter(a => a.refId === med.id && a.status === 'pending' && ((a.kind === 'stock_out' && est.level !== 'out') || (a.kind === 'stock_low' && (est.level === 'ok' || est.level === 'none'))))
    .forEach(a => alertActions.attend(a.id));
  const done = [...(med.stockAlerted ?? [])];
  if (est.level === 'ok' || est.level === 'none') {
    if (done.length) db.update('medications', med.id, { stockAlerted: [] });
    return;
  }
  const raise = (kind: 'stock_low' | 'stock_out', detail: string) => {
    if (done.includes(kind)) return;
    alertActions.raise(kind, detail, med.id, med.elderId!);
    done.push(kind);
  };
  raise('stock_low', `${med.name}: quedan unos ${est.daysLeft} días (estimado).`);
  if (est.level === 'out') raise('stock_out', `${med.name}: no quedan unidades registradas.`);
  db.update('medications', med.id, { stockAlerted: [...done] });
}

// ── Tomas ────────────────────────────────────────────────────

/** Todos los cambios de una toma agregan eventos; los registros antiguos se conservan como snapshot legacy. */
function writeDose(dose: DoseEvent, patch: Partial<DoseEvent>, action: string, role: Role) {
  const snapshot = (d: DoseEvent) => ({ date: d.date, time: d.time, status: d.status, snoozedTo: d.snoozedTo, stockApplied: d.stockApplied });
  const history = dose.history?.length ? dose.history : [{ at: dose.respondedAt ?? dose.createdAt, by: dose.createdBy, action: 'legacy', to: snapshot(dose) }];
  return db.update('doses', dose.id, { ...patch, history: [...history, { at: new Date().toISOString(), by: currentAuthorId(), role, action, from: snapshot(dose), to: snapshot({ ...dose, ...patch }) }] });
}
function closeDoseAlerts(dose: DoseEvent) {
  db.list('alerts', dose.ownerUserId, dose.elderId).filter(a => a.kind === 'dose_unconfirmed' && a.refId === dose.id && a.status === 'pending').forEach(a => alertActions.attend(a.id));
}
function recordCancellationFailure(elderId: string | null) {
  if (elderId) db.setDraft(currentUserId(), `doseSafety.cancellationFailed.${elderId}`, true);
}
function cancelNotices(dose: DoseEvent) {
  void cancelDoseNotifications(dose.medicationId, dose.date, dose.time).catch(() => recordCancellationFailure(dose.elderId));
}
function cancelDose(dose: DoseEvent, by: Role, patch: Partial<DoseEvent> = {}) {
  closeDoseAlerts(dose);
  cancelNotices(dose);
  return writeDose(dose, { ...patch, cancelledAt: new Date().toISOString() }, 'cancel', by);
}
/** Delta real, no dosis teórica: si había 0.25 y se descuentan hasta 0, solo se devuelven 0.25. */
function reconcileStock(dose: DoseEvent, taken: boolean): number | null {
  const med = db.get('medications', dose.medicationId);
  if (!med || med.unitsOnHand === null) return taken ? dose.stockApplied ?? null : null;
  let applied = dose.stockApplied ?? null;
  let unitsOnHand = med.unitsOnHand;
  if (taken && applied === null) {
    unitsOnHand = afterDose(med.unitsOnHand, med.doseAmount)!;
    applied = Math.round((med.unitsOnHand - unitsOnHand) * 100) / 100;
  } else if (!taken && applied !== null) {
    unitsOnHand = Math.round((med.unitsOnHand + applied) * 100) / 100;
    applied = null;
  }
  const delta = Math.round((unitsOnHand - med.unitsOnHand) * 100) / 100;
  if (delta) {
    db.insert('stock', { medicationId: med.id, units: delta, note: taken ? `Toma ${dose.id}` : `Corrección de toma ${dose.id}` }, actor(med.elderId));
    const next = db.update('medications', med.id, { unitsOnHand });
    if (next) checkStock(next);
  }
  return applied;
}
function answerDose(doseId: string, status: 'taken' | 'skipped', by: Role) {
  const dose = db.get('doses', doseId);
  if (!dose || dose.deletedAt || dose.cancelledAt) return undefined;
  const med = db.get('medications', dose.medicationId);
  if (!med || med.deletedAt) return undefined;
  if (by === 'elder' && dose.elderId) beat(dose.elderId, 'answer');
  const stockApplied = reconcileStock(dose, status === 'taken');
  closeDoseAlerts(dose);
  cancelNotices(dose);
  return writeDose(dose, { status, respondedAt: new Date().toISOString(), answeredBy: by, snoozedTo: null, stockApplied, safetyHold: false }, status === 'taken' ? 'confirm' : 'skip', by);
}

export const doseActions = {
  /** Crea las tomas de hoy que falten para la persona. */
  sync(elderId: string, now: Date) {
    const userId = currentUserId();
    const date = toISODate(now);
    const meds = db.list('medications', userId, elderId);
    const doses = db.list('doses', userId, elderId);
    for (const d of missingDoses(meds, doses, date)) db.insert('doses', { ...d, history: [{ at: now.toISOString(), by: currentAuthorId(), action: 'created', to: { date: d.date, time: d.time, status: d.status } }] }, actor(elderId));
  },
  confirm(doseId: string, by: Role) {
    return answerDose(doseId, 'taken', by);
  },
  snooze(doseId: string, by: Role) {
    const dose = db.get('doses', doseId);
    if (!dose || dose.deletedAt || dose.cancelledAt || dose.safetyHold || dose.status === 'taken' || dose.status === 'skipped') return undefined;
    if (by === 'elder' && dose.elderId) beat(dose.elderId, 'answer');
    closeDoseAlerts(dose);
    cancelNotices(dose);
    return writeDose(dose, { status: 'snoozed', snoozedTo: snoozeTarget(new Date()), snoozeCount: dose.snoozeCount + 1, answeredBy: by, respondedAt: new Date().toISOString() }, 'snooze', by);
  },
  skip(doseId: string, by: Role) {
    return answerDose(doseId, 'skipped', by);
  },
  /** Una corrección conserva el historial y requiere verificar antes de pedir otra dosis. */
  reset(doseId: string) {
    const dose = db.get('doses', doseId);
    if (!dose || dose.deletedAt || dose.cancelledAt) return undefined;
    const stockApplied = reconcileStock(dose, false);
    closeDoseAlerts(dose);
    cancelNotices(dose);
    return writeDose(dose, { status: 'pending', respondedAt: null, snoozedTo: null, answeredBy: null, stockApplied, safetyHold: true }, 'reset', 'caregiver');
  },
  /** Cancelación de una ocurrencia: conserva su posición para que sync no la vuelva a crear. */
  remove(doseId: string, by: Role = 'caregiver') {
    const dose = db.get('doses', doseId);
    if (!dose || dose.deletedAt || dose.cancelledAt) return undefined;
    return cancelDose(dose, by);
  },
};

/** Revisa tomas sin confirmar y existencias y levanta los avisos que correspondan. */
export function evaluateAlerts(elderId: string, now: Date) {
  const userId = currentUserId();
  const date = toISODate(now);
  const meds = new Map(db.list('medications', userId, elderId).map((m) => [m.id, m]));
  const { unconfirmedAfterMin } = escalationOf(db.get('elders', elderId)?.screen);
  for (const d of db.list('doses', userId, elderId).filter((x) => dueForReview(x, date, unconfirmedAfterMin))) {
    const med = meds.get(d.medicationId);
    if (med && !med.paused && !d.cancelledAt && !d.safetyHold && displayStatus(d, now, unconfirmedAfterMin) === 'unconfirmed') {
      alertActions.raise('dose_unconfirmed', `${med.name} de las ${d.time} sigue sin confirmar.`, d.id, elderId);
    }
  }
  meds.forEach((m) => checkStock(m));
}

// ── Respuestas del adulto mayor ──────────────────────────────

export const elderAnswers = {
  addWater(elderId?: string) {
    const id = elderOrActive(elderId);
    beat(id, 'answer');
    const now = new Date();
    return db.insert('water', { date: toISODate(now), at: now.toISOString() }, actor(id));
  },
  undoWater: (entryId: string) => db.remove('water', entryId),
  meal(mealId: string, answer: MealLog['answer'], elderId?: string) {
    const id = elderOrActive(elderId);
    beat(id, 'answer');
    const date = toISODate(new Date());
    const prev = db.list('mealLogs', currentUserId(), id).find((m) => m.mealId === mealId && m.date === date);
    if (prev) return db.update('mealLogs', prev.id, { answer });
    return db.insert('mealLogs', { mealId, date, answer }, actor(id));
  },
  activity(activityId: string, done: boolean, elderId?: string) {
    const id = elderOrActive(elderId);
    beat(id, 'answer');
    const date = toISODate(new Date());
    const prev = db.list('activityLogs', currentUserId(), id).find((m) => m.activityId === activityId && m.date === date);
    if (prev) return db.update('activityLogs', prev.id, { done });
    return db.insert('activityLogs', { activityId, date, done }, actor(id));
  },
  checkin(patch: { mood?: Answer3; sleep?: Answer3; unwell?: boolean }, elderId?: string) {
    const id = elderOrActive(elderId);
    beat(id, 'checkin');
    const date = toISODate(new Date());
    const prev = db.list('checkins', currentUserId(), id).find((c) => c.date === date);
    const rec = prev ? db.update('checkins', prev.id, patch)! : db.insert('checkins', { date, mood: null, sleep: null, unwell: null, ...patch }, actor(id));
    if (patch.unwell === true || patch.mood === 'bad') {
      const elder = db.get('elders', id);
      alertActions.raise('checkin_unwell', `${elder?.firstName ?? 'Tu familiar'} respondió en el chequeo que no se siente bien.`, rec.id, id);
    }
    return rec;
  },
  automationResponse(reminderId: string, answer: string, elderId?: string) {
    const id = elderOrActive(elderId);
    const reminder = db.get('reminders', reminderId);
    if (!reminder?.automation || reminder.elderId !== id) return;
    const date = toISODate(new Date());
    const prev = db.list('checkins', currentUserId(), id).find((c) => c.date === date);
    const automationAnswers = { ...(prev?.automationAnswers ?? {}), [reminderId]: { answer, respondedAt: new Date().toISOString() } };
    if (prev) db.update('checkins', prev.id, { automationAnswers });
    else db.insert('checkins', { date, mood: null, sleep: null, unwell: null, automationAnswers }, actor(id));
    const raw = answer.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (reminder.automation.kind === 'mood') this.checkin({ mood: raw === 'mal' ? 'bad' : raw === 'regular' ? 'regular' : 'good' }, id);
    if (reminder.automation.kind === 'sleep') this.checkin({ sleep: raw === 'mal' ? 'bad' : raw === 'regular' ? 'regular' : 'good' }, id);
    if (reminder.automation.kind === 'emotional') this.checkin({ unwell: /si|mal/.test(raw) && !/no/.test(raw) }, id);
    if (reminder.automation.kind === 'water' && /si|ya/.test(raw)) this.addWater(id);
    if (reminder.automation.kind === 'meal') {
      const meals = db.list('meals', currentUserId(), id).slice().sort((a, b) => Math.abs(toMinutes(a.time) - toMinutes(reminder.time)) - Math.abs(toMinutes(b.time) - toMinutes(reminder.time)));
      if (meals[0]) this.meal(meals[0].id, /si|ya/.test(raw) ? 'yes' : 'no', id);
    }
    if (reminder.automation.kind === 'walk') {
      const walk = db.list('activities', currentUserId(), id).find((a) => a.kind === 'walk');
      if (walk) this.activity(walk.id, /si|ya/.test(raw) && !/no|todavia/.test(raw), id);
    }
    beat(id, 'answer');
    return reminder;
  },
  requestHelp(elderId?: string) {
    const id = elderOrActive(elderId);
    beat(id, 'answer');
    const elder = db.get('elders', id);
    return alertActions.raise('help_requested', `${elder?.firstName ?? 'Tu familiar'} tocó "Pedir ayuda" a las ${new Date().toTimeString().slice(0, 5)}.`, `help-${Date.now()}`, id);
  },
};

// ── Avisos entregados al sistema (aviso escalonado, V3.0) ───────

/** Último plan que aceptó el sistema del celular del adulto mayor: estado del permiso y claves programadas. */
export interface NotifyLog {
  at: string;
  /** 'granted' | 'denied' | 'undetermined' | 'unsupported' (web). */
  state: string;
  keys: string[];
}

const notifyKey = (elderId: string) => `notify.log.${elderId}`;

export const notifyLog = {
  record(elderId: string, state: string, keys: string[]) {
    const prev = notifyLog.get(elderId);
    // Solo escribe si cambió: escribir recalcula las pantallas que lo leen.
    if (prev && prev.state === state && prev.keys.join('|') === keys.join('|')) return;
    db.setDraft(currentUserId(), notifyKey(elderId), { at: new Date().toISOString(), state, keys } satisfies NotifyLog);
  },
  get: (elderId: string) => db.draft<NotifyLog>(currentUserId(), notifyKey(elderId)) ?? null,
  key: notifyKey,
};

/** ¿El aviso a la hora de esta toma quedó entregado al sistema del celular? (No significa que lo vio.) */
export const doseDelivered = (log: NotifyLog | null, d: Pick<DoseEvent, 'medicationId' | 'date' | 'time'>) =>
  !!log && log.state === 'granted' && log.keys.includes(`med-${d.medicationId}-${d.date}-${d.time}`);

// ── Señales de vida (detección de silencio, V3.0) ───────────────

/** Repositorio de señales de vida del celular del adulto mayor (local; servidor en la fase de backend). */
export const heartbeats = createLocalHeartbeats(currentUserId);

const OPEN_EVERY_MS = 5 * 60_000;

/**
 * Registra una señal de vida. Aperturas: como mucho una cada 5 minutos. Permisos: solo si cambió el estado o pasó una
 * hora (no se llena el registro con lo mismo cada vez que se reprograma).
 */
export function beat(elderId: string, kind: HeartbeatKind, notifications?: NotificationPermission) {
  const now = Date.now();
  const list = heartbeats.recent(elderId);
  if (kind === 'app_open') {
    const last = [...list].reverse().find((b) => b.kind === 'app_open');
    if (last && now - Date.parse(last.at) < OPEN_EVERY_MS) return;
  }
  if (kind === 'permissions') {
    const last = [...list].reverse().find((b) => b.notifications);
    if (last && last.notifications === notifications && now - Date.parse(last.at) < 60 * 60_000) return;
  }
  heartbeats.record(elderId, { at: new Date(now).toISOString(), kind, ...(notifications ? { notifications } : {}) });
}
