// Capturas V2.4 · chat guiado: menú, pregunta en la tarjeta, respuestas tocables, resumen, línea "agregado" y temas.
// Uso: npx expo export --platform web && node scripts/capture/v24-chat.mjs [dist] [salida]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', out = 'docs/capturas/v24/chat'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const runs = [
  { w: 390, h: 844, a: { mode: 'light', highContrast: false, textScale: 'normal' }, tag: '390-claro' },
  { w: 360, h: 740, a: { mode: 'light', highContrast: false, textScale: 'normal' }, tag: '360-claro' },
  { w: 360, h: 740, a: { mode: 'dark', highContrast: false, textScale: 'normal' }, tag: '360-oscuro' },
  { w: 360, h: 740, a: { mode: 'light', highContrast: true, textScale: 'normal' }, tag: '360-contraste' },
  { w: 360, h: 740, a: { mode: 'light', highContrast: false, textScale: 'max' }, tag: '360-texto200' },
];
try {
  for (const r of runs) {
    const page = await browser.newPage({ viewport: { width: r.w, height: r.h } });
    await seed(page, base, seedState({ days: 0 }), r.a);
    await page.goto(`${base}/buddy`);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/1-menu-${r.tag}.png` });
    const card = page.getByTestId('draft-pinned');
    await page.getByLabel('Escríbele a BUDDY…').fill('agrega losartán');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/2-pregunta-dosis-${r.tag}.png` });
    await card.getByRole('button', { name: '1 tableta' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/3-pregunta-hora-${r.tag}.png` });
    await card.getByRole('button', { name: '6:00 p. m.' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/4-resumen-${r.tag}.png` });
    await card.getByRole('button', { name: 'Confirmar y agregar' }).click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/5-agregado-${r.tag}.png` });
    // Cita médica desde el botón "+", solo con botones.
    await page.getByRole('button', { name: 'Más acciones' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Cita médica' }).last().click();
    await page.waitForTimeout(900);
    await card.getByRole('button', { name: 'Médico general' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/6-cita-fecha-${r.tag}.png` });
    await page.close();
  }
  console.log(`ok: capturas en ${out}`);
} finally {
  await browser.close();
  close();
}
