#!/usr/bin/env node
/**
 * Compuerta de compilación de tienda (V5.3, auditoría de venta V-05 y V-08; spec release/store-readiness, decisión D8).
 *
 * EAS la ejecuta como `eas-build-pre-install` (package.json) en TODAS las compilaciones, pero solo revisa cuando el
 * perfil es `production` (variable EAS_BUILD_PROFILE). Falla, y la compilación se detiene antes de publicarse, si:
 *  - las herramientas de desarrollo están encendidas (EXPO_PUBLIC_DEV_TOOLS=1, en el entorno o en eas.json);
 *  - alguna descripción de app.json presenta la app como demostración o con datos de ejemplo;
 *  - alguna descripción nombra diagnóstico o emergencias sin negarlos ("no diagnostica… ni atiende emergencias").
 *
 * Probarla a mano:  EAS_BUILD_PROFILE=production node scripts/check-release.mjs
 *                   EAS_BUILD_PROFILE=production EXPO_PUBLIC_DEV_TOOLS=1 node scripts/check-release.mjs   (falla)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const profile = process.env.EAS_BUILD_PROFILE;

if (profile !== 'production') {
  console.log(`check-release: perfil "${profile ?? 'ninguno'}", no es de tienda; no se revisa.`);
  process.exit(0);
}

const problems = [];
const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8'));

if (process.env.EXPO_PUBLIC_DEV_TOOLS === '1') problems.push('EXPO_PUBLIC_DEV_TOOLS=1 en el entorno: la galería y el plan de prueba entrarían en la app de tienda.');
if (eas.build?.production?.env?.EXPO_PUBLIC_DEV_TOOLS === '1') problems.push('eas.json enciende EXPO_PUBLIC_DEV_TOOLS en el perfil production.');

const descriptions = { 'expo.description': app.description, 'expo.web.description': app.web?.description };
for (const [where, text] of Object.entries(descriptions)) {
  if (!text) {
    problems.push(`${where} está vacía: la ficha necesita describir el producto.`);
    continue;
  }
  if (/demostraci[oó]n|datos de ejemplo/i.test(text)) problems.push(`${where} presenta la app como demostración o con datos de ejemplo.`);
  // Una frase que nombre diagnóstico o emergencias debe negarlos ("no …").
  for (const sentence of text.split(/[.;]/)) {
    if (/diagn[oó]stic|emergencia/i.test(sentence) && !/\bno\b/i.test(sentence)) problems.push(`${where} parece prometer diagnóstico o emergencias: "${sentence.trim()}".`);
  }
}

if (problems.length) {
  console.error('check-release: la compilación de tienda NO cumple:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('check-release: compilación de tienda lista (sin herramientas de desarrollo y con una ficha honesta).');
