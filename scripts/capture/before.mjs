// Capturas "antes" de la ronda v2.2 (login con scroll y Salud con respuestas). Uso: node scripts/capture/before.mjs http://localhost:8090 docs/capturas/v22/antes
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [base = 'http://localhost:8090', out = 'docs/capturas/v22/antes'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${base}/sign-in`);
await page.waitForTimeout(2500);
for (const y of [0, 200, 400]) {
  await page.evaluate((y) => document.querySelectorAll('div').forEach((d) => { if (d.scrollHeight > d.clientHeight + 20 && getComputedStyle(d).overflowY !== 'visible') d.scrollTop = y; }), y);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/login-scroll-${y}.png` });
}

const seed = seedState({ days: 9, mood: 'bad', sleep: 'bad' });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('buddy.session', JSON.stringify(s.session)); localStorage.setItem('buddy.db', JSON.stringify(s.db)); }, seed);
await page.goto(`${base}/health`);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/salud-390.png`, fullPage: true });
await page.setViewportSize({ width: 360, height: 740 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/salud-360.png`, fullPage: true });
await page.goto(`${base}/summary`);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/resumen-360.png`, fullPage: true });
await browser.close();
console.log('Capturas en', out);
