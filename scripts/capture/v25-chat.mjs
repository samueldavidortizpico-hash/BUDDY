// V2.5 · Chat: el compositor debe verse siempre, separado >= 12 de la barra de pestañas, y haber flecha "Volver".
// Uso: npx expo export --platform web && node scripts/capture/v25-chat.mjs [dist] [salida] [etiqueta]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', out = 'docs/capturas/v25', tag = 'despues'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const fail = [];
const THEMES = [['claro', { mode: 'light', highContrast: false }], ['oscuro', { mode: 'dark', highContrast: false }], ['contraste', { mode: 'light', highContrast: true }]];
const SIZES = [[390, 844, 'sin-teclado'], [360, 740, 'sin-teclado'], [390, 480, 'teclado'], [360, 480, 'teclado']];
try {
  for (const [name, a] of THEMES) {
    for (const [w, h, kb] of SIZES) {
      if (name !== 'claro' && w === 390 && kb === 'teclado') continue;
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await seed(page, base, seedState({ days: 0 }), { ...a, textScale: 'normal', barGestures: true });
      await page.goto(`${base}/buddy`);
      await page.waitForTimeout(2200);
      const input = page.getByLabel('Escríbele a BUDDY…');
      const ib = await input.boundingBox();
      const bar = await page.getByRole('tablist').last().boundingBox();
      const id = `${w}x${h}-${name}-${kb}`;
      if (!ib) fail.push(`${id}: el campo no existe`);
      else {
        if (ib.y < 0 || ib.y + ib.height > h) fail.push(`${id}: el compositor queda fuera de la pantalla (y=${ib.y}, alto=${ib.height}, pantalla=${h})`);
        if (ib.height < 52) fail.push(`${id}: campo de ${ib.height}px (< 52)`);
        // Con teclado simulado (viewport bajo) no hay espacio para barra: se oculta; sin teclado, >= 12 de separación.
        if (bar && kb === 'sin-teclado' && bar.y - (ib.y + ib.height) < 12) fail.push(`${id}: solo ${Math.round(bar.y - (ib.y + ib.height))}px entre el compositor y la barra (< 12)`);
        if (bar && kb === 'teclado' && ib.y + ib.height > bar.y && ib.y < bar.y + bar.height) fail.push(`${id}: la barra de pestañas solapa el compositor`);
      }
      const back = await page.getByRole('button', { name: 'Volver' }).count();
      if (!back) fail.push(`${id}: sin botón "Volver"`);
      await page.screenshot({ path: `${out}/${tag}-${id}.png` });
      await page.close();
    }
  }
  console.log(fail.length ? `FALLAS (${fail.length}):\n- ${fail.join('\n- ')}` : 'OK: compositor visible, separado de la barra, con flecha Volver');
  process.exitCode = fail.length ? 1 : 0;
} finally {
  await browser.close();
  close();
}
