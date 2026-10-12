import { MAX_SCHEDULED, planNotifications, planSignature, type PlanInput } from '../notifications';
import type { Appointment, Medication } from '../types';

const meta = { ownerUserId: 'u', elderId: 'e', createdBy: 'u', createdAt: '', updatedAt: '', deletedAt: null, syncStatus: 'pending' as const };

function med(over: Partial<Medication> = {}): Medication {
  return {
    ...meta,
    id: 'm1',
    name: 'Losartán',
    activeIngredient: 'losartán',
    strength: '50 mg',
    form: 'tablet',
    doseAmount: 1,
    doseUnit: 'unit',
    schedule: { kind: 'times', times: ['08:00', '20:00'], days: [] },
    startDate: '2026-10-01',
    endDate: null,
    instructions: '',
    purpose: '',
    description: '',
    unitsPerPackage: 30,
    unitsOnHand: 30,
    refillAlertDays: 3,
    photoUri: null,
    paused: false,
    ...over,
  };
}

function appt(over: Partial<Appointment> = {}): Appointment {
  return { ...meta, id: 'a1', title: 'Cardiólogo', date: '2026-10-20', time: '10:00', place: 'Calle 5 # 10-20', city: 'Cali', ...over };
}

// Lunes 12 de octubre de 2026, 9:00 hora local.
const NOW = new Date(2026, 9, 12, 9, 0);
const input = (over: Partial<PlanInput> = {}): PlanInput => ({ now: NOW, meds: [], water: null, meals: [], checkinTime: null, appointments: [], lowStock: [], ...over });
const dateOf = (n: { trigger: { type: string; date?: string } }) => new Date(n.trigger.date!);

describe('planificador de notificaciones', () => {
  it('un tratamiento sin fecha de fin programa un aviso diario por hora', () => {
    const plan = planNotifications(input({ meds: [med()] }));
    expect(plan.map((n) => n.trigger)).toEqual([
      { type: 'daily', hour: 8, minute: 0 },
      { type: 'daily', hour: 20, minute: 0 },
    ]);
  });

  it('con días concretos programa avisos semanales (domingo = 1 en expo-notifications)', () => {
    const plan = planNotifications(input({ meds: [med({ schedule: { kind: 'times', times: ['08:00'], days: [0, 3] } })] }));
    expect(plan.map((n) => n.trigger)).toEqual([
      { type: 'weekly', weekday: 1, hour: 8, minute: 0 },
      { type: 'weekly', weekday: 4, hour: 8, minute: 0 },
    ]);
  });

  it('un medicamento en pausa no programa nada', () => {
    expect(planNotifications(input({ meds: [med({ paused: true })] }))).toEqual([]);
  });

  it('no avisa después de la fecha de fin del tratamiento', () => {
    const plan = planNotifications(input({ meds: [med({ endDate: '2026-10-14' })] }));
    expect(plan.length).toBeGreaterThan(0);
    for (const n of plan) {
      expect(n.trigger.type).toBe('date');
      expect(dateOf(n).getTime()).toBeLessThan(new Date(2026, 9, 15).getTime());
      expect(dateOf(n).getTime()).toBeGreaterThan(NOW.getTime());
    }
    // 12 oct 20:00, 13 oct 8:00 y 20:00, 14 oct 8:00 y 20:00 (el 12 a las 8:00 ya pasó).
    expect(plan).toHaveLength(5);
  });

  it('no avisa antes de la fecha de inicio', () => {
    const plan = planNotifications(input({ meds: [med({ startDate: '2026-10-15', endDate: '2026-10-15' })] }));
    expect(plan.map((n) => dateOf(n).getTime())).toEqual([new Date(2026, 9, 15, 8, 0).getTime(), new Date(2026, 9, 15, 20, 0).getTime()]);
  });

  it('un tratamiento ya terminado no programa nada', () => {
    expect(planNotifications(input({ meds: [med({ endDate: '2026-10-11' })] }))).toEqual([]);
  });

  it('respeta los días concretos dentro de un tratamiento con fin', () => {
    // Solo lunes (1); del 12 al 25 de octubre hay lunes 12 (ya pasó a las 8) y lunes 19.
    const plan = planNotifications(input({ meds: [med({ schedule: { kind: 'times', times: ['08:00'], days: [1] }, endDate: '2026-10-25' })] }));
    expect(plan.map((n) => dateOf(n).getTime())).toEqual([new Date(2026, 9, 19, 8, 0).getTime()]);
  });

  it('cita: un aviso el día anterior a la hora del cuidador y otro dos horas antes, con la dirección', () => {
    const plan = planNotifications(input({ appointments: [appt()], apptNoticeTime: '18:00' }));
    expect(plan.map((n) => dateOf(n).getTime())).toEqual([new Date(2026, 9, 19, 18, 0).getTime(), new Date(2026, 9, 20, 8, 0).getTime()]);
    expect(plan[0].title).toBe('Mañana tienes cita a las 10:00 a. m.');
    expect(plan[0].body).toContain('Calle 5 # 10-20, Cali');
  });

  it('una cita pasada no programa avisos', () => {
    expect(planNotifications(input({ appointments: [appt({ date: '2026-10-01' })] }))).toEqual([]);
  });

  it('por privacidad no muestra el nombre del medicamento salvo que el cuidador lo active', () => {
    expect(planNotifications(input({ meds: [med()] }))[0].body).not.toContain('Losartán');
    expect(planNotifications(input({ meds: [med()], showMedName: true }))[0].body).toContain('Losartán');
  });

  it('el aviso de existencias no afirma que el familiar ya fue avisado (no hay entrega remota)', () => {
    const [n] = planNotifications(input({ lowStock: [med()], showMedName: true }));
    expect(n.body).not.toMatch(/avis[eé]/i);
  });

  it('ante el límite del sistema conserva primero los medicamentos', () => {
    const many = Array.from({ length: 70 }, (_, i) => `${String(Math.floor(i / 3)).padStart(2, '0')}:${String((i % 3) * 20).padStart(2, '0')}`);
    const plan = planNotifications(input({ meds: [med({ schedule: { kind: 'times', times: many.slice(0, 50), days: [] } })], water: { times: many.slice(0, 20) } as PlanInput['water'] }));
    expect(plan).toHaveLength(MAX_SCHEDULED);
    expect(plan.filter((n) => n.key.startsWith('med-'))).toHaveLength(50);
  });

  it('la firma del plan no cambia si los datos no cambian', () => {
    const a = planNotifications(input({ meds: [med()], appointments: [appt()] }));
    const b = planNotifications(input({ meds: [med()], appointments: [appt()] }));
    expect(planSignature(a)).toBe(planSignature(b));
  });
});
