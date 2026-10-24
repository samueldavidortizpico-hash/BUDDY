import { render, screen } from '@testing-library/react-native';

import { WaterToday } from '@/features/health/water-today';
import Health from '@/app/(caregiver)/(tabs)/health';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { RenderProviders, seedRenderData, testUser } from '@/testing/render-fixtures';
import { toISODate } from '@/utils/dates';
import { afterEach } from '@jest/globals';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

describe('historiales visuales de Salud', () => {
  let elderId: string;
  beforeEach(async () => { elderId = (await seedRenderData()).id; });
  afterEach(() => { jest.useRealTimers(); });

  it('muestra vasos programados como registrados, omitidos o pendientes usando marcas de tiempo reales', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 23, 13, 0));
    const now = new Date();
    const date = toISODate(now);
    const at = (hour: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0).toISOString();
    db.insert('waterPlans', { glasses: 3, times: ['08:00', '12:00', '23:59'] }, { userId: testUser.id, elderId });
    db.insert('water', { date, at: at(8) }, { userId: testUser.id, elderId });
    const elder = db.get('elders', elderId)!;
    render(<RenderProviders><WaterToday elder={elder} /></RenderProviders>);
    expect(screen.getByText('Vasos de agua hoy')).toBeTruthy();
    expect(screen.getByLabelText('Vaso 1, 08:00, registrado')).toBeTruthy();
    expect(screen.getByLabelText('Vaso 2, 12:00, sin registro')).toBeTruthy();
    expect(screen.getByLabelText('Vaso 3, 23:59, pendiente')).toBeTruthy();
    expect(screen.getByText('1 de 3')).toBeTruthy();
  });

  it('mantiene Salud mental y Sueño como métricas visibles, sin inventar valores cuando no hay respuestas', () => {
    render(<RenderProviders><Health /></RenderProviders>);
    expect(screen.getByRole('button', { name: strings.health.mood })).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.health.sleep })).toBeTruthy();
    expect(screen.getAllByText(strings.health.noData).length).toBeGreaterThanOrEqual(2);
  });
});
