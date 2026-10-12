// Capturas del Hito 3: chat con la tarjeta fija del borrador, confirmación al final y "Nuevo" en Rutina.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
const { seedState } = createRequire(import.meta.url)('./seed.js');
const [base = 'http://localhost:8091', out = 'docs/capturas/v22/despues/hito3'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [360, 740]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${base}/`);
  await page.waitForTimeout(2500); // la app termina de hidratar antes de sembrar
  const seed = seedState({ days: 0 });
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('buddy.session', JSON.stringify(s.session)); localStorage.setItem('buddy.db', JSON.stringify(s.db)); }, seed);
  await page.goto(`${base}/buddy`);
  await page.waitForTimeout(2500);
  const say = async (text) => {
    await page.getByLabel('Escríbele a BUDDY…').fill(text);
    await page.getByRole('button', { name: 'Enviar' }).click();
    await page.waitForTimeout(1200);
  };
  await say('Ponle losartán a las 6 de la tarde');
  await page.screenshot({ path: `${out}/chat-pregunta-${w}.png` });
  await say('1 tableta');
  await page.screenshot({ path: `${out}/chat-tarjeta-fija-${w}.png` });
  await page.getByTestId('draft-pinned').getByRole('button', { name: 'Confirmar y agregar' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/chat-listo-${w}.png` });
  await page.getByText('Ver en Rutina').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/rutina-nuevo-${w}.png` });
  await page.close();
}
await browser.close();
console.log('ok');
