// V4.3: capturas para la puerta de calidad (login, crear cuenta, recuperar, BUDDY Plus y pantallas internas).
// Uso: npx expo export --platform web --output-dir <dist> && node scripts/capture/v4_3.mjs <dist> <carpeta> [conjunto] [ruta…]
//   conjunto: base (390 · claro y oscuro · letra normal) | completo (390/375/360 · claro, oscuro y alto contraste · normal y máxima)
// Datos SINTÉTICOS de prueba ([PRUEBA]); sin servidor de desarrollo.
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', out = 'docs/capturas/v4_3', set = 'base', ...picked] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const SCREENS = {
  login: { path: '/sign-in?role=caregiver', signedOut: true },
  'crear-cuenta': { path: '/sign-up', signedOut: true },
  recuperar: { path: '/forgot-password', signedOut: true },
  plus: { path: '/plus', plan: 'free' },
  inicio: { path: '/summary' },
  rutina: { path: '/routine' },
  medicamento: { path: '/medication/cap-m1' },
  salud: { path: '/health' },
  ubicacion: { path: '/location' },
  chat: { path: '/buddy' },
  ajustes: { path: '/settings' },
  plan: { path: '/settings/plan' },
  galeria: { path: '/dev/gallery' },
  'adulto-mayor': { path: '/elder', elder: true },
  familia: { path: '/family', plan: 'family' },
  'chat-gratis': { path: '/buddy', plan: 'free' },
  'salud-semana-gratis': { path: '/health', plan: 'free' },
  enfermera: { path: '/nurse', nurse: true },
};
const names = picked.length ? picked : Object.keys(SCREENS).filter((n) => !['galeria', 'plan', 'familia', 'enfermera', 'chat-gratis', 'salud-semana-gratis'].includes(n));
const THEMES = set === 'completo'
  ? [['claro', { mode: 'light', highContrast: false }], ['oscuro', { mode: 'dark', highContrast: false }], ['contraste', { mode: 'light', highContrast: true }]]
  : set === 'temas' ? [['claro', { mode: 'light', highContrast: false }], ['oscuro', { mode: 'dark', highContrast: false }], ['contraste', { mode: 'light', highContrast: true }]]
  : [['claro', { mode: 'light', highContrast: false }], ['oscuro', { mode: 'dark', highContrast: false }]];
const WIDTHS = set === 'completo' ? [390, 375, 360] : [390];
const SCALES = set === 'completo' ? ['normal', 'max'] : ['normal'];

function stateFor(screen) {
  const s = seedState({ days: 7, mood: 'good', sleep: 'regular', full: true });
  // Plan de prueba de la cuenta (por defecto Familiar: todo desbloqueado; las capturas "-gratis" muestran los candados).
  s.db.state.drafts[s.session.id] = { buddyPlan: screen.plan ?? 'family' };
  if (screen.signedOut) return { ...s, session: null };
  if (screen.nurse) return { ...s, session: { id: 'cap-nurse-user', email: 'ana@buddy.test', name: 'Ana Prueba', createdAt: s.session.createdAt, role: 'nurse', ownerId: s.session.id, elderId: 'cap-elder' } };
  if (!screen.elder) return s;
  return { ...s, session: { id: 'cap-elder-user', email: 'elis@buddy.test', name: 'Elis', createdAt: s.session.createdAt, role: 'elder', ownerId: s.session.id, elderId: 'cap-elder' } };
}

const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
try {
  for (const name of names) {
    const screen = SCREENS[name];
    for (const [themeName, appearance] of THEMES) {
      for (const w of WIDTHS) {
        for (const scale of SCALES) {
          const tall = name === 'galeria' ? 4400 : 0; // la galería se desplaza dentro de su contenedor: ventana alta
          const page = await browser.newPage({ viewport: { width: w, height: tall || (w === 390 ? 844 : w === 375 ? 812 : 780) }, deviceScaleFactor: 2 });
          await seed(page, base, stateFor(screen), { ...appearance, textScale: scale, barGestures: true, introSeen: true });
          if (screen.signedOut) await page.evaluate(() => localStorage.removeItem('buddy.session'));
          await page.goto(`${base}${screen.path}`);
          await page.waitForTimeout(2200);
          const id = `${name}-${w}-${themeName}${scale === 'normal' ? '' : '-letra-max'}`;
          await page.screenshot({ path: `${out}/${id}.png` });
          await page.close();
        }
      }
    }
  }
  console.log('capturas en', out);
} finally {
  await browser.close();
  close();
}
