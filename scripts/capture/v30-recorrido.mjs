// V3.0 · Recorrido completo en web con reloj simulado (Playwright `clock`): crear la cuenta del administrador, registrar
// a una persona con el registro rápido, programar un medicamento, probar como el adulto mayor, dejar la toma sin
// responder hasta el segundo aviso y el "sin confirmar", ver el estado de un segundo y el resumen, y escribir en el chat
// con el teclado simulado (alto 480). Ajustes y la salida del adulto mayor se recorren con v30-hito1.mjs.
// Uso: npx expo export --platform web && node scripts/capture/v30-recorrido.mjs
import { mkdirSync } from 'node:fs';
import { loadPlaywright } from './pw.mjs';
import { serveDist } from './serve.mjs';

const out = 'docs/capturas/v30/recorrido';
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist('dist');
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const now = new Date();
await ctx.clock.install({ time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 50) });
const page = await ctx.newPage();
const log = [];
const fail = [];
let taps = 0;
let n = 0;
const shot = async (name) => page.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${name}.png` });
const wait = (ms = 900) => page.clock.runFor(ms).then(() => page.waitForTimeout(150));
const tap = async (role, name) => {
  taps++;
  await page.getByRole(role, { name }).first().click({ timeout: 8000 });
  await wait();
};
const fill = async (label, value) => {
  await page.getByLabel(label, { exact: true }).first().fill(value);
};
const see = async (text, step) => {
  const ok = (await page.getByText(text).count()) > 0;
  (ok ? log : fail).push(`${step}: ${ok ? 'se ve' : 'NO se ve'} "${text}"`);
  return ok;
};
const go = async (path) => {
  await page.goto(`${base}${path}`);
  await wait(2500);
};

try {
  // 1. Cuenta del administrador.
  await go('/');
  await page.evaluate(() => localStorage.clear());
  await go('/sign-up');
  await fill('Tu nombre', 'Laura Prueba');
  await fill('Correo electrónico', 'laura.prueba@buddy.test');
  await fill('Contraseña', 'Segura123!');
  await fill('Confirma la contraseña', 'Segura123!');
  await tap('checkbox', /Acepto los términos/);
  await shot('cuenta');
  await tap('button', 'Crear cuenta');
  await wait(3000);
  log.push(`Cuenta creada; ruta: ${new URL(page.url()).pathname}`);

  // 2. Registro rápido (5 pantallas).
  const start = Date.now();
  if (!page.url().includes('/setup')) await go('/setup');
  await see('Paso 1 de 5', 'Registro');
  await fill('Nombre', 'Elis');
  await tap('checkbox', 'Femenino');
  await shot('registro-1');
  await tap('button', 'Guardar y continuar');
  await see('Paso 2 de 5', 'Registro');
  await tap('button', 'Agregar a mano');
  await wait(1500);
  await fill('Nombre comercial', 'Losartán');
  await shot('medicamento');
  await tap('button', 'Guardar medicamento');
  await wait(1500);
  if (!page.url().includes('/setup')) await go('/setup');
  await tap('button', 'Guardar y continuar');
  await see('Paso 3 de 5', 'Registro');
  await fill('Nombre', 'Juan');
  await fill('Teléfono', '3001234567');
  await tap('button', 'Guardar y continuar');
  await see('Paso 4 de 5', 'Registro');
  await tap('button', 'Guardar y continuar');
  await see('Paso 5 de 5', 'Registro');
  await shot('registro-listo');
  await tap('button', /Ir al/);
  log.push(`Registro rápido en ${Math.round((Date.now() - start) / 1000)} s de automatización y ${taps} toques desde el inicio`);

  // 3. Primer estado del Inicio: sin señales del celular del adulto mayor, nunca "Todo bien".
  await go('/summary');
  await see('Aún no hay registros', 'Inicio sin señales');
  await shot('inicio-sin-registros');

  // 4. Probar como el adulto mayor a las 7:58: ve su toma de las 8:00.
  await go('/handoff');
  await tap('button', /^Probar como/);
  await wait(2000);
  await see('Modo prueba', 'Adulto mayor');
  await see('Ya lo tomé', 'Adulto mayor');
  await shot('adulto-toma');

  // 5. No responde. A las 8:11, segundo aviso; el administrador lo ve en "Tomas de hoy".
  await page.clock.fastForward(21 * 60_000);
  await wait();
  await tap('button', 'Volver a administrador');
  await go('/summary');
  await see('Segundo aviso, aún sin respuesta', 'Inicio 8:11');
  await shot('inicio-segundo-aviso');

  // 6. A las 8:31, "sin confirmar": estado Atención con su razón.
  await page.clock.fastForward(20 * 60_000);
  await wait(2000);
  await see('Atención', 'Inicio 8:31');
  await see(/sin confirmar desde hace más de 30 minutos/, 'Inicio 8:31');
  await see('Sin confirmar: llama para saber', 'Inicio 8:31');
  await shot('inicio-sin-confirmar');

  // 7. "Ya lo confirmé por teléfono" desde Novedades.
  await go('/alerts');
  await see('Ya lo confirmé por teléfono', 'Novedades');
  await shot('novedades');
  await tap('button', 'Ya lo confirmé por teléfono');
  await go('/summary');
  await see(/lo confirmaste tú/, 'Inicio tras confirmar');
  await see(/Resumen del día/, 'Resumen diario');
  await shot('inicio-confirmado');

  // 8. Chat con su flecha y el teclado simulado (alto 480).
  await page.setViewportSize({ width: 390, height: 480 });
  await go('/buddy');
  const input = page.getByLabel('Escríbele a BUDDY…');
  await input.click();
  await input.fill('hola');
  const box = await input.boundingBox();
  if (!box || box.y + box.height > 480) fail.push('Chat: el compositor queda fuera de la pantalla con el teclado simulado');
  else log.push('Chat: compositor visible con alto 480');
  if (!(await page.getByRole('button', { name: 'Volver' }).count())) fail.push('Chat: sin "Volver"');
  await shot('chat-teclado');
  await tap('button', 'Enviar');
  await wait(1500);
  await shot('chat-enviado');

  console.log(['RECORRIDO', ...log.map((l) => `  ok  ${l}`), ...fail.map((f) => `  FALLA ${f}`)].join('\n'));
  process.exitCode = fail.length ? 1 : 0;
} catch (e) {
  await shot('error').catch(() => undefined);
  console.log(['RECORRIDO INTERRUMPIDO', ...log.map((l) => `  ok  ${l}`), ...fail.map((f) => `  FALLA ${f}`), `  ERROR ${String(e).split('\n')[0]}`, `  en ${page.url()}`].join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  close();
}
