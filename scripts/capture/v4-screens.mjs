// V4: capturas y controles visuales automáticos con datos SINTÉTICOS ([PRUEBA]), sin servidor de desarrollo.
// Uso: npx expo export --platform web --output-dir <dist> && node scripts/capture/v4-screens.mjs <dist> <antes|despues> [ruta…]
// Recorre 360/375/390 de ancho × letra 1,0 / 1,3 / 2,0 × claro, oscuro y alto contraste. Falla (código 1) si:
//   - hay desplazamiento horizontal;
//   - un texto de más de 3 caracteres mide menos de 48 px de ancho (texto "letra por letra");
//   - el texto de un botón se sale del botón, o el botón se sale de la pantalla;
//   - una pantalla que no es raíz no tiene el botón "Volver".
// Guarda una captura por ruta y tema en 390 (letra normal) y 360 (letra 2,0), y la de cada combinación que falle.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', tag = 'despues', ...picked] = process.argv.slice(2);
const ROOTS = new Set(['/summary', '/routine', '/health', '/location', '/elder']);
const ROUTES = picked.length ? picked : ['/summary', '/alerts', '/routine', '/medication/cap-m1', '/buddy', '/location', '/health', '/settings', '/settings/appearance', '/settings/account', '/preview', '/elder', '/elder/options'];
const out = `docs/capturas/v4/${tag}`;
mkdirSync(out, { recursive: true });
const THEMES = [['claro', { mode: 'light', highContrast: false }], ['oscuro', { mode: 'dark', highContrast: false }], ['contraste', { mode: 'light', highContrast: true }]];
const WIDTHS = [360, 375, 390];
const SCALES = [['1.0', 'normal'], ['1.3', 'xlarge'], ['2.0', 'max']];

const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const fail = [];
let combos = 0;

function stateFor(route) {
  const s = seedState({ days: 7, mood: 'good', sleep: 'regular', full: true });
  if (!route.startsWith('/elder')) return s;
  // El adulto mayor entra con su propia cuenta: los datos siguen siendo de su administrador.
  return { ...s, session: { id: 'cap-elder-user', email: 'elis@buddy.test', name: 'Elis', createdAt: s.session.createdAt, role: 'elder', ownerId: s.session.id, elderId: 'cap-elder' } };
}

/** Revisa la página ya pintada y devuelve las fallas encontradas. */
async function inspect(page, route) {
  return page.evaluate((isRoot) => {
    const problems = [];
    const vw = window.innerWidth;
    if (document.documentElement.scrollWidth > vw + 1) problems.push(`desplazamiento horizontal (${document.documentElement.scrollWidth} > ${vw})`);
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0';
    };
    // Texto estrecho ("letra por letra"): un texto de más de 3 caracteres que necesitaría 48 px o más y quedó con menos,
    // o que parte una palabra entre líneas. Una palabra corta ("Salud" en la barra) puede medir menos sin estar apretada.
    const ctx = document.createElement('canvas').getContext('2d');
    for (const el of document.querySelectorAll('div[dir="auto"], span[dir="auto"]')) {
      const nodes = [...el.childNodes].filter((n) => n.nodeType === 3);
      const own = nodes.map((n) => n.textContent.trim()).join(' ').trim();
      if (own.length <= 3 || !visible(el)) continue;
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      // El espaciado entre letras del texto real también cuenta (las etiquetas de la barra lo usan).
      ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      const natural = ctx.measureText(own).width;
      const w = el.getBoundingClientRect().width;
      if (natural >= 48 && w < 48) problems.push(`texto estrecho (${Math.round(w)} px de ${Math.round(natural)}): "${own.slice(0, 40)}"`);
      const words = own.split(/\s+/).filter(Boolean);
      const longest = Math.max(...words.map((x) => ctx.measureText(x).width));
      if (longest > w + 1) problems.push(`palabra partida (${Math.round(w)} px): "${own.slice(0, 40)}"`);
    }
    for (const b of document.querySelectorAll('[role="button"]')) {
      if (!visible(b)) continue;
      const r = b.getBoundingClientRect();
      if (r.left < -1 || r.right > vw + 1) problems.push(`botón fuera de la pantalla: "${(b.getAttribute('aria-label') ?? b.textContent).slice(0, 40)}"`);
      for (const t of b.querySelectorAll('div[dir="auto"]')) {
        const tr = t.getBoundingClientRect();
        if (!visible(t) || !t.textContent.trim()) continue;
        if (tr.left < r.left - 1 || tr.right > r.right + 1 || tr.bottom > r.bottom + 2) problems.push(`texto fuera de su botón: "${t.textContent.trim().slice(0, 40)}"`);
      }
    }
    if (!isRoot && ![...document.querySelectorAll('[role="button"]')].some((b) => b.getAttribute('aria-label') === 'Volver')) problems.push('sin botón "Volver"');
    return [...new Set(problems)];
  }, ROOTS.has(route));
}

try {
  for (const route of ROUTES) {
    for (const [themeName, appearance] of THEMES) {
      for (const w of WIDTHS) {
        for (const [scaleName, textScale] of SCALES) {
          // Alto contraste y oscuro: el control completo corre en 360 y 390 (375 queda en claro).
          if (themeName !== 'claro' && w === 375) continue;
          combos++;
          const page = await browser.newPage({ viewport: { width: w, height: 844 } });
          await seed(page, base, stateFor(route), { ...appearance, textScale, barGestures: true });
          await page.goto(`${base}${route}`);
          await page.waitForTimeout(1800);
          const id = `${route.replace(/[/?=]/g, '_').replace(/^_/, '') || 'root'}-${w}-${themeName}-letra${scaleName}`;
          const problems = await inspect(page, route);
          const keep = (w === 390 && scaleName === '1.0') || (w === 360 && scaleName === '2.0' && themeName === 'claro');
          if (problems.length) fail.push(...problems.map((p) => `${id}: ${p}`));
          // Informe parcial: si el equipo se suspende a mitad de camino, lo revisado no se pierde.
          writeFileSync(`${out}/_informe.txt`, `PARCIAL (${fail.length}) en ${combos} combinaciones:\n- ${fail.join('\n- ')}\n`);
          if (keep || problems.length) await page.screenshot({ path: `${out}/${id}.png`, fullPage: keep });
          await page.close();
        }
      }
    }
  }
  const report = fail.length ? `FALLAS (${fail.length}) en ${combos} combinaciones:\n- ${fail.join('\n- ')}` : `OK: ${ROUTES.length} rutas, ${combos} combinaciones sin fallas`;
  writeFileSync(`${out}/_informe.txt`, `${report}\n`);
  console.log(report);
  process.exitCode = fail.length ? 1 : 0;
} finally {
  await browser.close();
  close();
}
