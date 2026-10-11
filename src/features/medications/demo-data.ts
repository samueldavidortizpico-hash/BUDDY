/**
 * DATOS FICTICIOS DE DEMOSTRACIÓN — no corresponden a ningún paciente real ni son recomendaciones.
 * Se generan relativos a la fecha de instalación para que la demo siempre tenga historial.
 */
import type { DoseEvent, Medication } from '@/types/domain';
import { addDays, clockToMinutes, toClock, toISODate } from '@/utils/dates';

import { missingDoses } from './schedule';

export function createDemoMedications(now: Date): Medication[] {
  const start = addDays(toISODate(now), -30);
  const base = { frequency: 'daily' as const, endDate: null, createdAt: now.toISOString(), demo: true, startDate: start };
  return [
    {
      ...base,
      id: 'demo-med-omeprazol',
      name: 'Omeprazol',
      strengthValue: '20',
      strengthUnit: 'mg',
      form: 'Cápsula',
      doseAmount: '1',
      times: ['07:00'],
      instructions: 'Antes del desayuno',
      color: 'yellow',
    },
    {
      ...base,
      id: 'demo-med-amlodipino',
      name: 'Amlodipino',
      strengthValue: '5',
      strengthUnit: 'mg',
      form: 'Tableta',
      doseAmount: '1',
      times: ['10:00'],
      instructions: 'Según indicación de tu médico',
      color: 'coral',
    },
    {
      ...base,
      id: 'demo-med-metformina',
      name: 'Metformina',
      strengthValue: '850',
      strengthUnit: 'mg',
      form: 'Tableta',
      doseAmount: '1',
      times: ['14:00'],
      instructions: 'Con el almuerzo',
      color: 'blue',
    },
    {
      ...base,
      id: 'demo-med-vitamina-d',
      name: 'Vitamina D',
      strengthValue: '1000',
      strengthUnit: 'UI',
      form: 'Tableta',
      doseAmount: '1',
      times: ['20:00'],
      instructions: 'Con la cena',
      color: 'yellow',
    },
  ];
}

/** Historial ficticio de 7 días: casi todas confirmadas, una "no la tomé" y una sin respuesta. */
export function createDemoDoses(meds: Medication[], now: Date): DoseEvent[] {
  const today = toISODate(now);
  const nowMin = clockToMinutes(toClock(now));
  const doses: DoseEvent[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const date = addDays(today, offset);
    for (const dose of missingDoses(meds, doses, date)) {
      const respond = (status: DoseEvent['status']): DoseEvent => ({
        ...dose,
        status,
        confirmedByUser: status === 'taken',
        respondedAt: `${date}T${dose.time}:00`,
      });
      if (offset < 0) {
        if (offset === -4 && dose.medicationId === 'demo-med-metformina') doses.push(respond('skipped'));
        else if (offset === -2 && dose.medicationId === 'demo-med-vitamina-d') doses.push(dose);
        else doses.push(respond('taken'));
      } else {
        // Hoy: confirmadas las que ya pasaron, salvo Metformina, que queda sin respuesta para mostrar ese estado.
        const passed = clockToMinutes(dose.time) + 60 < nowMin;
        doses.push(passed && dose.medicationId !== 'demo-med-metformina' ? respond('taken') : dose);
      }
    }
  }
  return doses;
}
