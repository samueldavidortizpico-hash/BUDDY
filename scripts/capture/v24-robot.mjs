// Comprobación V2.4 · Hito 4 en web: arrastrar el robot con el ratón, imán al borde, posición recordada al recargar
// y burbujas visibles. Uso: npx expo export --platform web && node scripts/capture/v24-robot.mjs [dist] [salida]
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', out = 'docs/capturas/v24/robot'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const fail = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await seed(page, base, seedState({ days: 9, mood: 'bad', sleep: 'bad', full: true }));
  await page.goto(`${base}/summary`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/1-burbujas-390.png` });
  const robot = page.getByTestId('launcher-robot');
  const box0 = await robot.boundingBox();
  const bubbles = await page.getByTestId('launcher-bubble').count();
  console.log('robot inicial', box0, 'burbujas', bubbles);
  if (bubbles < 1) fail.push('sin burbujas visibles');
  // Arrastre hacia arriba y a la izquierda (pasa la mitad: el imán lo lleva al borde izquierdo).
  const cx = box0.x + box0.width / 2;
  const cy = box0.y + box0.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(cx - 25 * i, cy - 30 * i);
  await page.mouse.up();
  await page.waitForTimeout(900);
  const box1 = await robot.boundingBox();
  console.log('tras arrastrar', box1);
  if (!(box1.x < 40)) fail.push(`el imán no lo llevó al borde izquierdo (x=${box1.x})`);
  if (!(box1.y < box0.y - 200)) fail.push('no subió');
  await page.screenshot({ path: `${out}/2-arrastrado-390.png` });
  await page.reload();
  await page.waitForTimeout(2500);
  const box2 = await page.getByTestId('launcher-robot').boundingBox();
  console.log('tras recargar', box2);
  if (Math.abs(box2.x - box1.x) > 4 || Math.abs(box2.y - box1.y) > 4) fail.push('no recordó la posición');
  await page.screenshot({ path: `${out}/3-recargado-390.png` });
  console.log(fail.length ? `FALLA: ${fail.join('; ')}` : 'OK: arrastre, imán, posición recordada y burbujas');
} finally {
  await browser.close();
  close();
}
