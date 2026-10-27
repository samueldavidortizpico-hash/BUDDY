/** V3.1: legacy PinPad remains unit-tested; account exit now checks the owner password. */
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Unlock from '@/app/elder/unlock';
import Handoff from '@/app/(caregiver)/handoff';
import { PinPad } from '@/components/pin-pad';
import { db } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { elderActions } from '@/state/actions';
import { handoffActions } from '@/state/handoff';
import { sessionActions, useSession } from '@/state/session';
import { RenderProviders, seedRenderData } from '@/testing/render-fixtures';
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => false, replace: mockReplace }),
  useIsFocused: () => true, useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
let elderId: string;
let ownerId: string;
beforeEach(async () => {
  elderId = (await seedRenderData()).id;
  const owner = await sessionActions.signUp({ name: '[PRUEBA] Admin', email: `password-ui-${Date.now()}-${Math.random()}@example.test`, password: 'Segura123!' });
  ownerId = owner.id;
  db.update('elders', elderId, { ownerUserId: owner.id });
  elderActions.setActive(elderId);
  await handoffActions.setPin('1234');
  handoffActions.start(elderId);
  mockReplace.mockClear(); mockPush.mockClear();
});
async function password(ui: Awaited<ReturnType<typeof render>>, value: string) {
  await fireEvent.changeText(ui.getByLabelText('Contraseña del administrador'), value);
  await fireEvent.press(ui.getByRole('button', { name: 'Entrar como administrador' }));
}
async function enter(ui: Awaited<ReturnType<typeof render>>, pin: string) {
  for (const digit of pin) await fireEvent.press(ui.getByRole('button', { name: strings.pin.digit(digit) }));
}
it('migrates an old locked handoff using the account password and preserves care data', async () => {
  const ui = await render(<Unlock />, { wrapper: RenderProviders });
  await password(ui, 'Segura123!');
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/summary'));
  expect(db.draftHandoff()).toBeNull();
  expect(useSession.getState().user?.id).toBe(ownerId);
  expect(db.get('elders', elderId)).toBeTruthy();
  expect(handoffActions.hasPin()).toBe(false);
});
it('wrong account password stays in elder mode, without accepting the old PIN', async () => {
  const ui = await render(<Unlock />, { wrapper: RenderProviders });
  await password(ui, '1234');
  expect(await ui.findByText(strings.auth.errors.invalid)).toBeTruthy();
  expect(db.draftHandoff()).not.toBeNull();
  expect(mockReplace).not.toHaveBeenCalled();
});
it('legacy PinPad does not submit twice while validation is pending', async () => {
  let finish!: () => void;
  const onComplete = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
  const ui = await render(<PinPad onComplete={onComplete} />, { wrapper: RenderProviders });
  await enter(ui, '123');
  // RNTL 14 espera lo que devuelve el manejador: la 4.ª pulsación queda pendiente hasta finish(), así que no se espera aquí.
  const fourth = fireEvent.press(ui.getByRole('button', { name: strings.pin.digit('4') }));
  await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  await fireEvent.press(ui.getByRole('button', { name: strings.pin.digit('5') }));
  expect(onComplete).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
  await fourth;
  expect(ui.getByLabelText('0 de 4')).toBeTruthy();
});
it('announces disabled legacy keys', async () => {
  const ui = await render(<PinPad onComplete={jest.fn()} disabled />, { wrapper: RenderProviders });
  expect(ui.getByRole('button', { name: strings.pin.digit('1') })).toBeDisabled();
});
it('does not need or create a separate PIN from the handoff route', async () => {
  db.setHandoff(null);
  const ui = await render(<Handoff />, { wrapper: RenderProviders });
  await fireEvent.press(ui.getByRole('button', { name: 'Cambiar a la cuenta de Rosa' }));
  expect(mockPush).toHaveBeenCalledWith('/account-switch');
  expect(db.draftHandoff()).toBeNull();
});
it('controls storage errors and enables a retry', async () => {
  const verify = jest.spyOn(sessionActions, 'returnToAdmin').mockRejectedValueOnce(new Error('Controlled storage error'));
  try {
    const ui = await render(<Unlock />, { wrapper: RenderProviders });
    await password(ui, 'Segura123!');
    expect(await ui.findByText('No pudimos comprobar la contraseña.')).toBeTruthy();
    expect(ui.getByRole('button', { name: 'Entrar como administrador' })).not.toBeDisabled();
    expect(db.draftHandoff()).not.toBeNull();
  } finally { verify.mockRestore(); }
});
