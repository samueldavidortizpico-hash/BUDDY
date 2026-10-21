import { MAX_SCHEDULED, MED_BUDGET, planNotifications, planSignature, type PlanInput } from '../notifications';
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

const meds = (plan: ReturnType<typeof planNotifications>) => plan.filter((n) => n.key.startsWith('med-') && n.key !== 'med-renew');
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();

describe('planificador de notificaciones', () => {
  it('aviso escalonado: a la hora T y segundo aviso a T+10, por fecha, en los próximos 8 días', () => {
    const plan = meds(planNotifications(input({ meds: [med()] })));
    // Hoy 12 (las 8:00 y 8:10 ya pasaron): 20:00 y 20:10; luego 4 por día del 13 al 19.
    expect(plan.slice(0, 4).map(dateOf).map((d) => d.getTime())).toEqual([at(12, 20), at(12, 20, 10), at(13, 8), at(13, 8, 10)]);
    expect(plan).toHaveLength(2 + 4 * 7);
    expect(plan[0].title).toBe('Hora de tu medicamento');
    expect(plan[1].title).toBe('¿Ya tomaste tu medicamento?');
    expect(plan.every((n) => n.trigger.type === 'date')).toBe(true);
  });

  it('el segundo aviso usa el margen que definió el administrador', () => {
    const plan = meds(planNotifications(input({ meds: [med()], escalation: { remindAfterMin: 15 } })));
    expect(dateOf(plan[1]).getTime()).toBe(at(12, 20, 15));
  });

  it('confirmar (tomé o no tomé) cancela los avisos pendientes de esa toma; pospuesta se avisa a su nueva hora', () => {
    const dose = (status: 'taken' | 'skipped' | 'snoozed', snoozedTo: string | null = null) => ({ medicationId: 'm1', date: '2026-10-12', time: '20:00', status, snoozedTo });
    for (const status of ['taken', 'skipped'] as const) {
      const plan = meds(planNotifications(input({ meds: [med()], doses: [dose(status)] })));
      expect(plan.some((n) => n.key.includes('2026-10-12-20:00'))).toBe(false);
      expect(dateOf(plan[0]).getTime()).toBe(at(13, 8));
    }
    const snoozed = meds(planNotifications(input({ meds: [med()], doses: [dose('snoozed', '20:10')] })));
    expect(snoozed.slice(0, 2).map((n) => dateOf(n).getTime())).toEqual([at(12, 20, 10), at(12, 20, 20)]);
  });

  it('no duplica avisos: una clave por aviso y por toma', () => {
    const plan = planNotifications(input({ meds: [med()] }));
    expect(new Set(plan.map((n) => n.key)).size).toBe(plan.length);
  });

  it('al final de lo programado avisa con honestidad que hay que abrir BUDDY', () => {
    const plan = planNotifications(input({ meds: [med()] }));
    const renew = plan.find((n) => n.key === 'med-renew')!;
    expect(renew.body).toMatch(/ábrelo/);
    expect(dateOf(renew).getTime()).toBeGreaterThan(Math.max(...meds(plan).map((n) => dateOf(n).getTime())));
  });

  it('con días concretos solo avisa esos días (lunes)', () => {
    const plan = meds(planNotifications(input({ meds: [med({ schedule: { kind: 'times', times: ['08:00'], days: [1] } })] })));
    // Lunes 12 a las 8 ya pasó; el siguiente lunes (19) entra en la ventana de 8 días.
    expect(plan.map((n) => dateOf(n).getTime())).toEqual([at(19, 8), at(19, 8, 10)]);
  });

  it('un medicamento en pausa no programa nada', () => {
    expect(planNotifications(input({ meds: [med({ paused: true })] }))).toEqual([]);
  });

  it('no avisa después de la fecha de fin del tratamiento', () => {
    const plan = meds(planNotifications(input({ meds: [med({ endDate: '2026-10-14' })] })));
    for (const n of plan) expect(dateOf(n).getTime()).toBeLessThan(new Date(2026, 9, 15).getTime());
    // 12 oct 20:00 y 20:10, 13 y 14 oct: 8:00, 8:10, 20:00, 20:10.
    expect(plan).toHaveLength(10);
  });

  it('no avisa antes de la fecha de inicio', () => {
    const plan = meds(planNotifications(input({ meds: [med({ startDate: '2026-10-15', endDate: '2026-10-15' })] })));
    expect(plan.map((n) => dateOf(n).getTime())).toEqual([at(15, 8), at(15, 8, 10), at(15, 20), at(15, 20, 10)]);
  });

  it('un tratamiento ya terminado no programa nada', () => {
    expect(planNotifications(input({ meds: [med({ endDate: '2026-10-11' })] }))).toEqual([]);
  });

  it('medianoche y cambio de mes: una toma a las 23:55 tiene su segundo aviso al día siguiente', () => {
    const late = new Date(2026, 9, 31, 23, 0);
    const plan = meds(planNotifications(input({ now: late, meds: [med({ schedule: { kind: 'times', times: ['23:55'], days: [] } })] })));
    expect(plan.slice(0, 2).map((n) => dateOf(n).getTime())).toEqual([new Date(2026, 9, 31, 23, 55).getTime(), new Date(2026, 10, 1, 0, 5).getTime()]);
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

  it('ante el límite del sistema conserva primero los medicamentos y nunca deja el día sin avisos', () => {
    const many = Array.from({ length: 70 }, (_, i) => `${String(10 + Math.floor(i / 6)).padStart(2, '0')}:${String((i % 6) * 10).padStart(2, '0')}`);
    const plan = planNotifications(input({ meds: [med({ schedule: { kind: 'times', times: many.slice(0, 50), days: [] } })], water: { times: many.slice(0, 20) } as PlanInput['water'] }));
    expect(plan.length).toBeLessThanOrEqual(MAX_SCHEDULED);
    expect(meds(plan)).toHaveLength(MED_BUDGET);
    expect(plan.some((n) => n.key === 'med-renew')).toBe(true);
  });

  it('la firma del plan no cambia si los datos no cambian', () => {
    const a = planNotifications(input({ meds: [med()], appointments: [appt()] }));
    const b = planNotifications(input({ meds: [med()], appointments: [appt()] }));
    expect(planSignature(a)).toBe(planSignature(b));
  });
});
