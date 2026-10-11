import { replyTo, type ChatContext } from '../replies';

const ctx: ChatContext = {
  userName: 'Carmen',
  lastBloodPressure: { value: '118/76', when: 'ayer, 9:00 a. m.' },
  nextDose: { name: 'Medicamento de prueba', strength: '5 mg', dose: '1 tableta', time: '2:00 p. m.' },
  taken: 2,
  total: 4,
  glasses: 5,
  waterGoal: 8,
  pendingHabits: ['Caminata suave'],
};

describe('replyTo (respuestas locales de demostración)', () => {
  it('muestra el último registro manual de presión con aviso, sin interpretarlo', () => {
    const r = replyTo('¿Cómo está mi presión?', ctx);
    expect(r).toContain('118/76');
    expect(r).toMatch(/registro manual/);
    expect(r).toMatch(/no puedo interpretarlo/);
    expect(r).not.toMatch(/normal|alta|baja|en rango/i);
  });

  it('nunca indica dosis ni cambios de tratamiento', () => {
    for (const q of ['¿Puedo tomar dos pastillas?', '¿Cuál es la dosis correcta?', 'Quiero dejar de tomar la pastilla']) {
      expect(replyTo(q, ctx)).toMatch(/No puedo indicarte dosis/);
    }
  });

  it('ante palabras de urgencia deriva a la línea de emergencias', () => {
    expect(replyTo('Tengo dolor de pecho', ctx)).toMatch(/123/);
  });

  it('no diagnostica síntomas: sugiere registrarlos y consultar', () => {
    const r = replyTo('Tengo mareo', ctx);
    expect(r).toMatch(/Síntomas/);
    expect(r).toMatch(/profesional/);
  });

  it('informa la próxima toma registrada', () => {
    expect(replyTo('¿Cuál es mi próximo medicamento?', ctx)).toMatch(/2:00 p\. m\./);
  });

  it('sin registros de presión lo dice claramente', () => {
    expect(replyTo('presión', { ...ctx, lastBloodPressure: null })).toMatch(/Aún no tienes registros/);
  });
});
