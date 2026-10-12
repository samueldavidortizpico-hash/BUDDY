/**
 * Comprobación de desbordes en web (Playwright): recorre las pantallas principales con datos SINTÉTICOS de prueba a
 * 390×844 y 360×740, con texto normal y al 200 %, en claro, oscuro y alto contraste, y falla si encuentra:
 *  - texto que se sale de la pantalla por los lados,
 *  - texto que se sale de una tarjeta que recorta (overflow: hidden),
 *  - iconos o caras aplastados a menos de 4 px de ancho dentro de una tarjeta,
 *  - desplazamiento horizontal de la página.
 * Uso: npx expo export --platform web && node scripts/check-overflow.mjs [carpeta=dist] [capturas=docs/capturas/overflow]
 * Levanta su propio servidor estático en un puerto libre y lo cierra al terminar.
 */
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve } from 'node:path';

import { loadPlaywright } from './capture/pw.mjs';

const { seedState } = createRequire(import.meta.url)('./capture/seed.js');
const root = resolve(process.argv[2] ?? 'dist');
const shots = process.argv[3] ?? 'docs/capturas/overflow';
mkdirSync(shots, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([/\\])+/, '');
  let file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const ROUTES = ['/summary', '/routine', '/health', '/alerts', '/handoff', '/buddy', '/settings', '/routine/appointments', '/elder'];
const THEMES = [
  { name: 'claro', mode: 'light', highContrast: false },
  { name: 'oscuro', mode: 'dark', highContrast: false },
  { name: 'contraste', mode: 'light', highContrast: true },
];
const SIZES = [
  [390, 844],
  [360, 740],
];
const SCALES = ['normal', 'max'];

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const failures = [];
try {
  for (const [w, h] of SIZES) {
    for (const scale of SCALES) {
      for (const theme of THEMES) {
        // Para no multiplicar las corridas: los temas oscuro y contraste solo en 360 px.
        if (theme.name !== 'claro' && w !== 360) continue;
        const page = await browser.newPage({ viewport: { width: w, height: h } });
        await page.goto(`${base}/`);
        await page.waitForTimeout(2000);
        const seed = seedState({ days: 9, mood: 'bad', sleep: 'bad', full: true });
        await page.evaluate(
          ([s, a]) => {
            localStorage.clear();
            localStorage.setItem('buddy.session', JSON.stringify(s.session));
            localStorage.setItem('buddy.db', JSON.stringify(s.db));
            localStorage.setItem('buddy.appearance', JSON.stringify({ state: a, version: 1 }));
          },
          [seed, { mode: theme.mode, highContrast: theme.highContrast, textScale: scale }],
        );
        for (const route of ROUTES) {
          // /elder solo existe con una entrega activa: se prueba con "Probar como".
          if (route === '/elder') {
            await page.goto(`${base}/handoff`);
            await page.waitForTimeout(1500);
            const test = page.getByRole('button', { name: /^Probar como/ });
            if (await test.count()) await test.first().click();
            await page.waitForTimeout(1500);
          } else {
            await page.goto(`${base}${route}`);
            await page.waitForTimeout(1800);
          }
          const problems = await page.evaluate(() => {
            const out = [];
            const vw = document.documentElement.clientWidth;
            if (document.documentElement.scrollWidth > vw + 1) out.push(`desplazamiento horizontal (${document.documentElement.scrollWidth}px > ${vw}px)`);
            const clipAncestor = (el) => {
              for (let p = el.parentElement; p; p = p.parentElement) {
                const cs = getComputedStyle(p);
                if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && p.getBoundingClientRect().width < vw - 4) return p;
              }
              return null;
            };
            // Filas con desplazamiento horizontal intencional (chips, "Más tarde hoy") no son desbordes.
            const inHScroll = (el) => {
              for (let p = el.parentElement; p; p = p.parentElement) {
                const ox = getComputedStyle(p).overflowX;
                if ((ox === 'auto' || ox === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true;
              }
              return false;
            };
            for (const el of document.querySelectorAll('[dir="auto"]')) {
              const text = el.textContent?.trim();
              if (!text || el.closest('[aria-hidden="true"]') || inHScroll(el)) continue;
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.bottom < 0 || r.top > innerHeight * 3) continue;
              if (r.right > vw + 1 || r.left < -1) out.push(`se sale de la pantalla: "${text.slice(0, 40)}"`);
              // Una palabra más ancha que su caja (p. ej. "Regular" bajo una barra estrecha).
              if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) out.push(`texto más ancho que su caja: "${text.slice(0, 40)}"`);
              const clip = clipAncestor(el);
              if (clip) {
                const c = clip.getBoundingClientRect();
                if (r.right > c.right + 1 || r.left < c.left - 1) out.push(`recortado en su tarjeta: "${text.slice(0, 40)}"`);
              }
            }
            for (const svg of document.querySelectorAll('[data-testid="metric-face"] svg, svg[width]')) {
              const r = svg.getBoundingClientRect();
              const declared = Number(svg.getAttribute('width'));
              const parent = svg.parentElement?.getBoundingClientRect();
              if (declared >= 20 && r.height > 10 && (r.width < declared / 2 || (parent && parent.width < declared / 2))) out.push(`icono o cara aplastada (${r.width.toFixed(1)} px de ${declared} px)`);
            }
            return [...new Set(out)];
          });
          const tag = `${route.replace(/\//g, '_')}-${w}-${scale}-${theme.name}`;
          if (problems.length) {
            failures.push(`${route} ${w}x${h} texto ${scale} ${theme.name}:\n  - ${problems.join('\n  - ')}`);
            await page.screenshot({ path: `${shots}/FALLA${tag}.png`, fullPage: true });
          } else if (scale === 'max' || theme.name !== 'claro') {
            await page.screenshot({ path: `${shots}/ok${tag}.png` });
          }
        }
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`Desbordes encontrados (${failures.length}):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`OK: sin texto recortado ni desbordado en ${ROUTES.length} pantallas × tamaños, texto normal y 200 %, claro, oscuro y alto contraste.`);
