import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { loadPlaywright } from '../scripts/capture/pw.mjs';
import { serveDist, seed } from '../scripts/capture/serve.mjs';
const { seedState } = createRequire(import.meta.url)('../scripts/capture/seed.js');
const { base, close } = await serveDist('.audit-2026-11-03/web');
const browser = await loadPlaywright().chromium.launch();
const results = { errors: [], checks: [] };
try {
 const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
 page.on('pageerror', e => results.errors.push(e.message));
 const state = seedState({ days: 7, mood: 'good', sleep: 'regular', full: true });
 const originalOwner = state.session.id;
 state.session = { ...state.session, id: 'audit-other-caregiver', email: 'other@buddy.test', role: 'caregiver' };
 await seed(page, base, state, { mode: 'light', highContrast: false, textScale: 'normal', introSeen: true });
 await page.goto(base + '/medication/cap-m1');
 await page.waitForTimeout(2200);
 const body = await page.locator('body').innerText();
 results.checks.push({ name: 'cross-account-medication-read', originalOwner, sessionOwner: state.session.id, exposed: body.includes('Losartán [PRUEBA]'), text: body });
 await page.screenshot({ path: '.audit-2026-11-03/cross-account.png' });
 for (const route of ['/summary', '/elder', '/routine', '/sign-in?role=caregiver', '/']) {
  const s = seedState({ days: 7, mood: 'good', sleep: 'regular', full: true });
  if (route === '/elder') {
   s.session = { ...s.session, id: 'audit-elder', role: 'elder', ownerId: s.session.id, elderId: 'cap-elder' };
   s.db.state.elders['cap-elder'].screen = { ...s.db.state.elders['cap-elder'].screen, appearance: 'contrast', textScale: 'max' };
  }
  if (route.startsWith('/sign-in') || route === '/') s.session = null;
  await seed(page, base, s, { mode: 'light', highContrast: true, textScale: 'max', introSeen: true });
  await page.goto(base + route);
  await page.waitForTimeout(2200);
  const name = route.split('?')[0].replaceAll('/', '') || 'welcome';
  await page.screenshot({ path: `.audit-2026-11-03/${name}-360-hc-max.png` });
  results.checks.push({ name: `${name}-360-hc-max`, url: page.url(), text: await page.locator('body').innerText() });
 }
} finally {
 writeFileSync('.audit-2026-11-03/probes.json', JSON.stringify(results, null, 2));
 await browser.close(); close();
}
console.log(JSON.stringify({ checks: results.checks.length, crossAccountExposed: results.checks[0].exposed, errors: results.errors }));
