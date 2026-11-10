/**
 * V3.0 · Hito 3: aviso escalonado con reloj simulado. Para cada toma: aviso a la hora T, segundo aviso a T+10 sin
 * respuesta, "sin confirmar" a T+30 con alerta de seguimiento al administrador ("Llamar a [nombre]" y "Ya lo confirmé por
 * teléfono"). Cualquier confirmación cancela lo pendiente de esa toma y nada se duplica. Nunca "emergencia".
 */
import { buildFeed, type RecoInput } from '@/domain/recommendations/engine';
import { doseStage, escalationOf, type DoseStage } from '@/domain/schedule';
import { planNotifications } from '@/domain/notifications';
import { db } from '@/infrastructure/local/db';
import { doseActions, doseDelivered, evaluateAlerts, notifyLog } from '@/state/care';
import { elderActions } from '@/state/actions';
import { computeFeed, feedActions } from '@/state/feed';
import { handPhoneTo, seedRenderData, testUser } from '@/testing/render-fixtures';

const DAY = '2026-10-20';
const at = (h: number, m = 0) => new Date(2026, 9, 20, h, m);

let elderId: string;
let medId: string;
let doseId: string;

beforeEach(async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(at(7, 0));
  elderId = (await seedRenderData()).id;
  medId = db.insert('medications', {
    name: 'Losartán [PRUEBA]', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit',
    schedule: { kind: 'times', times: ['08:00'], days: [] }, startDate: DAY, endDate: null, instructions: '', purpose: '',
    description: '', unitsPerPackage: 30, unitsOnHand: 30, refillAlertDays: 3, photoUri: null, paused: false,
  }, { userId: testUser.id, elderId }).id;
  doseActions.sync(elderId, at(7, 0));
  doseId = db.list('doses', testUser.id, elderId)[0].id;
});

afterEach(() => jest.useRealTimers());

const dose = () => db.get('doses', doseId)!;
const stage = (now: Date, delivered = true): DoseStage['stage'] => doseStage(dose(), now, escalationOf(db.get('elders', elderId)!.screen), delivered).stage;
const unconfirmedCards = () => computeFeed(new Date()).filter((f) => f.key === `dose-${doseId}`);

describe('etapas de una toma (programada ≠ entregada ≠ respondida)', () => {
  it('sigue la secuencia T, T+10 y T+30', () => {
    expect(stage(at(7, 50), false)).toBe('scheduled');
    expect(stage(at(7, 50), true)).toBe('delivered');
    expect(stage(at(8, 0))).toBe('delivered');
    expect(stage(at(8, 9))).toBe('delivered');
    expect(stage(at(8, 10))).toBe('second_notice');
    expect(stage(at(8, 29))).toBe('second_notice');
    expect(stage(at(8, 30))).toBe('unconfirmed');
  });

  it('respetan los márgenes que define el administrador', () => {
    elderActions.update(elderId, { screen: { ...db.get('elders', elderId)!.screen, remindAfterMin: 15, unconfirmedAfterMin: 45 } });
    expect(stage(at(8, 14))).toBe('delivered');
    expect(stage(at(8, 15))).toBe('second_notice');
    expect(stage(at(8, 44))).toBe('second_notice');
    expect(stage(at(8, 45))).toBe('unconfirmed');
  });

  it('respondida en cualquier momento, deja de escalar (pospuse, tomé y no tomé por separado)', () => {
    handPhoneTo(elderId); // responde el adulto mayor en el teléfono que le entregaron
    jest.setSystemTime(at(8, 12));
    doseActions.snooze(doseId); // a las 8:22
    expect(doseStage(dose(), at(8, 15), escalationOf(), true)).toMatchObject({ answer: 'snoozed' });
    // La toma pospuesta vuelve a escalar desde su nueva hora.
    expect(doseStage(dose(), at(8, 52), escalationOf(), true).stage).toBe('unconfirmed');
    doseActions.confirm(doseId);
    expect(doseStage(dose(), at(9, 0), escalationOf(), true)).toEqual({ stage: 'answered', answer: 'taken', by: 'elder' });
    // V4 (R8): corregir deja la toma retenida; no se pide otra dosis (ni se pospone) hasta una respuesta explícita.
    db.setHandoff(null); // el administrador recupera el teléfono: corregir una toma es suyo
    doseActions.reset(doseId);
    expect(dose().safetyHold).toBe(true);
    expect(doseActions.snooze(doseId)).toBeUndefined();
    doseActions.skip(doseId);
    expect(doseStage(dose(), at(9, 0), escalationOf(), true)).toMatchObject({ answer: 'skipped' });
  });

  it('"aviso entregado" depende de lo que aceptó el sistema del celular, no de que exista la hora', () => {
    expect(doseDelivered(null, dose())).toBe(false);
    notifyLog.record(elderId, 'denied', []);
    expect(doseDelivered(notifyLog.get(elderId), dose())).toBe(false);
    notifyLog.record(elderId, 'granted', [`med-${medId}-${DAY}-08:00`]);
    expect(doseDelivered(notifyLog.get(elderId), dose())).toBe(true);
  });
});

describe('alerta de seguimiento al administrador', () => {
  it('aparece a T+30, no antes, con "Llamar" y "Ya lo confirmé por teléfono" y sin la palabra emergencia', () => {
    jest.setSystemTime(at(8, 29));
    expect(unconfirmedCards()).toHaveLength(0);
    jest.setSystemTime(at(8, 30));
    const [card] = unconfirmedCards();
    expect(card).toMatchObject({ kind: 'alert', severity: 'attention' });
    expect(card.actions.map((a) => a.type)).toEqual(['call', 'confirm_dose']);
    expect(`${card.title} ${card.reason}`).not.toMatch(/emergencia/i);
    expect(card.reason).toContain('30 minutos');
  });

  it('no se duplica: una sola tarjeta y un solo aviso guardado aunque se evalúe muchas veces', () => {
    jest.setSystemTime(at(9, 0));
    for (let i = 0; i < 5; i++) evaluateAlerts(elderId, new Date());
    expect(db.list('alerts', testUser.id, elderId).filter((a) => a.kind === 'dose_unconfirmed')).toHaveLength(1);
    expect(unconfirmedCards()).toHaveLength(1);
  });

  it('"Ya lo confirmé por teléfono" la cierra y queda registrado que confirmó el administrador', () => {
    jest.setSystemTime(at(9, 0));
    evaluateAlerts(elderId, new Date());
    feedActions.run({ type: 'confirm_dose', doseId });
    expect(dose()).toMatchObject({ status: 'taken', answeredBy: 'caregiver' });
    expect(unconfirmedCards()).toHaveLength(0);
    expect(db.list('alerts', testUser.id, elderId).find((a) => a.kind === 'dose_unconfirmed')?.status).toBe('attended');
  });

  it('la confirmación del adulto mayor antes de T+30 evita la alerta', () => {
    jest.setSystemTime(at(8, 11));
    doseActions.confirm(doseId);
    jest.setSystemTime(at(10, 0));
    evaluateAlerts(elderId, new Date());
    expect(unconfirmedCards()).toHaveLength(0);
    expect(db.list('alerts', testUser.id, elderId).filter((a) => a.kind === 'dose_unconfirmed')).toHaveLength(0);
  });
});

describe('avisos al adulto mayor (planificador)', () => {
  const plan = () =>
    planNotifications({ now: new Date(), meds: db.list('medications', testUser.id, elderId), water: null, meals: [], checkinTime: null, appointments: [], lowStock: [], doses: db.list('doses', testUser.id, elderId), escalation: db.get('elders', elderId)!.screen });
  const keys = () => plan().map((n) => n.key).filter((k) => k.includes(DAY));

  it('programa el aviso a la hora y el segundo aviso; al confirmar se cancelan los dos', () => {
    expect(keys()).toEqual([`med-${medId}-${DAY}-08:00`, `med-${medId}-${DAY}-08:00-r`]);
    doseActions.confirm(doseId);
    expect(keys()).toEqual([]);
  });

  it('a las 8:05 solo queda pendiente el segundo aviso; confirmado a las 8:05, ninguno', () => {
    jest.setSystemTime(at(8, 5));
    expect(keys()).toEqual([`med-${medId}-${DAY}-08:00-r`]);
    doseActions.confirm(doseId);
    expect(keys()).toEqual([]);
  });
});

describe('textos del aviso al administrador sin datos inventados', () => {
  it('sin tomas hoy no hay alerta de "sin confirmar"', () => {
    const input: RecoInput = { now: at(12), elderName: 'Rosa', meds: [], doses: [], checkins: [], water: [], waterGoal: null, meals: [], mealLogs: [], activities: [], alerts: [], appointments: [], checkinTime: null, since: DAY };
    expect(buildFeed(input).some((f) => f.key.startsWith('dose-'))).toBe(false);
  });
});
