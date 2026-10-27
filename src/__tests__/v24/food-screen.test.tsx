/** V2.4 · Pantalla "Analizar un alimento": del formulario al resultado descriptivo con fuente. Datos ficticios. */
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import FoodAnalysis from '@/app/(caregiver)/food';
import { elderActions } from '@/state/actions';
import { strings } from '@/i18n';
import { RenderProviders, seedRenderData } from '@/testing/render-fixtures';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

const F = strings.food;

it('evalúa la tabla nutricional, relaciona la restricción del perfil y muestra la norma', async () => {
  const elder = await seedRenderData();
  elderActions.update(elder.id, { dietRestrictions: ['Bajo en sal'] });
  await render(<RenderProviders><FoodAnalysis /></RenderProviders>);
  await fireEvent.changeText(screen.getByLabelText(F.energy), '450');
  await fireEvent.changeText(screen.getByLabelText(F.sodium), '350');
  await fireEvent.changeText(screen.getByLabelText(F.sugars), '2');
  await fireEvent.changeText(screen.getByLabelText(F.satFat), '1');
  await fireEvent.changeText(screen.getByLabelText(F.transFat), '0');
  await fireEvent.press(screen.getByRole('button', { name: F.evaluate }));
  const r = within(screen.getByTestId('food-result'));
  expect(r.getByText('Supera el umbral de la norma en sodio.')).toBeTruthy();
  expect(r.getByText(/Restricción registrada por el cuidador: "Bajo en sal"/)).toBeTruthy();
  expect(r.getByText(/no es consejo médico ni nutricional personalizado/)).toBeTruthy();
  expect(r.getByText(/Res\. 810 de 2021/)).toBeTruthy();
});

it('un plato casero no tiene veredicto', async () => {
  await seedRenderData();
  await render(<RenderProviders><FoodAnalysis /></RenderProviders>);
  await fireEvent.press(screen.getAllByRole('tab', { name: F.no })[0]); // la primera pregunta: ¿envasado?
  await fireEvent.press(screen.getByRole('button', { name: F.evaluate }));
  expect(within(screen.getByTestId('food-result')).getByText(/consulta con un nutricionista/)).toBeTruthy();
});
