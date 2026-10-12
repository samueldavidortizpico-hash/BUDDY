import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
const { seedState } = createRequire(import.meta.url)('./seed.js');
const [base, out] = process.argv.slice(2);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 520 } });
await page.goto(`${base}/sign-in`);
await page.waitForTimeout(2500);
for (const y of [0, 200]) {
  await page.evaluate((y) => document.querySelectorAll('div').forEach((d) => { if (d.scrollHeight > d.clientHeight + 20 && getComputedStyle(d).overflowY !== 'visible') d.scrollTop = y; }), y);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/login-teclado-scroll-${y}.png` });
}
const seed = seedState({ days: 9 });
await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('buddy.session', JSON.stringify(s.session)); localStorage.setItem('buddy.db', JSON.stringify(s.db)); }, seed);
await page.setViewportSize({ width: 360, height: 740 });
await page.goto(`${base}/health`);
await page.waitForTimeout(2000);
await page.getByText('Semana', { exact: true }).click();
await page.waitForTimeout(800);
await page.evaluate(() => document.querySelectorAll('div').forEach((d) => { if (d.scrollHeight > d.clientHeight + 20 && getComputedStyle(d).overflowY !== 'visible') d.scrollTop = 420; }));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/salud-semana-360.png` });
await browser.close();
