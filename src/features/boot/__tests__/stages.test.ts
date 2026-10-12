import { FAIL_MS, SLOW_MS, STAGE_LABEL, bootView } from '../stages';

const none = { appearance: false, fonts: false, data: false, session: false };

describe('arranque por etapas reales', () => {
  it('el progreso es la fracción de tareas terminadas y el mensaje es la tarea pendiente', () => {
    expect(bootView(none, 0)).toEqual({ kind: 'loading', progress: 0, message: STAGE_LABEL.appearance, slow: false });
    expect(bootView({ ...none, appearance: true, fonts: true }, 500)).toEqual({ kind: 'loading', progress: 0.5, message: STAGE_LABEL.data, slow: false });
  });
  it('termina cuando todas las tareas terminan (sin espera artificial)', () => {
    expect(bootView({ appearance: true, fonts: true, data: true, session: true }, 10)).toEqual({ kind: 'ready' });
  });
  it(`avisa si tarda más de ${SLOW_MS / 1000} s y ofrece reintentar a los ${FAIL_MS / 1000} s`, () => {
    expect(bootView(none, SLOW_MS)).toMatchObject({ kind: 'loading', slow: true });
    expect(bootView(none, FAIL_MS)).toEqual({ kind: 'failed' });
  });
});
