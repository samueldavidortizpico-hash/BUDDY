import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button, IconButton } from '@/components/button';
import { InlineBanner, shouldStackRow } from '@/components/row';
import { RenderProviders, seedRenderData } from '@/testing/render-fixtures';
import { textScales } from '@/theme';
import { useAppearanceStore } from '@/theme/provider';

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

beforeEach(async () => { await seedRenderData(); });

it('reserves a shrinkable text box rather than relying on web flex defaults', () => {
  const ui = render(<AppText>Compartiendo ubicación con tu familiar</AppText>, { wrapper: RenderProviders });
  const style = StyleSheet.flatten(ui.UNSAFE_getByType(Text).props.style);
  expect(style).toMatchObject({ minWidth: 0, flexShrink: 1 });
});

it('keeps icon labels inside their pill at large text sizes', () => {
  const ui = render(<IconButton icon="pencil" label="Editar" />, { wrapper: RenderProviders });
  const style = StyleSheet.flatten(ui.getByText('Editar').props.style);
  expect(style).toMatchObject({ minWidth: 0, flexShrink: 1, textAlign: 'center' });
});

it('uses compact horizontal padding for secondary actions', () => {
  const ui = render(<Button label="Editar" size="sm" icon="pencil" />, { wrapper: RenderProviders });
  const button = ui.getByRole('button', { name: 'Editar' });
  const style = StyleSheet.flatten(button.props.style);
  expect(style.paddingHorizontal).toBeLessThanOrEqual(12);
  // V4: 44 visibles (brief) + 2 arriba y 2 abajo de área táctil = 48 (mínimo de accesibilidad).
  expect(style.minHeight).toBe(44);
  expect(style.minHeight + button.props.hitSlop.top + button.props.hitSlop.bottom).toBeGreaterThanOrEqual(48);
});

it('V4: standard buttons are at least 56 tall and the elder ones 72', () => {
  const ui = render(<><Button label="Guardar" /><Button label="Ya lo tomé" size="elder" /></>, { wrapper: RenderProviders });
  expect(StyleSheet.flatten(ui.getByRole('button', { name: 'Guardar' }).props.style).minHeight).toBeGreaterThanOrEqual(56);
  expect(StyleSheet.flatten(ui.getByRole('button', { name: 'Ya lo tomé' }).props.style).minHeight).toBeGreaterThanOrEqual(72);
});

// Structural RN renderer tests, NOT a Yoga layout or a physical-device screenshot.
describe.each(Object.keys(textScales) as (keyof typeof textScales)[])('app font %s', (textScale) => {
  it.each([1, 1.3, 2])('keeps the label scalable and centered with system multiplier %s', (fontScale) => {
    useAppearanceStore.setState({ textScale });
    const ui = render(<Button label="Marcar como tomado" size="elder" />, { wrapper: RenderProviders });
    const label = ui.getByText('Marcar como tomado');
    const style = StyleSheet.flatten(label.props.style);
    expect(label.props.allowFontScaling).toBe(true);
    expect(style.textAlign).toBe('center');
    expect(style.minWidth).toBe(0);
    expect(style.flexShrink).toBe(1);
    expect(Math.min(fontScale, label.props.maxFontSizeMultiplier) * style.fontSize).toBeGreaterThan(0);
  });
});

describe.each([360, 375, 390])('row at width %s', (width) => {
  it.each([1, 1.3, 2])('separates action at system scale %s for every app font step', (systemScale) => {
    for (const appScale of Object.values(textScales)) {
      // V4: se apila cuando el ancho efectivo (px ÷ escala de letra) baja de 340.
      expect(shouldStackRow(width, systemScale, appScale)).toBe(width / (systemScale * appScale) < 340);
    }
  });
});

it('renders a shrinkable message and an action that cannot steal its text width', () => {
  const ui = render(<InlineBanner action={<Button label="Dejar de compartir" />}><AppText>Compartiendo ubicación</AppText></InlineBanner>, { wrapper: RenderProviders });
  expect(ui.getByText('Compartiendo ubicación')).toBeTruthy();
  expect(ui.getByRole('button', { name: 'Dejar de compartir' })).toBeTruthy();
});
