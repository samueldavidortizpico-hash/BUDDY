/**
 * Ejecutor del asistente BUDDY y respuestas a consultas. Cada acción pasa por `can(rol, acción)` y por los casos de
 * uso (nunca toca el store directamente). Las consultas responden SOLO con registros reales.
 */
import { applyAnswer, interpretText } from '@/domain/assistant/engine';
import type { AssistantAction, Interpretation, MissingField } from '@/domain/assistant/types';
import { activitySummary, adherence, answersBy, mealsSummary, waterByDay } from '@/domain/health';
import { can } from '@/domain/permissions';
import { dayDoses, doseText, effectiveTime, stockUnit } from '@/domain/schedule';
import { estimateStock } from '@/domain/stock';
import { describeDays } from '@/domain/time';
import type { AssistantMessage } from '@/domain/types';
import { formatPhone, normalizeText } from '@/domain/validation';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { formatClock, toISODate } from '@/utils/dates';

import { activeElderId, actor, contactActions, routineActions } from './actions';
import { medicationActions } from './care';
import { currentUserId } from './session';

export interface Proposal {
  actions: AssistantAction[];
  missing: MissingField[];
}

export interface ExecResult {
  ok: boolean;
  summary: string;
  undo?: () => void;
}

const ANSWER = strings.answers;

export const SUGGESTIONS: { kind: 'walk' | 'stretch' | 'air' | 'breath' | 'music' | 'call'; title: string; time: string; minutes: number; why: string }[] = [
  { kind: 'walk', title: 'Caminar 15 minutos', time: '17:00', minutes: 15, why: 'Una caminata corta y suave ayuda a moverse a diario.' },
  { kind: 'stretch', title: 'Estirarse 10 minutos', time: '09:00', minutes: 10, why: 'Estiramientos suaves al despertar.' },
  { kind: 'air', title: 'Tomar aire fresco', time: '11:00', minutes: 10, why: 'Salir al balcón o a la puerta un rato.' },
  { kind: 'breath', title: 'Respiración tranquila', time: '20:00', minutes: 5, why: 'Unos minutos de calma antes de dormir.' },
  { kind: 'music', title: 'Escuchar música que le guste', time: '15:00', minutes: 20, why: 'La música favorita acompaña la tarde.' },
  { kind: 'call', title: 'Llamar a un familiar', time: '18:00', minutes: 10, why: 'Una llamada para conversar.' },
];

function elderOrThrow() {
  const id = activeElderId();
  if (!id) throw new Error('Primero registra a tu familiar.');
  return id;
}

function findMed(match: string) {
  const elderId = elderOrThrow();
  const n = normalizeText(match);
  return db.list('medications', currentUserId(), elderId).find((m) => normalizeText(m.name) === n || normalizeText(m.name).includes(n) || n.includes(normalizeText(m.name)));
}

export function context() {
  const userId = currentUserId();
  const elderId = activeElderId();
  const elder = elderId ? db.get('elders', elderId) : undefined;
  return {
    elderName: elder?.firstName ?? 'tu familiar',
    medicationNames: elderId ? db.list('medications', userId, elderId).map((m) => m.name) : [],
    contactNames: elderId ? db.list('contacts', userId, elderId).map((c) => c.name) : [],
  };
}

export function interpret(text: string): Interpretation {
  return interpretText(text, context());
}

export function answer(proposal: Proposal, text: string): Proposal {
  const [m, ...rest] = proposal.missing;
  if (!m) return proposal;
  const actions = proposal.actions.map((a, i) => (i === m.actionIndex ? applyAnswer(a, m.field, text) : a));
  return { actions, missing: rest };
}

/** Texto de la propuesta, para mostrar y para leer en voz alta. */
export function describe(a: AssistantAction): string {
  switch (a.type) {
    case 'add_medication': {
      const when = a.everyHours ? `cada ${a.everyHours} h desde ${formatClock(a.from ?? '08:00')}` : a.times.map(formatClock).join(', ') || 'hora por definir';
      const dose = a.doseAmount ? doseText({ doseAmount: a.doseAmount, doseUnit: a.doseUnit, form: a.form }) : 'dosis por definir';
      return `Agregar ${a.name}${a.strength ? ` ${a.strength}` : ''}: ${dose}, ${when}, ${describeDays(a.days).toLowerCase()}.`;
    }
    case 'update_medication':
      return `Cambiar ${a.match || 'el medicamento'}${a.times ? ` a las ${a.times.map(formatClock).join(', ')}` : ''}${a.doseAmount ? ` (dosis ${a.doseAmount})` : ''}.`;
    case 'remove_medication':
      return `Quitar ${a.match || 'el medicamento'} de la rutina.`;
    case 'update_stock':
      return `Sumar ${a.units} ${a.boxes ? 'cajas' : 'unidades'} a ${a.match || 'el medicamento'}.`;
    case 'set_water_goal':
      return `Meta de ${a.glasses} vasos de agua: ${a.times.map(formatClock).join(', ')}.`;
    case 'add_activity_goal':
      return `${a.title}${a.time ? ` a las ${formatClock(a.time)}` : ''}, ${describeDays(a.days).toLowerCase()}.`;
    case 'set_steps_goal':
      return `Meta de ${a.steps} pasos (se mide solo con reloj conectado; si no, confirmará "hice mi caminata").`;
    case 'add_emergency_contact':
      return `Contacto de emergencia: ${a.name || 'sin nombre'}${a.relation ? ` (${a.relation})` : ''}, ${formatPhone(a.phone)}.`;
    case 'update_emergency_contact':
      return `Cambiar el teléfono de ${a.match} a ${formatPhone(a.phone)}.`;
    case 'set_checkin_time':
      return `Chequeo diario a las ${formatClock(a.time)}.`;
    case 'add_meal_reminder':
      return `Comidas: ${a.meals.map((m) => `${strings.setup.food.mealNames[m.kind].toLowerCase()} ${formatClock(m.time)}`).join(', ')}.`;
    case 'add_appointment':
      return `${a.title}${a.date ? ` el ${a.date}` : ''}${a.time ? ` a las ${formatClock(a.time)}` : ''}.`;
    case 'add_note_for_elder':
      return `Recordatorio: ${a.title}${a.time ? ` a las ${formatClock(a.time)}` : ''}, ${describeDays(a.days).toLowerCase()}.`;
    default:
      return '';
  }
}

export function execute(a: AssistantAction): ExecResult {
  if (!can('caregiver', a.type)) return { ok: false, summary: 'No tienes permiso para esta acción.' };
  const elderId = elderOrThrow();
  switch (a.type) {
    case 'add_medication': {
      if (!a.doseAmount) return { ok: false, summary: `Falta la dosis de ${a.name}: dímela tal como la indicó el médico.` };
      if (!a.times.length && !a.everyHours) return { ok: false, summary: `Falta la hora de ${a.name}.` };
      const { med, findings } = medicationActions.add(
        {
          name: a.name,
          activeIngredient: '',
          strength: a.strength ?? '',
          form: a.form,
          doseAmount: a.doseAmount,
          doseUnit: a.doseUnit,
          schedule: a.everyHours ? { kind: 'interval', everyHours: a.everyHours, from: a.from ?? '08:00', days: a.days } : { kind: 'times', times: a.times, days: a.days },
          startDate: toISODate(new Date()),
          endDate: null,
          instructions: a.instructions,
          purpose: '',
          description: '',
          unitsPerPackage: a.unitsPerPackage,
          unitsOnHand: a.unitsPerPackage,
          refillAlertDays: 7,
          photoUri: null,
          paused: false,
        },
        elderId,
      );
      const review = findings.length ? ` Revisé lo registrado y encontré: ${findings.map((f) => f.reason).join(' ')} Consulta con el médico o el farmacéutico.` : ' No encontré coincidencias con lo registrado (esta revisión solo compara los datos escritos).';
      return { ok: true, summary: `Listo: agregué ${a.name}.${review}`, undo: () => medicationActions.remove(med.id) };
    }
    case 'update_medication': {
      const med = findMed(a.match);
      if (!med) return { ok: false, summary: `No encontré "${a.match}" en sus medicamentos.` };
      const before = { schedule: med.schedule, doseAmount: med.doseAmount };
      medicationActions.update(med.id, { ...(a.times ? { schedule: { kind: 'times', times: a.times, days: med.schedule.days } } : {}), ...(a.doseAmount ? { doseAmount: a.doseAmount } : {}) });
      return { ok: true, summary: `Listo: cambié ${med.name}.`, undo: () => medicationActions.update(med.id, before) };
    }
    case 'remove_medication': {
      const med = findMed(a.match);
      if (!med) return { ok: false, summary: `No encontré "${a.match}" en sus medicamentos.` };
      medicationActions.remove(med.id);
      return { ok: true, summary: `Listo: quité ${med.name}.`, undo: () => medicationActions.restore(med.id) };
    }
    case 'update_stock': {
      const med = findMed(a.match);
      if (!med) return { ok: false, summary: `No encontré "${a.match}" en sus medicamentos.` };
      const prev = med.unitsOnHand;
      if (a.boxes && !med.unitsPerPackage) return { ok: false, summary: `¿Cuántas unidades trae cada caja de ${med.name}? Regístralo en el medicamento y vuelve a intentarlo.` };
      medicationActions.registerPurchase(med.id, a.boxes ? { packages: a.units } : { units: a.units });
      const after = db.get('medications', med.id);
      return { ok: true, summary: `Listo: ahora hay ${after?.unitsOnHand} ${stockUnit(med)} de ${med.name} (estimado).`, undo: () => medicationActions.setStock(med.id, prev) };
    }
    case 'set_water_goal': {
      const prev = db.list('waterPlans', currentUserId(), elderId)[0];
      routineActions.setWater(a.glasses, a.times, elderId);
      return { ok: true, summary: `Listo: meta de ${a.glasses} vasos de agua.`, undo: prev ? () => routineActions.setWater(prev.glasses, prev.times, elderId) : undefined };
    }
    case 'add_activity_goal': {
      const act = routineActions.addActivity({ kind: a.kind, title: a.title, time: a.time ?? '17:00', minutes: a.minutes, days: a.days }, elderId);
      return { ok: true, summary: `Listo: ${a.title}.`, undo: () => routineActions.removeActivity(act.id) };
    }
    case 'set_steps_goal': {
      const walk = db.list('activities', currentUserId(), elderId).find((x) => x.kind === 'walk');
      if (walk) {
        routineActions.updateActivity(walk.id, { stepsGoal: a.steps });
        return { ok: true, summary: `Listo: meta de ${a.steps} pasos en "${walk.title}".`, undo: () => routineActions.updateActivity(walk.id, { stepsGoal: walk.stepsGoal }) };
      }
      const act = routineActions.addActivity({ kind: 'walk', title: 'Caminar', time: '17:00', stepsGoal: a.steps }, elderId);
      return { ok: true, summary: `Listo: meta de ${a.steps} pasos.`, undo: () => routineActions.removeActivity(act.id) };
    }
    case 'add_emergency_contact': {
      if (!a.name) return { ok: false, summary: 'Falta el nombre del contacto.' };
      const c = contactActions.add({ name: a.name, relation: a.relation, phone: a.phone }, elderId);
      return { ok: true, summary: `Listo: agregué a ${a.name}.`, undo: () => contactActions.remove(c.id) };
    }
    case 'update_emergency_contact': {
      const c = db.list('contacts', currentUserId(), elderId).find((x) => normalizeText(x.name).startsWith(normalizeText(a.match)));
      if (!c) return { ok: false, summary: `No encontré a ${a.match} en sus contactos.` };
      const prev = c.phone;
      contactActions.update(c.id, { phone: a.phone });
      return { ok: true, summary: `Listo: nuevo teléfono de ${c.name}.`, undo: () => contactActions.update(c.id, { phone: prev }) };
    }
    case 'set_checkin_time': {
      const prev = db.get('elders', elderId)?.checkinTime ?? null;
      routineActions.setCheckinTime(a.time, elderId);
      return { ok: true, summary: `Listo: chequeo diario a las ${formatClock(a.time)}.`, undo: () => routineActions.setCheckinTime(prev, elderId) };
    }
    case 'add_meal_reminder': {
      const ids = a.meals.map((m) => routineActions.addMeal(m.kind, m.time, elderId).id);
      return { ok: true, summary: `Listo: ${describe(a).replace(/^Comidas: /, 'comidas ')}`, undo: () => ids.forEach((id) => routineActions.removeMeal(id)) };
    }
    case 'add_appointment': {
      const ap = routineActions.addAppointment(a.title, a.date ?? toISODate(new Date()), a.time ?? '09:00', '', elderId);
      return { ok: true, summary: `Listo: ${a.title}.`, undo: () => routineActions.removeAppointment(ap.id) };
    }
    case 'add_note_for_elder': {
      const r = routineActions.addReminder(a.title, a.time ?? '11:00', a.days, elderId);
      return { ok: true, summary: `Listo: le recordaré "${a.title}".`, undo: () => routineActions.removeReminder(r.id) };
    }
    default:
      return { ok: true, summary: '' };
  }
}

/** Responde con datos reales o "Aún no hay registros". */
export function answerQuery(topic: string, match: string | null): string {
  const userId = currentUserId();
  const elderId = activeElderId();
  if (!elderId) return 'Primero registra a tu familiar.';
  const name = db.get('elders', elderId)?.firstName ?? 'Tu familiar';
  const now = new Date();
  const today = toISODate(now);
  const none = 'Aún no hay registros de hoy.';
  const checkins = db.list('checkins', userId, elderId);
  switch (topic) {
    case 'sleep': {
      const c = checkins.find((x) => x.date === today && x.sleep);
      return c?.sleep ? `${name} respondió que durmió ${ANSWER[c.sleep].toLowerCase()}.` : none;
    }
    case 'mood': {
      const c = checkins.find((x) => x.date === today && x.mood);
      return c?.mood ? `${name} respondió que se siente ${ANSWER[c.mood].toLowerCase()}${c.unwell ? ' y dijo tener algún malestar' : ''}.` : none;
    }
    case 'water': {
      const n = waterByDay(db.list('water', userId, elderId), [today])[0];
      const goal = db.list('waterPlans', userId, elderId)[0]?.glasses;
      return n ? `Hoy lleva ${n} ${n === 1 ? 'vaso' : 'vasos'} de agua${goal ? ` de ${goal}` : ''}.` : none;
    }
    case 'meals': {
      const s = mealsSummary(db.list('mealLogs', userId, elderId), [today]);
      return s.answered ? `Hoy confirmó ${s.yes} ${s.yes === 1 ? 'comida' : 'comidas'}${s.no ? ` y dijo ${s.no} vez(es) que aún no había comido` : ''}.` : none;
    }
    case 'activity': {
      const s = activitySummary(db.list('activityLogs', userId, elderId), [today]);
      return s.done || s.notDone ? `Hoy hizo ${s.done} ${s.done === 1 ? 'actividad' : 'actividades'}.` : none;
    }
    case 'stock': {
      const meds = db.list('medications', userId, elderId).filter((m) => (!match || normalizeText(m.name).includes(normalizeText(match))) && m.unitsOnHand !== null);
      if (!meds.length) return 'No hay existencias registradas.';
      return meds
        .map((m) => {
          const e = estimateStock(m, today);
          return `${m.name}: ${m.unitsOnHand} ${stockUnit(m)}${e.daysLeft !== null ? `, unos ${e.daysLeft} días (estimado)` : ''}.`;
        })
        .join(' ');
    }
    case 'medication': {
      const meds = db.list('medications', userId, elderId);
      const items = dayDoses(meds, db.list('doses', userId, elderId), today, now).filter((i) => !match || normalizeText(i.medication.name).includes(normalizeText(match)));
      if (!items.length) return match ? `Hoy no hay tomas de ${match} programadas o registradas.` : none;
      return items.map((i) => `${i.medication.name} de las ${formatClock(effectiveTime(i.dose))}: ${strings.meds.statuses[i.status].toLowerCase()}`).join('. ') + '.';
    }
    default: {
      const a = adherence(db.list('doses', userId, elderId), [today], now);
      const water = waterByDay(db.list('water', userId, elderId), [today])[0];
      const mood = answersBy(checkins, [today], 'mood');
      const parts = [
        a.total ? `medicamentos: ${a.taken} de ${a.total} confirmados${a.unconfirmed ? `, ${a.unconfirmed} sin confirmar` : ''}` : '',
        water ? `agua: ${water} vasos` : '',
        mood.answered ? `ánimo: ${mood.good ? 'bien' : mood.regular ? 'regular' : 'mal'}` : '',
      ].filter(Boolean);
      return parts.length ? `Resumen de hoy de ${name}: ${parts.join('; ')}.` : none;
    }
  }
}

// ── Conversación persistida ──────────────────────────────────

export const conversation = {
  add(from: 'user' | 'buddy', text: string, extra: Partial<Pick<AssistantMessage, 'proposal' | 'proposalState' | 'quickReplies' | 'imageUri'>> = {}) {
    return db.insert('messages', { from, text, proposal: null, proposalState: null, quickReplies: [], imageUri: null, ...extra }, actor(activeElderId()));
  },
  update(id: string, patch: Partial<AssistantMessage>) {
    return db.update('messages', id, patch);
  },
  clear() {
    const userId = currentUserId();
    db.list('messages', userId, activeElderId()).forEach((m) => db.remove('messages', m.id));
  },
};
