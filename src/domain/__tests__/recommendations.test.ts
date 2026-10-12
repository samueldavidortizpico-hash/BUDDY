/**
 * Motor de recomendaciones y alertas con historiales SINTÉTICOS creados solo aquí (nombres de prueba): semanas de ánimo
 * bajo, sueño malo, dosis sin confirmar, todo normal. Comprueba escalada, deduplicación y que nunca diagnostica.
 */
import { DEFAULT_THRESHOLDS, badStreak, buildFeed, itemVersion, unreadCount, visibleFeed, type RecoInput } from '../recommendations/engine';
import type { Answer3, CheckinAnswer, DoseEvent, Medication } from '../types';

const NOW = new Date(2026, 9, 11, 20, 0); // 11-oct-2026, 8:00 p. m.
const day = (n: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const meta = (id: string) => ({ id, ownerUserId: 'u', elderId: 'e', createdBy: 'u', createdAt: '', updatedAt: '', deletedAt: null, syncStatus: 'local' as const });
const checkin = (n: number, mood: Answer3 | null, sleep: Answer3 | null = 'good'): CheckinAnswer => ({ ...meta(`c${n}`), date: day(n), mood, sleep, unwell: false });
const med: Medication = { ...meta('m1'), name: 'Losartán', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit', schedule: { kind: 'times', times: ['18:00'], days: [] }, startDate: day(30), endDate: null, instructions: '', purpose: '', description: '', unitsPerPackage: null, unitsOnHand: null, refillAlertDays: 7, photoUri: null, paused: false };
const dose = (n: number, status: DoseEvent['status'], time = '18:00'): DoseEvent => ({ ...meta(`d${n}-${time}`), medicationId: 'm1', date: day(n), time, status, respondedAt: null, snoozedTo: null, snoozeCount: 0, answeredBy: null });

const base = (over: Partial<RecoInput> = {}): RecoInput => ({
  now: NOW,
  elderName: 'Elis',
  meds: [med],
  doses: [],
  checkins: [],
  water: [],
  waterGoal: null,
  meals: [],
  mealLogs: [],
  activities: [{ ...meta('a1'), kind: 'walk', title: 'Caminar', time: '17:00', minutes: 15, days: [], contactId: null, stepsGoal: null }],
  alerts: [],
  appointments: [],
  checkinTime: null,
  since: day(60),
  ...over,
});
const lowMood = (days: number) => Array.from({ length: days }, (_, n) => checkin(n, 'bad'));
const find = (input: RecoInput, key: string) => buildFeed(input).find((f) => f.key === key);

describe('ánimo bajo con escalada', () => {
  it('2 días: todavía no hay tarjeta', () => {
    expect(find(base({ checkins: lowMood(2) }), 'mood-low')).toBeUndefined();
  });
  it('3 días: atención', () => {
    expect(find(base({ checkins: lowMood(3) }), 'mood-low')).toMatchObject({ severity: 'attention', count: 3, title: 'Elis lleva 3 días diciendo que se siente mal' });
  });
  it('7 días: atención más fuerte (una semana)', () => {
    const f = find(base({ checkins: lowMood(7) }), 'mood-low')!;
    expect(f).toMatchObject({ severity: 'attention', count: 7 });
    expect(f.title).toContain('una semana');
  });
  it('14 días o más: señal de alarma con recomendación de consultar', () => {
    const f = find(base({ checkins: lowMood(16) }), 'mood-low')!;
    expect(f.severity).toBe('alarm');
    expect(f.reason).toContain('por mayor seguridad, consulta con un médico o un profesional de salud mental'.replace(/^p/, 'P'));
  });
  it('una respuesta "Bien" corta la racha', () => {
    const checkins = [...lowMood(3), checkin(3, 'good'), ...Array.from({ length: 10 }, (_, k) => checkin(4 + k, 'bad'))];
    expect(find(base({ checkins }), 'mood-low')?.count).toBe(3);
  });
  it('una racha vieja (sin respuesta reciente) no genera tarjeta', () => {
    const checkins = Array.from({ length: 10 }, (_, k) => checkin(5 + k, 'bad'));
    expect(badStreak(checkins, 'mood', day(0)).days).toBe(0);
  });
  it('los umbrales los define el cuidador', () => {
    expect(find(base({ checkins: lowMood(2), thresholds: { ...DEFAULT_THRESHOLDS, moodDays: [2, 4, 6] } }), 'mood-low')?.severity).toBe('attention');
    expect(find(base({ checkins: lowMood(6), thresholds: { ...DEFAULT_THRESHOLDS, moodDays: [2, 4, 6] } }), 'mood-low')?.severity).toBe('alarm');
  });
});

describe('sueño malo', () => {
  const bad = (n: number) => Array.from({ length: n }, (_, k) => checkin(k, 'good', 'bad'));
  it('3 noches: atención; 7: señal de alarma; 14: recomienda consultar', () => {
    expect(find(base({ checkins: bad(3) }), 'sleep-bad')?.severity).toBe('attention');
    expect(find(base({ checkins: bad(7) }), 'sleep-bad')?.severity).toBe('alarm');
    expect(find(base({ checkins: bad(14) }), 'sleep-bad')?.reason).toContain('consulta con un médico');
  });
});

describe('medicamentos', () => {
  it('toma de hoy sin confirmar: alerta descriptiva ("no ha confirmado", no "no la tomó")', () => {
    const f = find(base({ doses: [dose(0, 'pending')] }), 'dose-d0-18:00')!;
    expect(f).toMatchObject({ kind: 'alert', severity: 'attention', title: 'Elis no ha confirmado Losartán de las 6:00 p. m.' });
    expect(f.actions.map((a) => a.type)).toEqual(['call', 'confirm_dose']);
  });
  it('adherencia baja en la semana', () => {
    const doses = Array.from({ length: 7 }, (_, k) => dose(k + 1, k < 3 ? 'taken' : 'skipped'));
    expect(find(base({ doses }), 'adherence-week')).toMatchObject({ severity: 'attention', title: 'Esta semana Elis confirmó 3 de 7 tomas' });
  });
  it('todo a tiempo esta semana: mensaje positivo con sugerencia de escribirle', () => {
    const doses = Array.from({ length: 7 }, (_, k) => dose(k + 1, 'taken'));
    const f = find(base({ doses }), 'adherence-perfect')!;
    expect(f.positive).toBe(true);
    expect(f.actions[0].type).toBe('message');
  });
});

describe('agua, chequeo, comidas, citas y actividades', () => {
  it('agua por debajo de la meta dos días seguidos', () => {
    const water = [day(1), day(2)].flatMap((d, k) => Array.from({ length: 3 + k }, (_, j) => ({ ...meta(`w${d}${j}`), date: d, at: '' })));
    expect(find(base({ water, waterGoal: 8 }), 'water-low')?.support).toEqual([`${day(1)}: 3 vasos`, `${day(2)}: 4 vasos`]);
  });
  it('chequeo sin responder dos días', () => {
    expect(find(base({ checkinTime: '10:00' }), 'checkin-missing')?.severity).toBe('attention');
  });
  it('cita mañana sin preguntas preparadas, con dirección', () => {
    const appt = { ...meta('ap1'), title: 'Cita con cardiólogo', date: day(-1), time: '10:00', place: 'Calle 10 # 5-20, Bogotá' };
    expect(find(base({ appointments: [appt] }), 'appt-ap1')).toMatchObject({ title: 'Cita con cardiólogo mañana a las 10:00 a. m. en Calle 10 # 5-20, Bogotá', reason: '¿Preparamos las preguntas para llevar a la cita?' });
  });
  it('sin actividades sugiere una que se agrega con un toque', () => {
    expect(find(base({ activities: [] }), 'suggest-walk')?.actions[0]).toMatchObject({ type: 'add_activity', title: 'Caminar 15 minutos' });
  });
  it('pidió ayuda: única alerta en rojo, señal de alarma', () => {
    const help = { ...meta('al1'), kind: 'help_requested' as const, title: 'Pidió ayuda', detail: 'Tocó "Pedir ayuda".', refId: 'h', status: 'pending' as const, snoozedUntil: null, createdAt: NOW.toISOString() };
    const feed = buildFeed(base({ alerts: [help] }));
    expect(feed[0]).toMatchObject({ help: true, severity: 'alarm' });
    expect(feed.filter((f) => f.help)).toHaveLength(1);
  });
});

describe('todo normal y comportamiento del feed', () => {
  it('con todo en orden muestra una tarjeta informativa útil (nunca vacío)', () => {
    const feed = buildFeed(base({ doses: [dose(0, 'pending', '21:00')] }));
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({ key: `ok-${day(0)}`, severity: 'info', reason: 'Próxima toma: Losartán a las 9:00 p. m.' });
  });
  it('una tarjeta por patrón: la escalada cambia la versión y vuelve a contar como novedad', () => {
    const f3 = find(base({ checkins: lowMood(3) }), 'mood-low')!;
    const f7 = find(base({ checkins: lowMood(7) }), 'mood-low')!;
    expect(buildFeed(base({ checkins: lowMood(7) })).filter((f) => f.key === 'mood-low')).toHaveLength(1);
    expect(unreadCount([f7], { read: { 'mood-low': itemVersion(f3) }, muted: {} })).toBe(1);
    expect(unreadCount([f7], { read: { 'mood-low': itemVersion(f7) }, muted: {} })).toBe(0);
  });
  it('silenciar oculta la tarjeta hasta su vencimiento', () => {
    const feed = buildFeed(base({ checkins: lowMood(3) }));
    const muted = { read: {}, muted: { 'mood-low': new Date(NOW.getTime() + 3_600_000).toISOString() } };
    expect(visibleFeed(feed, muted, NOW).some((f) => f.key === 'mood-low')).toBe(false);
    expect(visibleFeed(feed, muted, new Date(NOW.getTime() + 7_200_000)).some((f) => f.key === 'mood-low')).toBe(true);
  });
  it('lenguaje descriptivo: nunca diagnostica ni usa "emergencia"', () => {
    const feed = buildFeed(base({ checkins: [...lowMood(20).map((c) => ({ ...c, sleep: 'bad' as Answer3 }))], doses: [dose(0, 'pending')], checkinTime: '10:00' }));
    const text = feed.map((f) => `${f.title} ${f.reason}`).join(' ').toLowerCase();
    expect(text).not.toMatch(/depresi|insomnio|diagn|emergencia|es seguro|apto/);
  });
});
