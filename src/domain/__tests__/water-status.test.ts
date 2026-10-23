import { scheduledWaterStatus } from '../health';

describe('horarios visuales de agua', () => {
  const now = new Date(2026, 9, 23, 13, 0);
  it('marca solo horarios cercanos a registros reales y deja el futuro pendiente', () => {
    expect(scheduledWaterStatus(['08:00', '12:00', '16:00'], [{ at: new Date(2026, 9, 23, 8, 20).toISOString() }, { at: new Date(2026, 9, 23, 12, 45).toISOString() }], now)).toEqual(['taken', 'taken', 'upcoming']);
  });
  it('marca como no registrado el horario pasado sin una toma asociada', () => {
    expect(scheduledWaterStatus(['08:00', '12:00', '16:00'], [{ at: new Date(2026, 9, 23, 8, 10).toISOString() }], now)).toEqual(['taken', 'missed', 'upcoming']);
  });
  it('no asigna a un horario una bebida registrada lejos de su hora', () => {
    expect(scheduledWaterStatus(['08:00', '12:00'], [{ at: new Date(2026, 9, 23, 10, 0).toISOString() }], now)).toEqual(['missed', 'missed']);
  });
});
