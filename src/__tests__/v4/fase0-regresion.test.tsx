/**
 * V4 Fase 0: regresión urgente. Fallan si desaparece para cada rol el acceso a Ajustes, Apariencia o Cerrar sesión, o si
 * un botón vuelve a quedar sin fondo visible (docs/AUDITORIA_V4.md).
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import Summary from '@/app/(caregiver)/(tabs)/summary';
import SettingsIndex from '@/app/(caregiver)/settings';
import SettingsSection from '@/app/(caregiver)/settings/[section]';
import { Button } from '@/components/button';
import { ElderScreen } from '@/features/elder/screen';
import { strings } from '@/i18n';
import { elderActions } from '@/state/actions';
import { RenderProviders, seedRenderData } from '@/testing/render-fixtures';
import { themes } from '@/theme';
import { contrast } from '@/theme/contrast';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSection = 'account';
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ section: mockSection }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  Link: ({ children }: { children: unknown }) => children,
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const ui = (el: React.ReactElement) => render(el, { wrapper: RenderProviders });

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
});

describe('administrador', () => {
  it('Inicio muestra "Ajustes" y abre la lista de Ajustes (con la persona registrada)', async () => {
    await seedRenderData();
    ui(<Summary />);
    fireEvent.press(screen.getByRole('button', { name: strings.settings.title }));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('Inicio muestra "Ajustes" también antes de registrar a la persona', async () => {
    const elder = await seedRenderData();
    elderActions.update(elder.id, { setupDone: false });
    ui(<Summary />);
    expect(screen.getByRole('button', { name: strings.settings.title })).toBeTruthy();
  });

  it('la lista de Ajustes tiene Cuenta y Apariencia, y vuelve atrás', async () => {
    await seedRenderData();
    ui(<SettingsIndex />);
    fireEvent.press(screen.getByRole('button', { name: strings.settings.sections.appearance }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/settings/[section]', params: { section: 'appearance' } });
    expect(screen.getByRole('button', { name: strings.settings.sections.account })).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.common.back })).toBeTruthy();
  });

  it('Apariencia permite elegir tema y tamaño de letra', async () => {
    await seedRenderData();
    mockSection = 'appearance';
    ui(<SettingsSection />);
    expect(screen.getByText(strings.settings.mode)).toBeTruthy();
    expect(screen.getByText(strings.settings.textSize)).toBeTruthy();
    expect(screen.getByText(strings.settings.sizes.max)).toBeTruthy();
  });

  it('Cuenta tiene "Cerrar sesión" visible', async () => {
    await seedRenderData();
    mockSection = 'account';
    ui(<SettingsSection />);
    expect(screen.getByRole('button', { name: strings.settings.signOut })).toBeTruthy();
  });
});

describe('adulto mayor', () => {
  it('"Opciones" está visible y ofrece Cerrar sesión y Entrar como administrador', async () => {
    const elder = await seedRenderData();
    ui(<ElderScreen elderId={elder.id} />);
    fireEvent.press(screen.getByRole('button', { name: strings.adminAccess.button }));
    expect(await screen.findByRole('button', { name: strings.adminAccess.signOut })).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.adminAccess.enterAdmin })).toBeTruthy();
  });
});

describe('botones visibles', () => {
  // "ghost" era transparente con un borde gris claro: en el iPhone no parecía un botón (error 2).
  it.each(['light', 'dark'] as const)('el botón secundario tiene fondo propio y texto legible (%s)', (name) => {
    const t = themes[name];
    const { getByRole } = render(<Button label="Editar" variant="ghost" />, { wrapper: RenderProviders });
    const style = StyleSheet.flatten(getByRole('button', { name: 'Editar' }).props.style);
    expect(style.backgroundColor).toBeTruthy();
    expect(style.backgroundColor).not.toBe('transparent');
    expect(contrast(t.c.text, t.c.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
