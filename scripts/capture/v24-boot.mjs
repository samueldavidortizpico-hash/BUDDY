// Capturas V2.4 · Hito 7: portada de carga (web). Toma la portada al abrir y la app ya revelada, en claro y oscuro.
// Uso: npx expo export --platform web && node scripts/capture/v24-boot.mjs [dist] [salida]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', out = 'docs/capturas/v24/portada'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
try {
  for (const [mode, tag] of [['light', 'claro'], ['dark', 'oscuro']]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await seed(page, base, seedState({ days: 0 }), { mode, highContrast: false, textScale: 'normal', barGestures: true });
    const t0 = Date.now();
    await page.goto(`${base}/summary`, { waitUntil: 'commit' });
    await page.waitForSelector('[data-testid="boot-screen"]', { timeout: 15000 });
    await page.screenshot({ path: `${out}/1-portada-${tag}.png` });
    await page.waitForSelector('[data-testid="boot-screen"]', { state: 'detached', timeout: 20000 });
    console.log(tag, `portada visible hasta ${Date.now() - t0} ms`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/2-app-revelada-${tag}.png` });
    await page.close();
  }
} finally {
  await browser.close();
  close();
}
