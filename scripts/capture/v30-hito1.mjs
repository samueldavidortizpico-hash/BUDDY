// V3.0 · Hito 1: reproduce y comprueba (antes y después) el chat, las pantallas de Ajustes y la salida del adulto mayor.
// Uso: npx expo export --platform web && node scripts/capture/v30-hito1.mjs [dist] [salida] [etiqueta]
// Sale con código 1 y lista cada falla. Datos SINTÉTICOS ([PRUEBA]).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadPlaywright } from './pw.mjs';
import { seed, serveDist } from './serve.mjs';

const { seedState } = createRequire(import.meta.url)('./seed.js');
const [dist = 'dist', out = 'docs/capturas/v30', tag = 'despues'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const { base, close } = await serveDist(dist);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const fail = [];
const THEMES = [['claro', { mode: 'light', highContrast: false }], ['oscuro', { mode: 'dark', highContrast: false }], ['contraste', { mode: 'light', highContrast: true }]];
const SECTIONS = ['account', 'appearance', 'elder', 'alerts', 'notifications', 'people', 'devices', 'legal', 'advanced', 'about'];
const LABELS = { account: 'Cuenta', appearance: 'Apariencia', elder: /^Pantalla de /, alerts: 'Mis avisos', notifications: /^Notificaciones/, people: /^Mis personas/, devices: 'Dispositivos', legal: /^Legal/, advanced: 'Avanzado', about: /^Acerca de/ };

/** Marca el contenedor con scroll de la pantalla VISIBLE (el que está bajo el centro de la pantalla) y lee su estado. */
const scroller = (page) =>
  page.evaluate(() => {
    document.querySelectorAll('[data-cap-scroller]').forEach((d) => d.removeAttribute('data-cap-scroller'));
    let el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    while (el && !(el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    if (!el) return null;
    el.setAttribute('data-cap-scroller', '1');
    return { top: el.scrollTop };
  });

try {
  // ── 1.1 Chat: compositor visible, sin barra de pestañas encima, con "Volver" ──
  for (const [name, a] of THEMES) {
    for (const [w, h, kb] of [[390, 844, 'sin-teclado'], [360, 740, 'sin-teclado'], [390, 480, 'teclado'], [360, 480, 'teclado']]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await seed(page, base, seedState({ days: 0 }), { ...a, textScale: 'normal', barGestures: true });
      await page.goto(`${base}/summary`);
      await page.waitForTimeout(1500);
      // Se abre desde el Resumen (como el robot): "Volver" debe regresar aquí.
      await page.evaluate(() => window.history.pushState({}, '', '/buddy'));
      await page.goto(`${base}/buddy`);
      await page.waitForTimeout(2000);
      const id = `chat-${w}x${h}-${name}-${kb}`;
      const ib = await page.getByLabel('Escríbele a BUDDY…').boundingBox();
      const bar = (await page.getByRole('tablist').count()) ? await page.getByRole('tablist').last().boundingBox() : null;
      if (!ib) fail.push(`${id}: el compositor no existe`);
      else {
        if (ib.y < 0 || ib.y + ib.height > h) fail.push(`${id}: el compositor queda fuera de pantalla (y=${Math.round(ib.y)}, alto=${ib.height})`);
        if (bar && bar.height > 0 && ib.y + ib.height > bar.y - 4 && ib.y < bar.y + bar.height) fail.push(`${id}: la barra de pestañas tapa el compositor`);
      }
      if (bar && bar.height > 0) fail.push(`${id}: la barra de pestañas está visible en el chat`);
      const send = await page.getByRole('button', { name: 'Enviar' }).boundingBox();
      if (!send || send.width < 48 || send.height < 48) fail.push(`${id}: botón enviar ${send ? `de ${send.width}x${send.height}` : 'ausente'} (< 48)`);
      if (!(await page.getByRole('button', { name: 'Volver' }).count())) fail.push(`${id}: sin botón "Volver"`);
      await page.screenshot({ path: `${out}/${tag}-${id}.png` });
      await page.close();
    }
  }

  // ── 1.2 Ajustes: cada opción es una ruta completa, con "Volver", empieza arriba y su final es alcanzable ──
  for (const [name, a] of THEMES) {
    for (const [w, h, scale] of [[360, 640, 'max'], [390, 844, 'normal']]) {
      if (name !== 'claro' && w === 390) continue;
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await seed(page, base, seedState({ days: 2, full: true }), { ...a, textScale: scale, barGestures: true });
      // Las burbujas del robot pueden tapar filas (hallazgo aparte): aquí se oculta "por hoy" para medir Ajustes.
      await page.evaluate(() => {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        localStorage.setItem('buddy.launcher', JSON.stringify({ state: { positions: {}, magnet: true, hiddenOn: today, dismissed: {} }, version: 1 }));
      });
      for (const sec of SECTIONS) {
        const id = `ajustes-${sec}-${w}x${h}-${name}-${scale}`;
        await page.goto(`${base}/settings`);
        await page.waitForTimeout(1300);
        // Baja la lista de Ajustes antes de abrir: la pantalla nueva debe empezar arriba igualmente.
        await scroller(page);
        await page.evaluate(() => { const e = document.querySelector('[data-cap-scroller]'); if (e) { e.style.scrollBehavior = 'auto'; e.scrollTop = e.scrollHeight; } });
        const row = page.getByRole('button', { name: LABELS[sec] });
        if (!(await row.count())) {
          fail.push(`${id}: no encontré la opción en Ajustes`);
          continue;
        }
        try {
          await row.first().click({ timeout: 4000 });
        } catch {
          fail.push(`${id}: la opción no se puede tocar (algo la tapa)`);
          await page.screenshot({ path: `${out}/${tag}-${id}-tapada.png` });
          continue;
        }
        await page.waitForTimeout(1300);
        const backBox = await page.getByRole('button', { name: 'Volver' }).last().boundingBox();
        if (!backBox || backBox.y < 0 || backBox.y > 90) fail.push(`${id}: sin "Volver" visible arriba`);
        const sc = await scroller(page);
        if (sc && sc.top > 0) fail.push(`${id}: no empieza arriba (scrollTop=${sc.top})`);
        if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fail.push(`${id}: desplazamiento horizontal`);
        // Botones que se salen por los lados y textos aplastados (una letra por línea).
        const squeezed = await page.evaluate(() => {
          const vw = window.innerWidth;
          const root = document.querySelector('[data-cap-scroller]') ?? document.body;
          const out = [];
          for (const b of root.querySelectorAll('[role="button"]')) {
            const r = b.getBoundingClientRect();
            if (r.width && (r.right > vw + 1 || r.left < -1)) out.push(`botón "${(b.getAttribute('aria-label') || b.textContent || '').slice(0, 30)}" fuera de pantalla`);
          }
          for (const e of root.querySelectorAll('div[dir="auto"]')) {
            const txt = e.textContent?.trim() ?? '';
            const r = e.getBoundingClientRect();
            if (txt.length > 4 && !txt.includes(' ') && r.height > 0 && r.width < 40 && r.height > r.width * 3) out.push(`texto "${txt.slice(0, 20)}" aplastado (${Math.round(r.width)}px de ancho)`);
          }
          return [...new Set(out)].slice(0, 4);
        });
        squeezed.forEach((p) => fail.push(`${id}: ${p}`));
        await page.screenshot({ path: `${out}/${tag}-${id}.png` });
        // Hasta el final: el último texto debe quedar dentro de la pantalla.
        await page.evaluate(() => { const e = document.querySelector('[data-cap-scroller]'); if (e) { e.style.scrollBehavior = 'auto'; e.scrollTop = e.scrollHeight; } });
        await page.waitForTimeout(300);
        const cut = await page.evaluate((vh) => {
          const root = document.querySelector('[data-cap-scroller]') ?? document.body;
          const texts = [...root.querySelectorAll('div[dir="auto"]')].filter((e) => e.textContent?.trim() && e.getBoundingClientRect().height > 0);
          const last = texts.at(-1);
          return last ? Math.round(last.getBoundingClientRect().bottom - vh) : null;
        }, h);
        if (cut !== null && cut > 0) fail.push(`${id}: el final queda cortado ${cut}px bajo la pantalla`);
        // "Mis personas": el acceso del adulto mayor debe abrir una pantalla (no una hoja que se corta).
        if (sec === 'people') {
          const acc = page.getByRole('button', { name: /^Acceso/ });
          if (await acc.count()) {
            const before = page.url();
            await acc.first().click({ timeout: 4000 }).catch(() => fail.push(`${id}: "Acceso" no se puede tocar`));
            await page.waitForTimeout(1200);
            if (page.url() === before) fail.push(`${id}: "Acceso" abre una hoja, no una pantalla`);
            await page.screenshot({ path: `${out}/${tag}-${id}-acceso.png` });
          } else fail.push(`${id}: sin botón "Acceso"`);
        }
      }
      await page.close();
    }
  }

  // ── 1.3 Adulto mayor con su propio acceso: botón "Opciones" visible arriba con "Cerrar sesión" ──
  for (const [name, a] of THEMES) {
    const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
    const st = seedState({ days: 0, full: true });
    st.session = { id: 'cap-elder-user', email: 'elis@buddy.test', name: 'Elis', createdAt: new Date().toISOString(), role: 'elder', ownerId: 'cap-user', elderId: 'cap-elder' };
    await seed(page, base, st, { ...a, textScale: 'normal' });
    await page.goto(`${base}/elder`);
    await page.waitForTimeout(2000);
    const id = `adulto-${name}`;
    const opt = page.getByRole('button', { name: 'Opciones' });
    if (!(await opt.count())) fail.push(`${id}: no hay botón "Opciones" visible (solo un gesto oculto de 2 s)`);
    else {
      const b = await opt.first().boundingBox();
      if (!b || b.y > 140) fail.push(`${id}: "Opciones" no está en la esquina superior`);
      await opt.first().click({ timeout: 4000 }).catch(() => fail.push(`${id}: "Opciones" no se puede tocar`));
      await page.waitForTimeout(700);
      if (!(await page.getByRole('button', { name: 'Cerrar sesión' }).count())) fail.push(`${id}: "Opciones" sin "Cerrar sesión"`);
    }
    await page.screenshot({ path: `${out}/${tag}-${id}.png` });
    await page.close();
  }

  console.log(fail.length ? `FALLAS (${fail.length}):\n- ${fail.join('\n- ')}` : 'OK: chat, Ajustes y salida del adulto mayor');
  process.exitCode = fail.length ? 1 : 0;
} finally {
  await browser.close();
  close();
}
