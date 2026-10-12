// Comprobación V2.4 · Hito 5 en web: la barra flota sobre el contenido (vidrio con desenfoque en web), deslizar el
// dedo sobre ella cambia de pestaña y tocar sigue funcionando. Uso: node scripts/capture/v24-tabbar.mjs [dist] [salida]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', out = 'docs/capturas/v24/barra'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const fail = [];
try {
  for (const [mode, tag] of [['light', 'claro'], ['dark', 'oscuro']]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await seed(page, base, seedState({ days: 9, full: true }), { mode, highContrast: false, textScale: 'normal', barGestures: true });
    await page.goto(`${base}/summary`);
    await page.waitForTimeout(2500);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/1-sobre-contenido-${tag}.png` });
    const bar = await page.getByRole('tablist').last().boundingBox();
    const y = bar.y + bar.height / 2 - 8;
    // Arrastre desde "Resumen" hasta "Salud" (4.ª pestaña).
    await page.mouse.move(bar.x + bar.width * 0.1, y);
    await page.mouse.down();
    for (let i = 1; i <= 14; i++) await page.mouse.move(bar.x + bar.width * (0.1 + (0.6 * i) / 14), y);
    await page.mouse.up();
    await page.waitForTimeout(1500);
    if (!page.url().endsWith('/health')) fail.push(`${tag}: el arrastre no llevó a Salud (${page.url()})`);
    await page.getByRole('tab', { name: 'Rutina' }).click();
    await page.waitForTimeout(1200);
    if (!page.url().endsWith('/routine')) fail.push(`${tag}: tocar "Rutina" no funcionó`);
    await page.screenshot({ path: `${out}/2-rutina-${tag}.png` });
    await page.close();
  }
  console.log(fail.length ? `FALLA: ${fail.join('; ')}` : 'OK: barra sobre el contenido, arrastre entre pestañas y toque');
} finally {
  await browser.close();
  close();
}
