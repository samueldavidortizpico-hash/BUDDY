/**
 * V3.0 · Hito 4: detección de silencio ("nunca falla en silencio"). La regla pura y su conexión con las respuestas del
 * adulto mayor y el feed del administrador. "No puedo verificar" ≠ "sin confirmar", y sin datos nunca "está bien".
 */
import { buildFeed, type RecoInput } from '@/domain/recommendations/engine';
import { sinceText, verify, type Heartbeat } from '@/domain/verification';
import { db } from '@/infrastructure/local/db';
import { beat, doseActions, elderAnswers, heartbeats } from '@/state/care';
import { computeFeed } from '@/state/feed';
import { seedRenderData, testUser } from '@/testing/render-fixtures';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m);
const hb = (d: Date, kind: Heartbeat['kind'] = 'app_open', notifications?: Heartbeat['notifications']): Heartbeat => ({ at: d.toISOString(), kind, ...(notifications ? { notifications } : {}) });

describe('regla de verificación (pura)', () => {
  const now = at(20, 9, 0); // martes 20 de octubre, 9:00 a. m.

  it('sin ninguna señal: "sin datos", nunca "está bien"', () => {
    expect(verify({ heartbeats: [], now, elderName: 'Rosa' })).toEqual({ state: 'no_data' });
  });

  it('con señal reciente: se puede verificar', () => {
    expect(verify({ heartbeats: [hb(at(20, 7, 30))], now, elderName: 'Rosa' })).toMatchObject({ state: 'ok' });
  });

  it('más de 12 horas sin señal: "No puedo verificar" con la hora de la última', () => {
    const v = verify({ heartbeats: [hb(at(19, 20, 0))], now, elderName: 'Rosa' });
    expect(v).toEqual({ state: 'cannot_verify', reason: 'silence', lastAt: at(19, 20).toISOString(), text: 'Sin señal desde ayer a las 8 p. m.' });
  });

  it('el límite de horas lo define el administrador', () => {
    expect(verify({ heartbeats: [hb(at(20, 4, 0))], now, elderName: 'Rosa', maxSilenceHours: 4 })).toMatchObject({ state: 'cannot_verify', reason: 'silence' });
    expect(verify({ heartbeats: [hb(at(20, 4, 0))], now, elderName: 'Rosa', maxSilenceHours: 6 })).toMatchObject({ state: 'ok' });
  });

  it('notificaciones desactivadas en su celular: "No puedo verificar" aunque haya señal reciente', () => {
    const v = verify({ heartbeats: [hb(at(20, 8, 0), 'permissions', 'denied'), hb(at(20, 8, 50))], now, elderName: 'Rosa' });
    expect(v).toMatchObject({ state: 'cannot_verify', reason: 'notifications_off', text: 'Las notificaciones están desactivadas en el celular de Rosa' });
    // Si luego las concede, vuelve a poder verificar.
    expect(verify({ heartbeats: [hb(at(20, 8, 0), 'permissions', 'denied'), hb(at(20, 8, 40), 'permissions', 'granted')], now, elderName: 'Rosa' }).state).toBe('ok');
  });

  it('en web el permiso no se puede leer: no se trata como desactivado', () => {
    expect(verify({ heartbeats: [hb(at(20, 8), 'permissions', 'unsupported')], now, elderName: 'Rosa' }).state).toBe('ok');
  });

  it('textos de la última señal: hoy, ayer y otro día', () => {
    expect(sinceText(at(20, 7, 10), now)).toBe('hoy a las 7:10 a. m.');
    expect(sinceText(at(19, 20), now)).toBe('ayer a las 8 p. m.');
    expect(sinceText(at(12, 9), now)).toBe('el lunes 12 a las 9 a. m.');
  });
});

describe('feed del administrador', () => {
  const base: RecoInput = { now: at(20, 12), elderName: 'Rosa', meds: [], doses: [], checkins: [], water: [], waterGoal: null, meals: [], mealLogs: [], activities: [], alerts: [], appointments: [], checkinTime: null, since: '2026-10-01' };

  it('"No puedo verificar" es una alerta con "Llamar", distinta de "sin confirmar"', () => {
    const feed = buildFeed({ ...base, verification: { state: 'cannot_verify', reason: 'silence', lastAt: '', text: 'Sin señal desde ayer a las 8 p. m.' } });
    const v = feed.find((f) => f.key === 'verify-silence')!;
    expect(v).toMatchObject({ kind: 'alert', severity: 'attention', title: 'No puedo verificar: sin señal desde ayer a las 8 p. m.' });
    expect(v.actions).toEqual([{ type: 'call' }]);
    expect(feed.some((f) => f.key.startsWith('dose-'))).toBe(false);
    expect(feed.some((f) => f.positive && f.title === 'Hoy va según lo programado')).toBe(false);
  });

  it('sin datos de verificación no aparece "Hoy va según lo programado"', () => {
    expect(buildFeed({ ...base, verification: { state: 'no_data' } }).some((f) => f.title === 'Hoy va según lo programado')).toBe(false);
    expect(buildFeed({ ...base, verification: { state: 'ok', lastAt: '' } }).some((f) => f.title === 'Hoy va según lo programado')).toBe(true);
  });
});

describe('señales de vida desde el celular del adulto mayor', () => {
  let elderId: string;
  beforeEach(async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(at(20, 8));
    elderId = (await seedRenderData()).id;
  });
  afterEach(() => jest.useRealTimers());

  it('responder un aviso, el chequeo o el agua deja una señal con hora', () => {
    elderAnswers.checkin({ mood: 'good' }, elderId);
    elderAnswers.addWater(elderId);
    expect(heartbeats.recent(elderId).map((b) => b.kind)).toEqual(['checkin', 'answer']);
    expect(heartbeats.recent(elderId)[0].at).toBe(at(20, 8).toISOString());
  });

  it('confirmar una toma deja señal solo si la confirma el adulto mayor (no el administrador)', () => {
    const med = db.insert('medications', { name: 'Losartán [PRUEBA]', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit', schedule: { kind: 'times', times: ['08:00'], days: [] }, startDate: '2026-10-20', endDate: null, instructions: '', purpose: '', description: '', unitsPerPackage: 30, unitsOnHand: 30, refillAlertDays: 3, photoUri: null, paused: false }, { userId: testUser.id, elderId });
    doseActions.sync(elderId, new Date());
    const dose = db.list('doses', testUser.id, elderId).find((d) => d.medicationId === med.id)!;
    doseActions.confirm(dose.id, 'caregiver');
    expect(heartbeats.recent(elderId)).toHaveLength(0);
    doseActions.reset(dose.id);
    doseActions.confirm(dose.id, 'elder');
    expect(heartbeats.recent(elderId).map((b) => b.kind)).toEqual(['answer']);
  });

  it('las aperturas no llenan el registro (una cada 5 min) y el permiso solo se guarda si cambia', () => {
    beat(elderId, 'app_open');
    beat(elderId, 'app_open');
    jest.setSystemTime(at(20, 8, 6));
    beat(elderId, 'app_open');
    beat(elderId, 'permissions', 'granted');
    beat(elderId, 'permissions', 'granted');
    beat(elderId, 'permissions', 'denied');
    expect(heartbeats.recent(elderId).map((b) => `${b.kind}${b.notifications ? `:${b.notifications}` : ''}`)).toEqual(['app_open', 'app_open', 'permissions:granted', 'permissions:denied']);
  });

  it('de extremo a extremo: sin señal 13 h el administrador ve "No puedo verificar"; al abrir la app desaparece', () => {
    beat(elderId, 'app_open');
    jest.setSystemTime(at(20, 21, 1));
    expect(computeFeed(new Date()).find((f) => f.key === 'verify-silence')?.title).toBe('No puedo verificar: sin señal desde hoy a las 8 a. m.');
    beat(elderId, 'app_open');
    expect(computeFeed(new Date()).some((f) => f.key.startsWith('verify-'))).toBe(false);
  });

  it('envío preparado para el backend: pendientes y marcado de enviados', () => {
    beat(elderId, 'app_open');
    expect(heartbeats.pending(elderId)).toHaveLength(1);
    heartbeats.markSent(elderId, heartbeats.recent(elderId)[0].at);
    expect(heartbeats.pending(elderId)).toHaveLength(0);
  });
});
