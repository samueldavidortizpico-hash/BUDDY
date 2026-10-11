/**
 * Auditoría automática de contraste (WCAG 2.x) de los pares texto/fondo usados en la app, en tema claro y oscuro.
 * Resultado documentado en docs/DESIGN_SYSTEM.md.
 */
import { Appearance } from 'react-native';

type Theme = typeof import('..');

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

function loadTheme(scheme: 'light' | 'dark'): Theme {
  jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(scheme);
  let theme!: Theme;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- hay que recargar el módulo con otro esquema
    theme = require('..');
  });
  return theme;
}

function textPairs({ ink, palette, gradients, tones, domains }: Theme): [string, string, string][] {
  // Texto de dominio: se mide contra las paradas donde se apoya el texto (las dos primeras; la tercera es el pie del degradado).
  const domainPairs = Object.entries(domains).flatMap(([name, d]) =>
    d.gradient.slice(0, 2).map((stop, i) => [`dominio ${name}: texto / parada ${i}`, d.text, stop] as [string, string, string]),
  );
  return [
    ['texto principal / fondo', ink.text, palette.warm],
    ['texto / superficie', ink.text, palette.white],
    ['texto / superficie 2', ink.text, palette.slatePale],
    ['secundario / superficie', ink.muted, palette.white],
    ['secundario / fondo', ink.muted, palette.warm],
    ['secundario / superficie 2', ink.muted, palette.slatePale],
    ['secundario / lavanda pálida', ink.muted, palette.lavenderPale],
    ['secundario / coral pálido', ink.muted, palette.coralPale],
    ['blanco / botón primario (inicio)', ink.inverse, gradients.primary[0]],
    ['blanco / botón primario (fin)', ink.inverse, gradients.primary[1]],
    ['texto / CTA coral (inicio)', ink.onCoral, gradients.coral[0]],
    ['texto / CTA coral (fin)', ink.onCoral, gradients.coral[1]],
    ['texto / secundario menta', ink.text, palette.mintPale],
    ['coral texto / botón peligro', ink.coral, palette.coralPale],
    ['blanco / tarjeta sueño', ink.inverse, palette.nightSoft],
    ['lavanda clara / tarjeta sueño', palette.nightText, palette.night],
    ['blanco / toast', ink.inverse, palette.petrol],
    ['menta texto / superficie', ink.mint, palette.white],
    ['menta texto / fondo', ink.mint, palette.warm],
    ['amarillo texto / seguimiento', ink.yellow, palette.yellowPale],
    ...Object.entries(tones).map(([name, t]) => [`tono ${name}: texto / fondo pálido`, t.fg, t.bg] as [string, string, string]),
    ...domainPairs,
  ];
}

describe.each(['light', 'dark'] as const)('tema %s', (scheme) => {
  const theme = loadTheme(scheme);
  it.each(textPairs(theme))('texto AA ≥ 4.5:1 — %s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each([
    ['icono blanco / IconButton menta', theme.ink.inverse, theme.palette.mintDeep],
    ['icono pestaña activa / píldora', theme.ink.mint, theme.palette.mintPale],
  ])('icono ≥ 3:1 — %s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});
