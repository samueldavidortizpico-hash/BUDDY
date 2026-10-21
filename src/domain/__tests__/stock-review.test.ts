import { reviewMedication } from '../review';
import { amountText, dayDoses, displayStatus, doseText, dosesPerDay, missingDoses, timesOn } from '../schedule';
import { afterDose, afterPurchase, dailyUse, estimateStock } from '../stock';
import { addMinutes, describeDays, fromParts, intervalTimes, spreadTimes, toParts } from '../time';
import type { DoseEvent, Medication, MedSchedule } from '../types';
import { digitsOnly, formatPhone, isAcceptablePassword, isValidColombianPhone, isValidEmail, normalizeText, passwordStrength } from '../validation';

const meta = { ownerUserId: 'u', elderId: 'e', createdBy: 'u', createdAt: '', updatedAt: '', deletedAt: null, syncStatus: 'pending' as const };

function med(over: Partial<Medication> = {}): Medication {
  return {
    ...meta,
    id: 'm1',
    name: 'Losartán',
    activeIngredient: 'losartán potásico',
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
    refillAlertDays: 7,
    photoUri: null,
    paused: false,
    ...over,
  };
}

describe('existencias (stock.ts)', () => {
  it('consumo diario = dosis × tomas por día', () => {
    expect(dailyUse(med())).toBe(2);
    expect(dailyUse(med({ doseAmount: 0.5 }))).toBe(1);
    expect(dailyUse(med({ doseAmount: 1.5, schedule: { kind: 'times', times: ['08:00'], days: [] } }))).toBe(1.5);
  });

  it('promedia los días de la semana', () => {
    const s: MedSchedule = { kind: 'times', times: ['08:00'], days: [1, 4] };
    expect(dosesPerDay({ schedule: s })).toBeCloseTo(2 / 7);
    expect(dailyUse(med({ schedule: s }))).toBeCloseTo(0.29, 2);
  });

  it('cada 8 horas = 3 tomas al día', () => {
    expect(dailyUse(med({ schedule: { kind: 'interval', everyHours: 8, from: '06:00', days: [] } }))).toBe(3);
  });

  it('días restantes, fecha de agotamiento y nivel', () => {
    expect(estimateStock(med(), '2026-10-11')).toEqual({ level: 'ok', dailyUse: 2, daysLeft: 15, runOutDate: '2026-10-26' });
    expect(estimateStock(med({ unitsOnHand: 14 }), '2026-10-11').level).toBe('low');
    expect(estimateStock(med({ unitsOnHand: 0 }), '2026-10-11').level).toBe('out');
    expect(estimateStock(med({ unitsOnHand: null }), '2026-10-11').level).toBe('none');
  });

  it('media pastilla por toma: 30 unidades alcanzan 30 días con 2 tomas', () => {
    expect(estimateStock(med({ doseAmount: 0.5 }), '2026-10-11').daysLeft).toBe(30);
  });

  it('descuenta por toma y suma por compra, nunca negativo', () => {
    expect(afterDose(10, 1)).toBe(9);
    expect(afterDose(0.5, 1)).toBe(0);
    expect(afterDose(null, 1)).toBeNull();
    expect(afterPurchase(4, { packages: 2, unitsPerPackage: 30 })).toBe(64);
    expect(afterPurchase(null, { units: 30, unitsPerPackage: null })).toBe(30);
  });
});

describe('horarios (schedule.ts)', () => {
  it('genera solo las tomas que faltan y respeta pausa y días', () => {
    const m = med();
    expect(missingDoses([m], [], '2026-10-11').map((d) => d.time)).toEqual(['08:00', '20:00']);
    const one = [{ medicationId: 'm1', date: '2026-10-11', time: '08:00' }];
    expect(missingDoses([m], one, '2026-10-11').map((d) => d.time)).toEqual(['20:00']);
    expect(timesOn(med({ paused: true }), '2026-10-11')).toEqual([]);
    // 2026-10-11 es domingo (0)
    expect(timesOn(med({ schedule: { kind: 'times', times: ['08:00'], days: [1] } }), '2026-10-11')).toEqual([]);
    expect(timesOn(med({ endDate: '2026-10-10' }), '2026-10-11')).toEqual([]);
  });

  it('una toma pasa a "sin confirmar" a los 30 minutos (V3.0; antes una hora), o al margen que defina el administrador', () => {
    const dose = { date: '2026-10-11', time: '08:00', status: 'pending' as const, snoozedTo: null };
    expect(displayStatus(dose, new Date(2026, 9, 11, 8, 29))).toBe('pending');
    expect(displayStatus(dose, new Date(2026, 9, 11, 8, 30))).toBe('unconfirmed');
    expect(displayStatus(dose, new Date(2026, 9, 11, 8, 30), 60)).toBe('pending');
  });

  it('ordena las tomas del día', () => {
    const d = (time: string): DoseEvent => ({ ...meta, id: time, medicationId: 'm1', date: '2026-10-11', time, status: 'pending', respondedAt: null, snoozedTo: null, snoozeCount: 0, answeredBy: null });
    expect(dayDoses([med()], [d('20:00'), d('08:00')], '2026-10-11', new Date(2026, 9, 11, 7)).map((x) => x.dose.time)).toEqual(['08:00', '20:00']);
  });

  it('repite la dosis tal como la escribió el cuidador', () => {
    expect(doseText(med({ doseAmount: 0.5 }))).toBe('½ tableta');
    expect(doseText(med({ doseAmount: 2 }))).toBe('2 tabletas');
    expect(doseText(med({ form: 'syrup', doseUnit: 'ml', doseAmount: 5 }))).toBe('5 ml');
    expect(doseText(med({ form: 'drops', doseUnit: 'drops', doseAmount: 10 }))).toBe('10 gotas');
    expect(amountText(1.5)).toBe('1½');
  });
});

describe('revisión limitada (review.ts)', () => {
  const elder = { allergies: ['Penicilina'], avoid: ['Alcohol'], equivalences: { penicilina: ['amoxicilina'] } };

  it('detecta coincidencia con una alergia escrita (sin tildes ni mayúsculas)', () => {
    const f = reviewMedication(med({ name: 'Penicilina G', activeIngredient: '' }), elder, []);
    expect(f.map((x) => x.kind)).toEqual(['allergy_match']);
    expect(f[0].reason).toContain('Penicilina');
  });

  it('usa la lista de equivalencias editable', () => {
    const f = reviewMedication(med({ name: 'Amoxal', activeIngredient: 'Amoxicilina' }), elder, []);
    expect(f[0].kind).toBe('allergy_match');
    expect(f[0].reason).toContain('equivalencia');
  });

  it('detecta principio activo repetido y horarios cruzados', () => {
    const other = med({ id: 'm2', name: 'Cozaar', schedule: { kind: 'times', times: ['08:00'], days: [] } });
    const kinds = reviewMedication(med(), { allergies: [], avoid: [], equivalences: {} }, [other]).map((x) => x.kind);
    expect(kinds).toEqual(['duplicate_ingredient', 'schedule_overlap']);
  });

  it('sin coincidencias no devuelve nada (y nunca afirma que sea seguro)', () => {
    expect(reviewMedication(med(), { allergies: ['Látex'], avoid: [], equivalences: {} }, [])).toEqual([]);
  });
});

describe('horas (time.ts)', () => {
  it('convierte entre 24 h y la rueda de 12 h', () => {
    expect(toParts('18:05')).toEqual({ hour: 6, minute: 5, pm: true });
    expect(toParts('00:30')).toEqual({ hour: 12, minute: 30, pm: false });
    expect(fromParts({ hour: 12, minute: 0, pm: true })).toBe('12:00');
    expect(fromParts({ hour: 12, minute: 15, pm: false })).toBe('00:15');
    expect(addMinutes('23:55', 10)).toBe('00:05');
  });

  it('reparte vasos de agua y "cada X horas"', () => {
    expect(spreadTimes(3, '08:00', '20:00')).toEqual(['08:00', '14:00', '20:00']);
    expect(spreadTimes(8)).toHaveLength(8);
    expect(intervalTimes(8, '08:00')).toEqual(['00:00', '08:00', '16:00']);
    expect(describeDays([1, 4])).toBe('Lun, Jue');
    expect(describeDays([])).toBe('Todos los días');
  });
});

describe('validación', () => {
  it('teléfonos de Colombia', () => {
    expect(isValidColombianPhone('300 123 4567')).toBe(true);
    expect(isValidColombianPhone('+57 311 555 0000')).toBe(true);
    expect(isValidColombianPhone('6015551234')).toBe(true);
    expect(isValidColombianPhone('123')).toBe(true);
    expect(isValidColombianPhone('200 123 4567')).toBe(false);
    expect(isValidColombianPhone('30012')).toBe(false);
    expect(digitsOnly('+57 300-123-4567')).toBe('3001234567');
    expect(formatPhone('3001234567')).toBe('300 123 4567');
  });

  it('correo y contraseña', () => {
    expect(isValidEmail(' Laura@Correo.com ')).toBe(true);
    expect(isValidEmail('laura@correo')).toBe(false);
    expect(passwordStrength('abc')).toBe(0);
    expect(isAcceptablePassword('abcdefgh')).toBe(false);
    expect(isAcceptablePassword('Abcdefg1')).toBe(true);
    expect(normalizeText('  Penicilína ')).toBe('penicilina');
  });
});
