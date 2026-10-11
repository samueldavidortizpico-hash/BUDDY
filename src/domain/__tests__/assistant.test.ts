/** Intérprete de BUDDY: más de 40 frases en español con su resultado esperado. */
import { applyAnswer, interpretText } from '../assistant/engine';
import { parseDays, parseDoseAmount, parsePhones, parseTimes } from '../assistant/parse';
import type { AssistantAction } from '../assistant/types';

const ctx = { elderName: 'Rosa', medicationNames: ['Losartán', 'Vitamina D', 'Metformina'], contactNames: ['Juan', 'Marta'] };
const run = (text: string) => interpretText(text, ctx);
const first = (text: string) => run(text).actions[0];
const as = <T extends AssistantAction['type']>(a: AssistantAction | undefined, type: T) => {
  expect(a?.type).toBe(type);
  return a as Extract<AssistantAction, { type: T }>;
};

describe('horas habladas', () => {
  it.each([
    ['a las 6 de la tarde', ['18:00']],
    ['a las 6 pm', ['18:00']],
    ['a las 6 p. m.', ['18:00']],
    ['18:00', ['18:00']],
    ['a las 7 de la mañana', ['07:00']],
    ['a las 8', ['08:00']],
    ['a la 1', ['13:00']],
    ['a las 7 y media de la noche', ['19:30']],
    ['a las 9:15 am', ['09:15']],
    ['en la mañana', ['08:00']],
    ['en la noche', ['20:00']],
    ['al mediodía', ['12:00']],
    ['a las 12 del mediodía', ['12:00']],
    ['a las 8 y a las 8 de la noche', ['08:00', '20:00']],
  ])('%s → %j', (text, expected) => {
    expect(parseTimes(text)).toEqual(expected);
  });
});

describe('cantidades, días y teléfonos', () => {
  it.each([
    ['media pastilla', 0.5],
    ['una y media tabletas', 1.5],
    ['un cuarto de tableta', 0.25],
    ['2 pastillas', 2],
    ['dos tabletas', 2],
    ['una tableta', 1],
  ])('dosis "%s" → %d', (text, n) => {
    expect(parseDoseAmount(text)).toBe(n);
  });

  it('días de la semana', () => {
    expect(parseDays('lunes y jueves')).toEqual([1, 4]);
    expect(parseDays('todos los días')).toEqual([]);
    expect(parseDays('los domingos')).toEqual([0]);
    expect(parseDays('de lunes a viernes')).toEqual([1, 2, 3, 4, 5]);
  });

  it('teléfonos con espacios', () => {
    expect(parsePhones('Juan 300 123 4567 y Marta 311-555-0000').map((p) => p.phone)).toEqual(['3001234567', '3115550000']);
  });
});

describe('medicamentos', () => {
  it('"Ponle losartán a las 6 de la tarde todos los días" → propuesta y pregunta dosis, concentración y caja', () => {
    const r = run('Ponle losartán a las 6 de la tarde todos los días');
    const a = as(r.actions[0], 'add_medication');
    expect(a.name).toBe('Losartán');
    expect(a.times).toEqual(['18:00']);
    expect(a.days).toEqual([]);
    expect(a.doseAmount).toBeNull();
    expect(r.missing.map((m) => m.field)).toEqual(['doseAmount', 'strength', 'unitsPerPackage']);
  });

  it('dosis, concentración e indicaciones en la misma frase', () => {
    const a = as(first('Agrégale media pastilla de metoprolol de 50 mg a las 8 con la comida'), 'add_medication');
    expect(a.name).toBe('Metoprolol');
    expect(a.doseAmount).toBe(0.5);
    expect(a.strength).toBe('50 mg');
    expect(a.times).toEqual(['08:00']);
    expect(a.instructions).toBe('Con comida');
  });

  it('"cada 8 horas desde las 8"', () => {
    const a = as(first('Ponle amoxicilina cada 8 horas desde las 8'), 'add_medication');
    expect(a.everyHours).toBe(8);
    expect(a.from).toBe('08:00');
  });

  it('"dos veces al día" reparte 8 a. m. y 8 p. m.', () => {
    expect(as(first('Dale metformina dos veces al día'), 'add_medication').times).toEqual(['08:00', '20:00']);
  });

  it('jarabe en ml y gotas', () => {
    const j = as(first('Ponle jarabe de ambroxol 5 ml en la noche'), 'add_medication');
    expect([j.form, j.doseUnit, j.doseAmount, j.times[0]]).toEqual(['syrup', 'ml', 5, '20:00']);
    const g = as(first('Ponle 10 gotas de vitamina D en la mañana'), 'add_medication');
    expect([g.form, g.doseAmount]).toEqual(['drops', 10]);
  });

  it('sin hora pregunta la hora', () => {
    expect(run('Agrega atorvastatina').missing[0].field).toBe('time');
  });

  it('"Cámbiale el losartán a las 7" → edición', () => {
    const a = as(first('Cámbiale el losartán a las 7'), 'update_medication');
    expect(a.match).toBe('Losartán');
    expect(a.times).toEqual(['07:00']);
  });

  it('"quítale la vitamina D" → eliminación (se confirma en la propuesta)', () => {
    expect(as(first('quítale la vitamina D'), 'remove_medication').match).toBe('Vitamina D');
  });

  it('eliminar sin decir cuál pregunta cuál', () => {
    expect(run('quítale la pastilla').missing[0].field).toBe('match');
  });

  it('"Compré 30 pastillas de losartán" → existencias', () => {
    const a = as(first('Compré 30 pastillas de losartán'), 'update_stock');
    expect([a.match, a.units, a.mode]).toEqual(['Losartán', 30, 'add']);
  });

  it('respuestas a lo que faltaba', () => {
    let a = first('Ponle losartán a las 6 de la tarde');
    a = applyAnswer(a, 'doseAmount', '½ tableta');
    a = applyAnswer(a, 'strength', '50 mg');
    a = applyAnswer(a, 'unitsPerPackage', '30');
    const m = as(a, 'add_medication');
    expect([m.doseAmount, m.strength, m.unitsPerPackage]).toEqual([0.5, '50 mg', 30]);
    expect(as(applyAnswer(a, 'strength', 'No sé'), 'add_medication').strength).toBe('');
  });
});

describe('rutina', () => {
  it('"Ponle 8 vasos de agua al día" → meta con horas repartidas', () => {
    const a = as(first('Ponle 8 vasos de agua al día'), 'set_water_goal');
    expect(a.glasses).toBe(8);
    expect(a.times).toHaveLength(8);
  });

  it('"seis vasos de agua"', () => {
    expect(as(first('que tome seis vasos de agua'), 'set_water_goal').glasses).toBe(6);
  });

  it('"Ponle una meta de salir a caminar 15 minutos por el conjunto a las 5"', () => {
    const a = as(first('Ponle una meta de salir a caminar 15 minutos por el conjunto a las 5'), 'add_activity_goal');
    expect([a.kind, a.minutes, a.time, a.title]).toEqual(['walk', 15, '17:00', 'Caminar 15 minutos por el conjunto']);
  });

  it('"y 3000 pasos" → meta de pasos', () => {
    expect(as(first('y 3000 pasos'), 'set_steps_goal').steps).toBe(3000);
    expect(as(first('una meta de tres mil pasos'), 'set_steps_goal').steps).toBe(3000);
  });

  it('caminata + pasos en un mensaje', () => {
    expect(run('ponle caminar 20 minutos a las 4 y 5000 pasos').actions.map((a) => a.type)).toEqual(['add_activity_goal', 'set_steps_goal']);
  });

  it('"Ponle desayuno a las 8 y almuerzo a la 1" → dos comidas', () => {
    const a = as(first('Ponle desayuno a las 8 y almuerzo a la 1'), 'add_meal_reminder');
    expect(a.meals).toEqual([
      { kind: 'breakfast', time: '08:00' },
      { kind: 'lunch', time: '13:00' },
    ]);
  });

  it('cena sin hora usa una hora habitual editable', () => {
    expect(as(first('Ponle la cena'), 'add_meal_reminder').meals[0]).toEqual({ kind: 'dinner', time: '18:30' });
  });

  it('chequeo diario', () => {
    expect(as(first('el chequeo a las 10 de la mañana'), 'set_checkin_time').time).toBe('10:00');
  });

  it('"Recuérdale llamar a su nieta los domingos"', () => {
    const a = as(first('Recuérdale llamar a su nieta los domingos'), 'add_note_for_elder');
    expect(a.title).toBe('Llamar a su nieta');
    expect(a.days).toEqual([0]);
  });

  it('cita médica con fecha y hora', () => {
    const a = as(first('Ponle una cita con el cardiólogo el 20 de diciembre a las 9'), 'add_appointment');
    expect(a.time).toBe('09:00');
    expect(a.date?.endsWith('-12-20')).toBe(true);
  });
});

describe('contactos', () => {
  it('"Configúrale de emergencia a Juan, su hijo, 300 123 4567 y a Marta, su hermana, 311 555 0000" → dos contactos', () => {
    const r = run('Configúrale de emergencia a Juan, su hijo, 300 123 4567 y a Marta, su hermana, 311 555 0000');
    expect(r.actions).toEqual([
      { type: 'add_emergency_contact', name: 'Juan', relation: 'Hijo', phone: '3001234567' },
      { type: 'add_emergency_contact', name: 'Marta', relation: 'Hermana', phone: '3115550000' },
    ]);
  });

  it('cambiar el teléfono de un contacto', () => {
    expect(first('Cámbiale el número a Juan 310 000 1122')).toEqual({ type: 'update_emergency_contact', match: 'Juan', phone: '3100001122' });
  });
});

describe('consultas (solo con registros reales)', () => {
  it.each([
    ['¿Cómo durmió hoy?', 'sleep'],
    ['¿tomó el losartán?', 'medication'],
    ['¿cuánta agua ha tomado?', 'water'],
    ['resumen del día', 'day'],
    ['¿Cuántas le quedan?', 'stock'],
    ['¿cómo está de ánimo?', 'mood'],
    ['¿ya almorzó?', 'meals'],
    ['¿caminó hoy?', 'activity'],
  ])('%s → %s', (text, topic) => {
    expect(as(first(text), 'query_summary').topic).toBe(topic);
  });

  it('identifica el medicamento consultado', () => {
    expect(as(first('¿tomó el losartán?'), 'query_summary').match).toBe('Losartán');
  });
});

describe('cámara, sugerencias, urgencias y errores', () => {
  it('escanear', () => {
    expect(first('Escanear medicamento')?.type).toBe('open_scan');
    expect(first('tomar foto de la caja')?.type).toBe('open_scan');
  });
  it('recomendar actividades', () => {
    expect(first('Recomiéndame actividades para ella')?.type).toBe('suggest_routine');
  });
  it.each(['Tiene dolor de pecho', 'Se cayó en el baño', 'no respira bien', 'dice que quiere hacerse daño'])('urgencia: %s', (text) => {
    expect(run(text).actions).toEqual([{ type: 'emergency' }]);
  });
  it.each(['hola', 'asdfgh', 'gracias'])('no entiende "%s" y ofrece ejemplos', (text) => {
    const r = run(text);
    expect(r.understood).toBe(false);
    expect(r.reply).toContain('Ponle losartán');
  });
  it('nunca inventa la dosis', () => {
    expect(as(first('ponle ibuprofeno a las 8'), 'add_medication').doseAmount).toBeNull();
  });
});

describe('permisos', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { can } = require('../permissions') as typeof import('../permissions');
  it('el cuidador puede todo; el adulto mayor solo responder y pedir ayuda', () => {
    expect(can('caregiver', 'add_medication')).toBe(true);
    expect(can('elder', 'add_medication')).toBe(false);
    expect(can('elder', 'remove_medication')).toBe(false);
    expect(can('elder', 'request_help')).toBe(true);
    expect(can('elder', 'confirm_dose')).toBe(true);
  });
});
