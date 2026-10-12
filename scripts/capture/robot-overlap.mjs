/**
 * Comprobación del problema 9: el robot de las pantallas de cuenta no se superpone con ningún campo, botón ni texto,
 * con scroll 0/200/400 y con poco alto (simula el teclado abierto). Guarda capturas y sale con 1 si hay cruces.
 * Uso: node scripts/capture/robot-overlap.mjs http://localhost:8091 docs/capturas/v22/despues
 */
import { mkdirSync } from 'node:fs';
import { loadPlaywright } from './pw.mjs';

const [base = 'http://localhost:8091', out = 'docs/capturas/v22/despues'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const failures = [];
for (const route of ['/', '/sign-in', '/sign-up', '/forgot-password']) {
  for (const [w, h] of [[390, 844], [360, 740], [360, 520]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(`${base}${route}`);
    await page.waitForTimeout(2600);
    for (const y of [0, 200, 400]) {
      await page.evaluate((y) => document.querySelectorAll('div').forEach((d) => { if (d.scrollHeight > d.clientHeight + 20 && getComputedStyle(d).overflowY !== 'visible') d.scrollTop = y; }), y);
      await page.waitForTimeout(450);
      const hits = await page.evaluate(() => {
        const robot = document.querySelector('[data-testid="auth-robot"]');
        if (!robot) return ['sin robot'];
        const vis = robot.firstElementChild;
        if (Number(getComputedStyle(vis).opacity) < 0.05) return [];
        // Caja visible del robot: unión de sus capas SVG visibles (las capas con opacidad 0, como las manos, no cuentan).
        const r = [...(vis.querySelector('[data-testid="robot-art"]') ?? vis).querySelectorAll('svg')].filter((s) => { for (let e = s; e && e !== robot; e = e.parentElement) if (Number(getComputedStyle(e).opacity) < 0.05) return false; return true; }).map((s) => s.getBoundingClientRect()).filter((b) => b.width > 4).reduce((a, b) => ({ l: Math.min(a.l, b.left), t: Math.min(a.t, b.top), r: Math.max(a.r, b.right), b: Math.max(a.b, b.bottom) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
        const pad = 6; // tolerancia por sombras y destellos
        const box = { l: r.l + pad, t: r.t + pad, r: r.r - pad, b: r.b - pad };
        const targets = [...document.querySelectorAll('input, [role="button"], [dir="auto"]')].filter((el) => !robot.contains(el) && el.getBoundingClientRect().width > 0 && el.textContent?.trim() !== '' || el.tagName === 'INPUT');
        return targets.filter((el) => {
          const b = el.getBoundingClientRect();
          if (b.bottom < 0 || b.top > innerHeight) return false;
          return box.l < b.right && b.left < box.r && box.t < b.bottom && b.top < box.b;
        }).map((el) => (el.textContent || el.getAttribute('placeholder') || el.tagName).slice(0, 40));
      });
      if (hits.length) failures.push(`${route} ${w}x${h} scroll ${y}: ${hits.join(' | ')}`);
      if (w === 360 && (route === '/sign-in' || route === '/')) await page.screenshot({ path: `${out}/robot${route.replace(/\//g, '_') || '_'}-${h}-scroll-${y}.png` });
    }
    await page.close();
  }
}
await browser.close();
if (failures.length) {
  console.error('El robot se cruza con contenido:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('OK: el robot no tapa campos, botones ni textos en ninguna combinación.');
