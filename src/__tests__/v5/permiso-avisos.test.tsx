/**
 * V5.3 — Permiso de avisos en contexto (auditoría de venta, spec release/store-readiness, tarea 3.4): la app pide el
 * permiso de notificaciones solo cuando la persona toca "Activar avisos", después de explicar que sirve para avisar
 * cada toma. Nunca al mostrar la pantalla.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { NotificationIntro } from '@/app/elder';
import { RenderProviders, seedRenderData } from '@/testing/render-fixtures';

jest.mock('react-native-purchases', () => ({ __esModule: true, default: {}, LOG_LEVEL: { WARN: 3 } }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

describe('permiso de avisos', () => {
  beforeEach(() => {
    jest.mocked(Notifications.requestPermissionsAsync).mockClear();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: true } as never);
  });
  afterAll(() => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true, canAskAgain: true } as never);
  });

  it('explica que sirve para avisar las tomas y no lo pide al mostrarse', async () => {
    const elderId = (await seedRenderData()).id;
    await render(
      <RenderProviders>
        <NotificationIntro elderId={elderId} onContinue={jest.fn()} />
      </RenderProviders>,
    );
    expect(screen.getByText(/cada toma de tus medicamentos/)).toBeTruthy();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('lo pide solo al tocar "Activar avisos"', async () => {
    const elderId = (await seedRenderData()).id;
    const onContinue = jest.fn();
    await render(
      <RenderProviders>
        <NotificationIntro elderId={elderId} onContinue={onContinue} />
      </RenderProviders>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Activar avisos' }));
    await waitFor(() => expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onContinue).toHaveBeenCalled());
  });

  it('"Ahora no" sigue sin pedir el permiso', async () => {
    const elderId = (await seedRenderData()).id;
    await render(
      <RenderProviders>
        <NotificationIntro elderId={elderId} onContinue={jest.fn()} />
      </RenderProviders>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Ahora no' }));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
