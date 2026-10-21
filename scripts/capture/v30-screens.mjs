// V3.0: capturas de pantallas en claro, oscuro y alto contraste (390×844 y 360×740) con datos SINTÉTICOS.
// Uso: npx expo export --platform web && node scripts/capture/v30-screens.mjs <hito> <ruta> [<ruta>…]
//   p. ej. node scripts/capture/v30-screens.mjs hito3 /summary /settings/alerts
// Una ruta "/elder" se abre con "Probar como" desde /handoff. Falla si hay desplazamiento horizontal.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [hito = 'hito', ...routes] = process.argv.slice(2);
const out = 'docs/capturas/v30';
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist('dist');
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const THEMES = [['claro', { mode: 'light', highContrast: false }], ['oscuro', { mode: 'dark', highContrast: false }], ['contraste', { mode: 'light', highContrast: true }]];
const fail = [];
try {
  for (const [name, a] of THEMES) {
    for (const [w, h] of [[390, 844], [360, 740]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await seed(page, base, seedState({ days: 2, full: true }), { ...a, textScale: 'normal' });
      for (const route of routes) {
        if (route === '/elder') {
          await page.goto(`${base}/handoff`);
          await page.waitForTimeout(1500);
          const test = page.getByRole('button', { name: /^Probar como/ });
          if (await test.count()) await test.first().click();
        } else await page.goto(`${base}${route}`);
        await page.waitForTimeout(1800);
        const id = `${hito}-${route.replace(/\//g, '_').replace(/^_/, '') || 'root'}-${w}x${h}-${name}`;
        if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fail.push(`${id}: desplazamiento horizontal`);
        await page.screenshot({ path: `${out}/${id}.png`, fullPage: false });
      }
      await page.close();
    }
  }
  console.log(fail.length ? `FALLAS:\n- ${fail.join('\n- ')}` : `OK: ${routes.length} rutas × 2 tamaños × 3 temas`);
  process.exitCode = fail.length ? 1 : 0;
} finally {
  await browser.close();
  close();
}
