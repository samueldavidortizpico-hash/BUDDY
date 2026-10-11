/**
 * Auditoría automática de contraste (WCAG 2.x) de los pares texto/fondo reales en los 4 temas:
 * claro, oscuro, alto contraste claro y alto contraste oscuro. Resultado documentado en docs/DESIGN_SYSTEM.md.
 */
import { themes, type Theme } from '..';

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

const solid = (hex: string) => /^#[0-9a-f]{6}$/i.test(hex);

function textPairs(t: Theme): [string, string, string][] {
  const { c, ink, tones, domains, gradients } = t;
  const domainPairs = Object.entries(domains).flatMap(([name, d]) =>
    d.gradient.slice(0, 2).map((stop, i) => [`dominio ${name}: texto / parada ${i}`, d.text, stop] as [string, string, string]),
  );
  const pairs: [string, string, string][] = [
    ['texto / fondo', c.text, c.bg],
    ['texto / superficie', c.text, c.surface],
    ['texto / superficie 2', c.text, c.surface2],
    ['secundario / superficie', c.muted, c.surface],
    ['secundario / fondo', c.muted, c.bg],
    ['secundario / superficie 2', c.muted, c.surface2],
    ['secundario / lavanda pálida', c.muted, c.lavenderPale],
    ['secundario / coral pálido', c.muted, c.coralPale],
    ['principal: texto / inicio', c.onPrimary, gradients.primary[0]],
    ['principal: texto / fin', c.onPrimary, gradients.primary[1]],
    ['CTA coral: texto / inicio', c.onCoral, gradients.coral[0]],
    ['CTA coral: texto / fin', c.onCoral, gradients.coral[1]],
    ['texto / menta pálida', c.text, c.mintPale],
    ['menta texto / superficie', ink.mint, c.surface],
    ['peligro texto / pálido', ink.danger, c.dangerPale],
    ['seguimiento texto / ámbar pálido', ink.yellow, c.yellowPale],
    ...Object.entries(tones).map(([name, tn]) => [`tono ${name}: texto / fondo`, tn.fg, tn.bg] as [string, string, string]),
    ...domainPairs,
  ];
  return pairs.filter(([, fg, bg]) => solid(fg) && solid(bg));
}

describe.each(Object.values(themes).map((t) => [t.name, t] as const))('tema %s', (_name, theme) => {
  it.each(textPairs(theme))('texto AA ≥ 4.5:1 — %s', (_n, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  if (theme.hc) {
    // 7:1 (AAA) para texto; los acentos fijados por la adenda (#006B3C = 6.5:1) se quedan en AA.
    it.each(textPairs(theme).filter(([n]) => /^(texto|secundario|principal)/.test(n)))('alto contraste ≥ 7:1 — %s', (_n, fg, bg) => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(7);
    });
  }
  it('icono blanco sobre menta profunda ≥ 3:1', () => {
    if (!theme.hc) expect(contrast('#FFFFFF', theme.c.mintDeep)).toBeGreaterThanOrEqual(3);
  });
});
