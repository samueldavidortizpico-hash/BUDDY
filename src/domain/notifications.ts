/**
 * Planificador PURO de las notificaciones locales del adulto mayor (NotificationScheduler). Con los datos de su perfil
 * decide qué avisos programar; el adaptador (src/infrastructure/notifications.ts) los entrega a expo-notifications.
 *
 * - Medicamentos: aviso escalonado por toma (T y T+10), por fecha, en los próximos días (nunca antes del inicio ni
 *   después del fin del tratamiento); al responder se cancelan los avisos pendientes de esa toma.
 * - Agua, comidas y chequeo: diarios.
 * - Citas: el día anterior a la hora que defina el cuidador (18:00 por defecto) y dos horas antes.
 * - Existencias bajas: un aviso a la mañana siguiente.
 * Mensajes claros y sin alarmismo. Por privacidad, la pantalla de bloqueo NO muestra el nombre del medicamento salvo
 * que el cuidador lo active. Límite de iOS: 64 avisos pendientes; se programan como máximo 60 por prioridad.
 */
import { escalationOf, type Escalation } from './schedule';
import { intervalTimes } from './time';
import type { Appointment, ClockTime, DoseEvent, Meal, Medication, WaterPlan, Weekday } from './types';
import { appointmentAddress } from './types';

export type PlannedTrigger =
  | { type: 'daily'; hour: number; minute: number }
  /** weekday: 1 = domingo … 7 = sábado (convención de expo-notifications). */
  | { type: 'weekly'; weekday: number; hour: number; minute: number }
  | { type: 'date'; date: string };

export interface PlannedNotification {
  key: string;
  title: string;
  body: string;
  trigger: PlannedTrigger;
}

export interface PlanInput {
  now: Date;
  meds: Medication[];
  water: WaterPlan | null;
  meals: Meal[];
  checkinTime: ClockTime | null;
  appointments: Appointment[];
  /** Medicamentos con existencias bajas o agotadas. */
  lowStock: Medication[];
  apptNoticeTime?: ClockTime;
  showMedName?: boolean;
  /** Tomas registradas (respondidas o pospuestas): sus avisos pendientes se cancelan o se mueven. */
  doses?: Pick<DoseEvent, 'medicationId' | 'date' | 'time' | 'status' | 'snoozedTo'>[];
  escalation?: Partial<Escalation>;
}

export const MAX_SCHEDULED = 60;
/** Días que se programan por fecha (8: cubre siempre el mismo día de la semana siguiente); se recalcula al abrir BUDDY. */
export const HORIZON_DAYS = 8;
/** Avisos de medicamentos como máximo (deja sitio a citas, chequeo, existencias, agua y comidas). */
export const MED_BUDGET = 44;

const hm = (t: ClockTime) => {
  const [h, m] = t.split(':').map(Number);
  return { hour: h, minute: m };
};
const clock = (t: ClockTime) => {
  const { hour, minute } = hm(t);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'a. m.' : 'p. m.'}`;
};
const MEAL_Q: Record<Meal['kind'], string> = { breakfast: '¿Ya desayunaste?', lunch: '¿Ya almorzaste?', dinner: '¿Ya cenaste?', snack: '¿Ya comiste la merienda?' };

function repeating(key: string, title: string, body: string, time: ClockTime, days: Weekday[]): PlannedNotification[] {
  if (!days.length || days.length === 7) return [{ key, title, body, trigger: { type: 'daily', ...hm(time) } }];
  return days.map((d) => ({ key: `${key}-d${d}`, title, body, trigger: { type: 'weekly', weekday: d + 1, ...hm(time) } }));
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function at(dateIso: string, time: ClockTime, minusMinutes = 0): Date {
  const [y, mo, d] = dateIso.split('-').map(Number);
  const { hour, minute } = hm(time);
  return new Date(y, mo - 1, d, hour, minute - minusMinutes);
}

export function planNotifications(i: PlanInput): PlannedNotification[] {
  // Medicamentos: aviso escalonado POR TOMA (V3.0). A la hora T y, si no responde, a T+N (segundo aviso). Cada toma
  // respondida (tomé, no tomé, pospuse) sale del plan, así que al reprogramar se cancelan sus avisos pendientes; una toma
  // pospuesta se avisa a su nueva hora. Se programan por fecha los próximos días dentro de MED_BUDGET; al final queda un
  // aviso honesto "Abre BUDDY" para que nunca deje de avisar en silencio si no se abre la app.
  const e = escalationOf(i.escalation);
  const answered = new Map((i.doses ?? []).map((d) => [`${d.medicationId}@${d.date}@${d.time}`, d]));
  const meds: PlannedNotification[] = [];
  const active = i.meds.filter((x) => !x.paused);
  let last: Date | null = null;
  for (let k = 0; k < HORIZON_DAYS; k++) {
    const day = new Date(i.now.getFullYear(), i.now.getMonth(), i.now.getDate() + k);
    const iso = isoDay(day);
    const slots: { when: Date; key: string; title: string; body: string }[] = [];
    for (const m of active) {
      if (iso < m.startDate || (m.endDate && iso > m.endDate)) continue;
      if (m.schedule.days.length && !m.schedule.days.includes(day.getDay() as Weekday)) continue;
      const times = m.schedule.kind === 'times' ? m.schedule.times : intervalTimes(m.schedule.everyHours, m.schedule.from);
      for (const t of times) {
        const dose = answered.get(`${m.id}@${iso}@${t}`);
        if (dose && (dose.status === 'taken' || dose.status === 'skipped')) continue;
        const base = dose?.status === 'snoozed' && dose.snoozedTo ? at(iso, dose.snoozedTo) : at(iso, t);
        const key = `med-${m.id}-${iso}-${t}`;
        const body = i.showMedName ? `Es hora de ${m.name}.` : 'Abre BUDDY para ver cuál es.';
        slots.push({ when: base, key, title: 'Hora de tu medicamento', body });
        slots.push({ when: new Date(base.getTime() + e.remindAfterMin * 60_000), key: `${key}-r`, title: '¿Ya tomaste tu medicamento?', body: i.showMedName ? `Te recuerdo ${m.name}. Márcalo en BUDDY.` : 'Te lo recuerdo de nuevo. Márcalo en BUDDY.' });
      }
    }
    const future = slots.filter((x) => x.when > i.now).sort((x, y) => x.when.getTime() - y.when.getTime());
    // Sin cupo para el día completo se corta ahí (el primer día entra hasta el límite: nunca queda sin avisos).
    if (!future.length) continue;
    const room = meds.length ? (meds.length + future.length > MED_BUDGET ? 0 : future.length) : Math.min(future.length, MED_BUDGET);
    if (!room) break;
    for (const x of future.slice(0, room)) meds.push({ key: x.key, title: x.title, body: x.body, trigger: { type: 'date', date: x.when.toISOString() } });
    if (room) last = future[room - 1].when;
    if (room < future.length) break;
  }
  if (last) {
    const renew = new Date(last.getTime() + 60 * 60_000);
    meds.push({ key: 'med-renew', title: 'Abre BUDDY', body: 'Para que BUDDY siga recordándote tus medicamentos, ábrelo hoy.', trigger: { type: 'date', date: renew.toISOString() } });
  }

  const appts: PlannedNotification[] = [];
  for (const ap of i.appointments) {
    const where = appointmentAddress(ap);
    const dayBefore = at(ap.date, i.apptNoticeTime ?? '18:00', 24 * 60);
    const twoHours = at(ap.date, ap.time, 120);
    if (dayBefore > i.now) appts.push({ key: `appt-${ap.id}-before`, title: `Mañana tienes cita a las ${clock(ap.time)}`, body: `${ap.title}${where ? ` en ${where}` : ''}.`, trigger: { type: 'date', date: dayBefore.toISOString() } });
    if (twoHours > i.now) appts.push({ key: `appt-${ap.id}-2h`, title: `En 2 horas tienes cita: ${ap.title}`, body: where ? `Es en ${where}.` : 'Prepárate con calma.', trigger: { type: 'date', date: twoHours.toISOString() } });
  }

  const checkin = i.checkinTime ? repeating('checkin', 'BUDDY tiene 3 preguntas para ti', '¿Cómo te sientes hoy?', i.checkinTime, []) : [];
  const water = (i.water?.times ?? []).flatMap((t) => repeating(`water-${t}`, 'Toma un vaso de agua', 'Cuando lo tomes, márcalo en BUDDY.', t, []));
  const meals = i.meals.flatMap((m) => repeating(`meal-${m.id}`, MEAL_Q[m.kind], 'Cuéntaselo a BUDDY.', m.time, []));

  const tomorrow10 = new Date(i.now.getFullYear(), i.now.getMonth(), i.now.getDate() + 1, 10, 0);
  const stock = i.lowStock.map((m) => ({
    key: `stock-${m.id}`,
    title: 'Se están acabando tus pastillas',
    // Sin servidor no hay entrega al celular del familiar: no se afirma que ya se le avisó.
    body: i.showMedName ? `Quedan pocas de ${m.name}. Cuéntale a tu familiar para comprar más.` : 'Cuéntale a tu familiar para comprar más.',
    trigger: { type: 'date' as const, date: tomorrow10.toISOString() },
  }));

  // Prioridad ante el límite del sistema: medicamentos, citas, chequeo, existencias, agua, comidas.
  return [...meds, ...appts, ...checkin, ...stock, ...water, ...meals].slice(0, MAX_SCHEDULED);
}

/** Firma del plan: si no cambia, no hace falta reprogramar. */
export const planSignature = (p: PlannedNotification[]) => p.map((n) => `${n.key}|${n.title}|${n.body}|${JSON.stringify(n.trigger)}`).join('\n');
