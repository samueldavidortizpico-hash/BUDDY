/**
 * Alertas de SEGUIMIENTO para el cuidador (no son advertencias clínicas ni emergencias).
 * Una toma sin respuesta se muestra como "Medicamento sin confirmar", nunca como omitida.
 */
import type { CaregiverRepository, ProfileRepository } from '@/repositories/contracts';
import type { AlertStatus, FollowUpAlert } from '@/types/domain';
import { atClock, formatClock } from '@/utils/dates';

import type { DayPlan } from '../medications/schedule';

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

export function markAttended(repo: CaregiverRepository, id: string): void {
  repo.setAlertStatus(id, 'attended');
}

export function setLocationSharing(repo: ProfileRepository, enabled: boolean, now: Date): void {
  repo.update({ locationSharing: { enabled, updatedAt: enabled ? now.toISOString() : repo.settings().locationSharing.updatedAt } });
}
