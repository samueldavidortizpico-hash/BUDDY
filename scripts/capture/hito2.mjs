// Capturas del Hito 2: entrada con selector de rol, onboarding (6 escenas) e inicio de sesión del adulto mayor.
import { mkdirSync } from 'node:fs';
import { loadPlaywright } from './pw.mjs';
const [base = 'http://localhost:8091', out = 'docs/capturas/v22/despues/hito2'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${base}/`);
await page.waitForTimeout(2500);
await page.getByRole('radio', { name: /Soy administrador/ }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/entrada-admin.png`, fullPage: true });
await page.getByRole('radio', { name: /Soy adulto mayor/ }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/entrada-adulto.png`, fullPage: true });
await page.goto(`${base}/onboarding`);
await page.waitForTimeout(1800);
for (let i = 1; i <= 6; i++) {
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${out}/onboarding-${i}.png` });
  if (i < 6) await page.getByRole('button', { name: 'Continuar' }).click();
}
await page.goto(`${base}/sign-in?role=elder`);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/login-adulto.png` });
await browser.close();
console.log('ok');
