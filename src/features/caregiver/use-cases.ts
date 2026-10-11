/**
 * Alertas de SEGUIMIENTO para el cuidador (no son advertencias clínicas ni emergencias).
 * Una toma sin respuesta se muestra como "Medicamento sin confirmar", nunca como omitida.
 */
import type { CaregiverRepository, ProfileRepository } from '@/repositories/contracts';
import type {
  AlertStatus,
  FollowUpAlert,
  ISODate,
  MoodEntry,
  SymptomEntry,
  Timestamp,
  VitalEntry,
} from '@/types/domain';
import { atClock, formatClock, toISODate } from '@/utils/dates';

import type { DayPlan } from '../medications/schedule';
import { formatVitalValue, VITALS } from '../vitals/use-cases';
import { INTENSITY_LABELS, moodLabel } from '../wellbeing/use-cases';

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  pending: 'Pendiente',
  important: 'Importante',
  attended: 'Atendida',
  resolved: 'Resuelto',
};

export function buildAlerts(
  base: FollowUpAlert[],
  overrides: Record<string, AlertStatus>,
  plan: DayPlan,
): FollowUpAlert[] {
  const derived: FollowUpAlert[] = plan.items
    .filter((i) => i.status === 'unconfirmed')
    .map((i) => ({
      id: `dose-${i.dose.id}`,
      kind: 'dose_unconfirmed',
      title: 'Medicamento sin confirmar',
      detail: `${i.medication.name} · ${formatClock(i.dose.time)}`,
      at: atClock(i.dose.date, i.dose.time).toISOString(),
      status: 'pending',
      demo: i.dose.demo,
    }));
  return [...derived, ...base]
    .map((a) => ({ ...a, status: overrides[a.id] ?? a.status }))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function alertCounts(alerts: FollowUpAlert[]) {
  return {
    pending: alerts.filter((a) => a.status === 'pending').length,
    important: alerts.filter((a) => a.status === 'important').length,
    closed: alerts.filter((a) => a.status === 'attended' || a.status === 'resolved').length,
  };
}

export interface ActivityItem {
  id: string;
  kind: 'dose' | 'mood' | 'symptom' | 'vital';
  title: string;
  detail: string;
  at: Timestamp;
}

/** Actividad registrada hoy por la persona acompañada (solo lo que ella registró). */
export function todayActivity(
  input: { plan: DayPlan; moods: MoodEntry[]; symptoms: SymptomEntry[]; vitals: VitalEntry[] },
  today: ISODate,
): ActivityItem[] {
  const doses: ActivityItem[] = input.plan.items
    .filter((i) => i.status === 'taken' && i.dose.respondedAt)
    .map((i) => ({ id: i.dose.id, kind: 'dose', title: 'Toma confirmada', detail: `${i.medication.name} · ${formatClock(i.dose.time)}`, at: i.dose.respondedAt! }));
  const moods: ActivityItem[] = input.moods
    .filter((m) => m.date === today)
    .map((m) => ({ id: m.id, kind: 'mood', title: 'Ánimo registrado', detail: moodLabel(m.mood), at: atClock(m.date, m.time).toISOString() }));
  const symptoms: ActivityItem[] = input.symptoms
    .filter((s) => s.date === today)
    .map((s) => ({ id: s.id, kind: 'symptom', title: 'Síntoma registrado', detail: `${s.symptom} · ${INTENSITY_LABELS[s.intensity]}`, at: atClock(s.date, s.time).toISOString() }));
  const vitals: ActivityItem[] = input.vitals
    .filter((v) => toISODate(new Date(v.recordedAt)) === today)
    .map((v) => ({ id: v.id, kind: 'vital', title: 'Registro de salud', detail: `${VITALS[v.type].label}: ${formatVitalValue(v)} ${VITALS[v.type].unit}`, at: v.recordedAt }));
  return [...doses, ...moods, ...symptoms, ...vitals].sort((a, b) => (new Date(a.at) < new Date(b.at) ? 1 : -1));
}

export function markAttended(repo: CaregiverRepository, id: string): void {
  repo.setAlertStatus(id, 'attended');
}

export function setLocationSharing(repo: ProfileRepository, enabled: boolean, now: Date): void {
  repo.update({ locationSharing: { enabled, updatedAt: enabled ? now.toISOString() : repo.settings().locationSharing.updatedAt } });
}
