/**
 * Auditoría automática de contraste (WCAG 2.x) de los pares texto/fondo usados en la app.
 * Resultado documentado en docs/ACCESSIBILITY_AUDIT.md.
 */
import { gradients, ink, palette, tones } from '..';

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

const TEXT_PAIRS: [string, string, string][] = [
  ['texto principal / fondo', ink.text, palette.warm],
  ['título / fondo', ink.title, palette.warm],
  ['secundario / blanco', ink.muted, palette.white],
  ['secundario / fondo', ink.muted, palette.warm],
  ['secundario / lavanda pálida', ink.muted, palette.lavenderPale],
  ['secundario / coral pálido', ink.muted, palette.coralPale],
  ['secundario / segmentado', ink.muted, palette.segment],
  ['blanco / botón primario (inicio)', ink.inverse, gradients.primary[0]],
  ['blanco / botón primario (fin)', ink.inverse, gradients.primary[1]],
  ['blanco / CTA coral (inicio)', ink.inverse, gradients.coral[0]],
  ['blanco / CTA coral (fin)', ink.inverse, gradients.coral[1]],
  ['petróleo / secundario menta', ink.text, palette.mintPale],
  ['coral texto / botón peligro', ink.coral, palette.coralPale],
  ['blanco / tarjeta sueño', ink.inverse, palette.nightSoft],
  ['lavanda clara / tarjeta sueño', palette.nightText, palette.night],
  ['menta / tarjeta petróleo', palette.mint, palette.petrol],
  ['blanco / toast', ink.inverse, palette.petrolDeep],
  ['menta texto / blanco', ink.mint, palette.white],
  ['menta texto / fondo', ink.mint, palette.warm],
  ['amarillo texto / DemoBadge', ink.yellow, palette.yellowPale],
  ...Object.entries(tones).map(([name, t]) => [`tono ${name}: texto / fondo pálido`, t.fg, t.bg] as [string, string, string]),
];

describe('contraste de texto (AA ≥ 4.5:1)', () => {
  it.each(TEXT_PAIRS)('%s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contraste de iconos y bordes de control (≥ 3:1)', () => {
  it.each([
    ['icono blanco / IconButton menta', ink.inverse, palette.mintDeep],
    ['icono pestaña activa / píldora', ink.mint, palette.mintPale],
    ['icono blanco / tarjeta ánimo lavanda', ink.inverse, palette.lavender],
  ])('%s', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});
