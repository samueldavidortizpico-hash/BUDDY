// Comprobación V2.4 · Hito 6 en web: solicitar ubicación, el adulto mayor acepta (en "Probar como") y el mapa aparece
// con su atribución. Geolocalización SIMULADA de Playwright (coordenadas ficticias de prueba).
// Uso: npx expo export --platform web && node scripts/capture/v24-location.mjs [dist] [salida]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', out = 'docs/capturas/v24/ubicacion'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const fail = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: 4.6, longitude: -74.08, accuracy: 30 }, permissions: ['geolocation'] });
  const page = await context.newPage();
  await seed(page, base, seedState({ days: 0 }));
  await page.goto(`${base}/location`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/1-no-compartida-390.png` });
  await page.getByRole('button', { name: 'Solicitar ubicación' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/2-solicitada-390.png` });
  await page.goto(`${base}/handoff`);
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /^Probar como/ }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/3-adulto-mayor-pregunta-390.png` });
  await page.getByRole('button', { name: 'Aceptar' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/4-adulto-mayor-comparte-390.png` });
  await page.getByRole('button', { name: /Salir/ }).first().click();
  await page.waitForTimeout(1500);
  await page.goto(`${base}/location`);
  await page.waitForTimeout(3000);
  const iframe = await page.locator('iframe').count();
  if (!iframe) fail.push('no aparece el mapa');
  if (!(await page.getByText(/Última ubicación:/).count())) fail.push('sin "Última ubicación"');
  if (!(await page.getByText(/OpenStreetMap/).count())) fail.push('sin atribución de OpenStreetMap');
  await page.screenshot({ path: `${out}/5-mapa-390.png` });
  console.log(fail.length ? `FALLA: ${fail.join('; ')}` : 'OK: solicitud, consentimiento, mapa con hora y atribución');
} finally {
  await browser.close();
  close();
}
