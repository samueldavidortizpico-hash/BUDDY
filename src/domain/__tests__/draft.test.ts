/** Borrador del chat (DraftAction) e interpretación de frases reales del dueño que antes no se entendían. */
import { applyField, draftComplete, draftFields, nextQuestion, parseDateAnswer } from '../assistant/draft';
import { interpretText } from '../assistant/engine';
import type { AssistantAction } from '../assistant/types';

const ctx = { elderName: 'Elis', medicationNames: ['Losartán'], contactNames: ['Juan'] };
const first = (t: string) => interpretText(t, ctx).actions[0];

describe('frases que antes BUDDY no entendía (causa de "casi no agrega nada")', () => {
  it.each([
    ['quiero que tome acetaminofén cada 8 horas', { type: 'add_medication', name: 'Acetaminofén', everyHours: 8 }],
    ['necesita tomar omeprazol en ayunas', { type: 'add_medication', name: 'Omeprazol', instructions: 'En ayunas' }],
    ['tiene que tomarse la atorvastatina en la noche', { type: 'add_medication', name: 'Atorvastatina', times: ['20:00'] }],
    ['pon que tome 2 tabletas de calcio al mediodía', { type: 'add_medication', name: 'Calcio', doseAmount: 2, times: ['12:00'] }],
    ['agrega metformina 850 mg en el desayuno y la cena', { type: 'add_medication', name: 'Metformina', strength: '850 mg', times: ['07:30', '18:30'], instructions: 'Con comida' }],
    ['quiero agregar un medicamento', { type: 'add_medication', name: '' }],
    ['ponle agua', { type: 'set_water_goal', glasses: 0 }],
    ['ponle una cita mañana con el cardiólogo', { type: 'add_appointment', title: 'Cita de cardiología', specialty: 'Cardiología' }],
    ['mándale un mensaje: te quiero mucho', { type: 'send_message', text: 'Te quiero mucho' }],
  ])('"%s"', (text, expected) => {
    expect(first(text)).toMatchObject(expected);
  });

  it('"ponle agua" ya no crea un medicamento llamado "Agua"', () => {
    expect(interpretText('ponle agua', ctx).actions.some((a) => a.type === 'add_medication')).toBe(false);
  });

  it('las comidas como hora del medicamento no crean recordatorios de comida', () => {
    expect(interpretText('agrega metformina en el desayuno', ctx).actions.map((a) => a.type)).toEqual(['add_medication']);
  });
});

describe('borrador', () => {
  const med = first('Ponle losartán a las 6 de la tarde') as Extract<AssistantAction, { type: 'add_medication' }>;

  it('obligatorios del medicamento: nombre, dosis por toma y al menos una hora', () => {
    expect(draftFields(med).filter((f) => f.required).map((f) => f.key)).toEqual(['name', 'doseAmount', 'time']);
    expect(draftFields(med).filter((f) => !f.required).map((f) => f.key)).toEqual(['days', 'strength', 'unitsPerPackage', 'unitsOnHand', 'instructions', 'purpose']);
  });

  it('pregunta solo lo obligatorio que falta y deja de preguntar al completarlo', () => {
    expect(nextQuestion([med], ctx)).toMatchObject({ field: 'doseAmount', quickReplies: ['½ tableta', '1 tableta', '1½ tabletas', '2 tabletas'] });
    const done = applyField(med, 'doseAmount', '½ tableta');
    expect(nextQuestion([done], ctx)).toBeNull();
    expect(draftComplete({ actions: [done] })).toBe(true);
  });

  it('una hora nunca se toma como dosis', () => {
    expect(applyField(med, 'doseAmount', '8:00 p. m.')).toEqual(med);
    expect(applyField(med, 'doseAmount', '6 de la tarde')).toEqual(med);
  });

  it('opcionales: días, existencias, instrucciones y para qué sirve; "No sé" los deja vacíos', () => {
    let a = applyField(med, 'days', 'de lunes a viernes');
    a = applyField(a, 'unitsOnHand', '20');
    a = applyField(a, 'instructions', 'Con comida');
    a = applyField(a, 'purpose', 'Para la presión');
    expect(a).toMatchObject({ days: [1, 2, 3, 4, 5], unitsOnHand: 20, instructions: 'Con comida', purpose: 'Para la presión' });
    expect(applyField(a, 'purpose', 'No sé')).toMatchObject({ purpose: '' });
  });

  it('fechas de citas en palabras', () => {
    const today = new Date(2026, 9, 11);
    expect(parseDateAnswer('Mañana', today)).toBe('2026-10-12');
    expect(parseDateAnswer('pasado mañana', today)).toBe('2026-10-13');
    expect(parseDateAnswer('En una semana', today)).toBe('2026-10-18');
    expect(parseDateAnswer('20 de diciembre', today)).toBe('2026-12-20');
    expect(parseDateAnswer('5/1', today)).toBe('2027-01-05');
    expect(parseDateAnswer('cuando pueda', today)).toBeNull();
  });
});
