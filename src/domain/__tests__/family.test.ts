import { addNote, nextShift, NOTE_MAX, shiftFor } from '../family';

describe('familia: turnos y notas (V4.3)', () => {
  it('el turno del día sale del día de la semana local', () => {
    // 2026-10-26 es lunes.
    expect(shiftFor({ 1: 'Laura' }, '2026-10-26')).toBe('Laura');
    expect(shiftFor({ 1: 'Laura' }, '2026-10-27')).toBeNull();
  });

  it('tocar un día recorre los integrantes y vuelve a "sin turno"', () => {
    const members = ['Laura', 'Andrés'];
    expect(nextShift(undefined, members)).toBe('Laura');
    expect(nextShift('Laura', members)).toBe('Andrés');
    expect(nextShift('Andrés', members)).toBeUndefined();
    expect(nextShift(undefined, [])).toBeUndefined();
  });

  it('las notas se recortan, no se guardan vacías y la más reciente va primero', () => {
    const now = new Date('2026-10-26T10:00:00Z');
    let notes = addNote([], { id: 'a', text: '  Le cambiaron la cita al jueves ', author: 'Laura', now });
    notes = addNote(notes, { id: 'b', text: '   ', author: 'Laura', now });
    notes = addNote(notes, { id: 'c', text: 'x'.repeat(NOTE_MAX + 20), author: 'Andrés', now });
    expect(notes.map((n) => n.id)).toEqual(['c', 'a']);
    expect(notes[1].text).toBe('Le cambiaron la cita al jueves');
    expect(notes[0].text).toHaveLength(NOTE_MAX);
  });
});
