/**
 * Auditoría automática de contraste (WCAG 2.x) de los pares texto/fondo reales en los 4 temas:
 * claro, oscuro, alto contraste claro y alto contraste oscuro. Resultado documentado en docs/DESIGN_SYSTEM.md.
 */
import { themes, type Theme } from '..';
import { contrast } from '../contrast';

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

// V4.4: primera apertura. Etiqueta, título y texto de cada presentación sobre el fondo de su paso, en los 4 temas.
describe.each(Object.values(themes).map((t) => [t.name, t] as const))('presentaciones %s', (_name, t) => {
  it.each(t.intro.map((sl, i) => [i + 1, sl] as const))('paso %i: etiqueta, título y texto ≥ 4,5:1', (_i, sl) => {
    expect(contrast(sl.eyebrow, sl.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.c.text, sl.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.c.muted, sl.bg)).toBeGreaterThanOrEqual(4.5);
  });
});

// V4: mosaicos de icono (glifo ≥ 3:1) y tarjetas de estado del Inicio (texto ≥ 4,5:1).
describe.each(['light', 'dark'] as const)('V4 %s', (name) => {
  const t = themes[name];
  it.each(Object.entries(t.tiles))('mosaico %s ≥ 3:1', (_k, tile) => {
    expect(contrast(tile.fg, tile.bg)).toBeGreaterThanOrEqual(3);
  });
  it.each(Object.entries(t.status))('estado %s: texto ≥ 4,5:1', (_k, st) => {
    expect(contrast(st.text, st.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(st.muted, st.bg)).toBeGreaterThanOrEqual(4.5);
  });
});
