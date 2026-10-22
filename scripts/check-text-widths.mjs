/** Uses an ALREADY RUNNING web app. Never starts a server. Web evidence only. */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './capture/pw.mjs';

const base = process.env.BUDDY_TEST_URL;
if (!base) throw new Error('Define BUDDY_TEST_URL for an already running app. No server was started.');
const { seedState } = createRequire(import.meta.url)('./capture/seed.js');
const routes = ['/summary', '/routine', '/health', '/buddy', '/location', '/preview', '/settings/people', '/routine/water'];
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const failures = [];
const dir = 'docs/capturas/v31-layout';
mkdirSync(dir, { recursive: true });
try {
  for (const width of [360, 375, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto(base);
    await page.evaluate((s) => {
      localStorage.setItem('buddy.session', JSON.stringify(s.session));
      localStorage.setItem('buddy.db', JSON.stringify(s.db));
      localStorage.setItem('buddy.appearance', JSON.stringify({ state: { mode: 'light', textScale: 'max', highContrast: false }, version: 1 }));
    }, seedState({ days: 9, mood: 'bad', sleep: 'bad', full: true }));
    for (const route of routes) {
      await page.goto(`${base}${route}`);
      await page.getByText('Cargando', { exact: true }).waitFor({ state: 'hidden' }).catch(() => {});
      await page.waitForTimeout(1500);
      const problems = await page.evaluate(() => {
        const out = [];
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && !el.closest('[aria-hidden="true"]');
        };
        for (const el of document.querySelectorAll('[dir="auto"]')) {
          const text = el.textContent.trim();
          const r = el.getBoundingClientRect();
          if (visible(el) && text.length > 3 && r.width < 48) out.push(`narrow text ${r.width.toFixed(1)}: ${text.slice(0, 60)}`);
        }
        for (const el of document.querySelectorAll('[role="button"]')) {
          if (!visible(el)) continue;
          const r = el.getBoundingClientRect();
          const p = el.parentElement.getBoundingClientRect();
          // Horizontal scroll content is checked against its own content container.
          if (r.left < p.left - 1 || r.right > p.right + 1) out.push(`button outside container: ${el.getAttribute('aria-label')}`);
        }
        return out;
      });
      failures.push(...problems.map((p) => `${width} ${route}: ${p}`));
      await page.screenshot({ path: `${dir}/${width}-${route.replaceAll('/', '_')}.png`, fullPage: true });
    }
    await page.close();
  }
} finally { await browser.close(); }
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('OK: web text widths and buttons at maximum app font, 360/375/390. Native fontScale is NOT emulated.');
