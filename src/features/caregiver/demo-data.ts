/** DATOS FICTICIOS DE DEMOSTRACIÓN — cuidador y alertas de seguimiento inventados. */
import type { FollowUpAlert } from '@/types/domain';
import { addDays, atClock, toISODate } from '@/utils/dates';

export const DEMO_CAREGIVER = { name: 'Miguel López', initials: 'ML', relation: 'Hijo' } as const;

export function createDemoAlerts(now: Date): FollowUpAlert[] {
  const today = toISODate(now);
  const yesterday = addDays(today, -1);
  return [
    {
      id: 'demo-alert-symptom',
      kind: 'symptom',
      title: 'Síntoma reportado',
      detail: 'Dolor de cabeza · Intensidad leve',
      at: atClock(yesterday, '12:35').toISOString(),
      status: 'attended',
      demo: true,
    },
    {
      id: 'demo-alert-vital',
      kind: 'vital_reminder',
      title: 'Presión por registrar',
      detail: 'Registro semanal pendiente',
      at: atClock(yesterday, '18:00').toISOString(),
      status: 'important',
      demo: true,
    },
    {
      id: 'demo-alert-dose-ok',
      kind: 'dose_confirmed',
      title: 'Seguimiento realizado',
      detail: 'Omeprazol confirmado por Carmen',
      at: atClock(today, '07:12').toISOString(),
      status: 'resolved',
      demo: true,
    },
    {
      id: 'demo-alert-mood',
      kind: 'mood',
      title: 'Ánimo registrado',
      detail: 'Carmen registró su ánimo: Bien',
      at: atClock(yesterday, '09:00').toISOString(),
      status: 'resolved',
      demo: true,
    },
  ];
}
