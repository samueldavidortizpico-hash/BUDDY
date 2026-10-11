/**
 * Verifica que toda pantalla que no sea raíz use <ScreenHeader> (flecha "Volver" arriba a la izquierda).
 * Uso: npm run check:headers  (Node ≥ 22.6 ejecuta TypeScript directamente).
 * Sale con código 1 y lista las rutas que fallan.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const APP = join(process.cwd(), 'src', 'app');

/** Raíces: pestañas, bienvenida y la pantalla única del adulto mayor (sin "atrás" por diseño). */
const ROOTS = new Set<string>([
  '(auth)/index.tsx',
  '(caregiver)/(tabs)/summary.tsx',
  '(caregiver)/(tabs)/routine.tsx',
  '(caregiver)/(tabs)/buddy.tsx',
  '(caregiver)/(tabs)/health.tsx',
  '(caregiver)/(tabs)/settings.tsx',
  'elder/index.tsx',
]);

/** Rutas antiguas en proceso de eliminación (debe quedar vacía al cerrar la ronda v2.1). */
const LEGACY = new Set<string>([]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const routes = walk(APP)
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => relative(APP, f).split(sep).join('/'))
  .filter((f) => !f.split('/').pop()!.startsWith('_') && !f.startsWith('+'));

const failing = routes.filter((r) => !ROOTS.has(r) && !LEGACY.has(r) && !readFileSync(join(APP, r), 'utf8').includes('<ScreenHeader'));

if (LEGACY.size) console.log(`Aviso: ${LEGACY.size} rutas antiguas exentas temporalmente.`);
if (failing.length) {
  console.error('Rutas sin <ScreenHeader> (sin botón "Volver"):');
  failing.forEach((r) => console.error(`  - src/app/${r}`));
  process.exit(1);
}
console.log(`OK: ${routes.length} rutas revisadas; todas las que no son raíz tienen "Volver".`);
