// Servidor estático mínimo para las capturas: sirve la exportación web (SPA) en un puerto libre.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };

export async function serveDist(dir = 'dist') {
  const root = resolve(dir);
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^[^\w.]+/, ''); // quita "/" o "\" iniciales
    let file = join(root, path);
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  return { base: `http://localhost:${server.address().port}`, close: () => server.close() };
}

/** Siembra datos SINTÉTICOS de prueba y la apariencia (tema y tamaño de texto) en localStorage. */
export async function seed(page, base, state, appearance = { mode: 'light', highContrast: false, textScale: 'normal' }) {
  await page.goto(`${base}/`);
  await page.waitForTimeout(2000);
  await page.evaluate(
    ([s, a]) => {
      localStorage.clear();
      localStorage.setItem('buddy.session', JSON.stringify(s.session));
      localStorage.setItem('buddy.db', JSON.stringify(s.db));
      localStorage.setItem('buddy.appearance', JSON.stringify({ state: a, version: 1 }));
    },
    [state, appearance],
  );
}
