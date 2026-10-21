/**
 * Vista de un segundo del administrador (V3.0). PURO y determinista: con los registros reales de hoy decide un nivel y
 * su razón en una frase, y arma el resumen diario de una línea.
 *
 * - Acción necesaria: pidió ayuda, respondió "me siento mal" hoy o un medicamento sin existencias (0).
 * - Atención: toma sin confirmar, "No puedo verificar", existencias bajas o chequeo sin responder.
 * - Todo bien: nada de lo anterior Y señal reciente del celular del adulto mayor.
 * - Aún no hay registros: sin señales de su celular y sin nada que atender. Nunca "Todo bien" sin datos.
 * BUDDY informa: no diagnostica ni sugiere cambios de tratamiento.
 */
import { addDays } from '@/utils/dates';

import { displayStatus, escalationOf, type Escalation } from './schedule';
import { estimateStock } from './stock';
import { toMinutes } from './time';
import type { Alert, CheckinAnswer, ClockTime, DoseEvent, Medication } from './types';
import { sinceText, type Verification } from './verification';

export type StatusLevel = 'action' | 'attention' | 'ok' | 'no_data';

export interface StatusInput {
  now: Date;
  elderName: string;
  meds: Medication[];
  doses: DoseEvent[];
  checkins: CheckinAnswer[];
  alerts: Alert[];
  checkinTime: ClockTime | null;
  verification: Verification;
  escalation?: Partial<Escalation>;
}

export interface DayFacts {
  /** Tomas de hoy: confirmadas como tomadas y total programado. */
  doses: { taken: number; total: number };
  checkin: 'answered' | 'pending' | 'missed' | 'none';
  stock: { level: 'ok' | 'low' | 'out' | 'none'; med?: string; daysLeft?: number | null };
  lastSignal: string | null;
}

export interface DayStatus {
  level: StatusLevel;
  /** Una frase: el motivo más importante. */
  reason: string;
  /** Hay algo que hacer: llamar. */
  call: boolean;
  /** Solo "pidió ayuda" va en rojo. */
  help: boolean;
  facts: DayFacts;
}

/** Margen tras la hora del chequeo para considerarlo "sin responder". */
export const CHECKIN_GRACE_MIN = 60;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function dayFacts(i: StatusInput): DayFacts {
  const today = iso(i.now);
  const active = new Map(i.meds.filter((m) => !m.paused).map((m) => [m.id, m]));
  const doses = i.doses.filter((d) => d.date === today && active.has(d.medicationId));
  const c = i.checkins.find((x) => x.date === today);
  const answered = !!c && (c.mood !== null || c.sleep !== null || c.unwell !== null);
  const nowMin = i.now.getHours() * 60 + i.now.getMinutes();
  const checkin: DayFacts['checkin'] = !i.checkinTime ? 'none' : answered ? 'answered' : nowMin >= toMinutes(i.checkinTime) + CHECKIN_GRACE_MIN ? 'missed' : 'pending';
  const levels = i.meds.map((m) => ({ m, e: estimateStock(m, today) })).filter((x) => x.e.level !== 'none');
  const worst = levels.find((x) => x.e.level === 'out') ?? levels.filter((x) => x.e.level === 'low').sort((a, b) => (a.e.daysLeft ?? 0) - (b.e.daysLeft ?? 0))[0];
  return {
    doses: { taken: doses.filter((d) => d.status === 'taken').length, total: doses.length },
    checkin,
    stock: worst ? { level: worst.e.level as 'low' | 'out', med: worst.m.name, daysLeft: worst.e.daysLeft } : { level: levels.length ? 'ok' : 'none' },
    lastSignal: i.verification.state === 'no_data' ? null : sinceText(new Date(i.verification.lastAt), i.now),
  };
}

export function dayStatus(i: StatusInput): DayStatus {
  const facts = dayFacts(i);
  const name = i.elderName;
  const today = iso(i.now);
  const pending = i.alerts.filter((a) => a.status === 'pending' && a.createdAt.slice(0, 10) >= addDays(today, -1));
  const c = i.checkins.find((x) => x.date === today);
  const { unconfirmedAfterMin } = escalationOf(i.escalation);
  const unconfirmed = i.doses.filter((d) => d.date === today && i.meds.some((m) => m.id === d.medicationId && !m.paused) && displayStatus(d, i.now, unconfirmedAfterMin) === 'unconfirmed');
  const out = (level: StatusLevel, reason: string, extra: Partial<DayStatus> = {}): DayStatus => ({ level, reason, call: level === 'action' || level === 'attention', help: false, facts, ...extra });

  // ── Acción necesaria ──
  if (pending.some((a) => a.kind === 'help_requested')) return out('action', `${name} tocó "Pedir ayuda". Llámale ahora.`, { help: true });
  if (c?.unwell === true) return out('action', `${name} respondió hoy que no se siente bien.`);
  if (facts.stock.level === 'out') return out('action', `${facts.stock.med}: no quedan unidades registradas.`, { call: false });

  // ── Atención ──
  if (unconfirmed.length) {
    const med = i.meds.find((m) => m.id === unconfirmed[0].medicationId)!;
    return out('attention', unconfirmed.length === 1 ? `${med.name} sin confirmar desde hace más de ${unconfirmedAfterMin} minutos.` : `${unconfirmed.length} tomas sin confirmar.`);
  }
  if (i.verification.state === 'cannot_verify') {
    const text = `${i.verification.text.charAt(0).toLowerCase()}${i.verification.text.slice(1)}`;
    return out('attention', `No puedo verificar: ${text}${text.endsWith('.') ? '' : '.'}`);
  }
  if (facts.stock.level === 'low') return out('attention', `Se está acabando ${facts.stock.med}: alcanza para ${facts.stock.daysLeft} ${facts.stock.daysLeft === 1 ? 'día' : 'días'}.`, { call: false });
  if (facts.checkin === 'missed') return out('attention', `${name} aún no responde el chequeo de hoy.`);

  // ── Todo bien solo con señal reciente ──
  if (i.verification.state === 'no_data') return out('no_data', `Cuando ${name} use BUDDY en su celular, aquí verás cómo va su día.`, { call: false });
  const parts = [facts.doses.total ? `${facts.doses.taken} de ${facts.doses.total} tomas` : null, facts.checkin === 'answered' ? 'chequeo respondido' : null].filter(Boolean);
  return out('ok', parts.length ? `Hoy: ${parts.join(', ')}. Nada pendiente.` : 'Nada pendiente por ahora.', { call: false });
}

const ANSWER: Record<'good' | 'regular' | 'bad', string> = { good: 'bien', regular: 'regular', bad: 'mal' };

/**
 * Resumen diario de una línea, solo con registros reales ("Hoy todo en orden: 3 de 3 medicinas, ánimo bien, durmió
 * regular"). Sin ningún registro devuelve null (no se envía ni se muestra un resumen vacío).
 */
export function dailySummary(i: StatusInput): string | null {
  const s = dayStatus(i);
  const today = iso(i.now);
  const c = i.checkins.find((x) => x.date === today);
  const parts: string[] = [];
  if (s.facts.doses.total) parts.push(`${s.facts.doses.taken} de ${s.facts.doses.total} ${s.facts.doses.total === 1 ? 'medicina' : 'medicinas'}`);
  if (c?.mood) parts.push(`ánimo ${ANSWER[c.mood]}`);
  if (c?.sleep) parts.push(`durmió ${ANSWER[c.sleep]}`);
  if (c?.unwell === true) parts.push('dijo que no se siente bien');
  if (s.facts.checkin === 'missed') parts.push('sin chequeo');
  if (!parts.length) return null;
  const head = s.level === 'ok' ? 'Hoy todo en orden' : s.level === 'no_data' ? 'Hoy' : 'Hoy, con algo por revisar';
  return `${head}: ${parts.join(', ')}`;
}
