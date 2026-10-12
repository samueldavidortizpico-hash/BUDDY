// Capturas V2.4 · Hito 2: "agrega dolex" con presentaciones del INVIMA y tarjeta de información (red real hacia NLM).
// Uso: npx expo export --platform web && node scripts/capture/v24-dolex.mjs [dist] [salida]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', out = 'docs/capturas/v24/dolex'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
try {
  for (const [w, h, a, tag] of [
    [390, 844, { mode: 'light', highContrast: false, textScale: 'normal' }, '390-claro'],
    [360, 740, { mode: 'dark', highContrast: false, textScale: 'normal' }, '360-oscuro'],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await seed(page, base, seedState({ days: 0 }), a);
    await page.goto(`${base}/buddy`);
    await page.waitForTimeout(2200);
    await page.getByLabel('Escríbele a BUDDY…').fill('agrega dolex');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${out}/1-presentaciones-${tag}.png` });
    await page.getByTestId('draft-pinned').getByRole('button', { name: /^Dolex Avanzado · 500 mg/ }).click();
    await page.waitForTimeout(6000); // consulta real a RxNav y MedlinePlus (o sin conexión)
    await page.screenshot({ path: `${out}/2-info-${tag}.png` });
    console.log(tag, (await page.getByTestId('med-info').innerText()).replace(/\s+/g, ' ').slice(0, 400));
    await page.close();
  }
} finally {
  await browser.close();
  close();
}
