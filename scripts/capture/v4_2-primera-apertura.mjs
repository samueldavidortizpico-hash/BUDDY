// V4.2: capturas de la primera apertura (carga, 4 presentaciones, Bienvenido) para compararlas con las referencias.
// Uso: npx expo export --platform web --output-dir <dist> && node scripts/capture/v4_2-primera-apertura.mjs <dist> <carpeta> [ancho] [letra] [modo]
//   letra: normal | xlarge | max   ·   modo: light | dark
// La portada de carga se congela bloqueando las fuentes (el arranque espera a que carguen), así se puede fotografiar.
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadPlaywright } from './pw.mjs';
import { serveDist } from './serve.mjs';

const [dist = 'dist', out = 'docs/capturas/v4_2', width = '390', textScale = 'normal', mode = 'light'] = process.argv.slice(2);
const W = Number(width);
const H = W === 390 ? 844 : W === 375 ? 812 : 780;
const suffix = `${W === 390 ? '' : `-${W}`}${textScale === 'normal' ? '' : `-letra-${textScale}`}${mode === 'dark' ? '-oscuro' : ''}`;
mkdirSync(out, { recursive: true });

const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const appearance = { mode, highContrast: false, textScale };

async function fresh() {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.addInitScript((a) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      localStorage.setItem('buddy.appearance', JSON.stringify({ state: a, version: 1 }));
      sessionStorage.setItem('seeded', '1');
    }
  }, appearance);
  return page;
}

// 1. Carga: las fuentes nunca responden y la portada queda visible.
{
  const page = await fresh();
  await page.route('**/*.ttf', () => {});
  await page.goto(`${base}/`);
  await page.waitForSelector('[data-testid="boot-screen"]', { timeout: 15000 });
  await page.waitForTimeout(1600);
  // page.screenshot espera las fuentes (que aquí nunca llegan): se usa la captura directa del navegador.
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/01-carga${suffix}.png`, Buffer.from(data, 'base64'));
  await page.close();
}

// 2–5. Presentaciones (avanzando con "Siguiente") y 6. Bienvenido.
{
  const page = await fresh();
  await page.goto(`${base}/onboarding`);
  await page.waitForTimeout(3500);
  const names = ['02-companero', '03-rutinas', '04-bienestar', '05-familia'];
  for (const [i, name] of names.entries()) {
    await page.screenshot({ path: `${out}/${name}${suffix}.png` });
    if (i < names.length - 1) {
      await page.getByRole('button', { name: 'Siguiente' }).first().click();
      await page.waitForTimeout(1400);
    }
  }
  await page.goto(`${base}/`);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/06-bienvenido${suffix}.png` });
  await page.close();
}

await browser.close();
close();
console.log('capturas en', out, suffix || '(390, letra normal, claro)');
