/**
 * Construye el índice compacto SIN CONEXIÓN de medicamentos de Colombia a partir de los datos abiertos del INVIMA:
 * "CÓDIGO ÚNICO DE MEDICAMENTOS VIGENTES" (datos.gov.co, conjunto i7cb-raxc, licencia CC BY-SA 4.0, actualización
 * mensual). Solo presentaciones con CUM "Activo". Un registro por expediente (producto): nombre comercial, principios
 * activos con su concentración, forma farmacéutica, vía, ATC, titular y registro sanitario.
 *
 * Uso: node scripts/build-cum-index.mjs   → escribe src/data/cum-index.json
 * Actualizar: volver a correrlo (idealmente cada mes) y revisar el diff de `meta`. Ver docs/BASE_FARMACOLOGICA.md.
 * El índice derivado se distribuye con la misma licencia CC BY-SA 4.0 y la atribución al INVIMA.
 */
import { writeFileSync } from 'node:fs';

const DATASET = 'i7cb-raxc';
const API = `https://www.datos.gov.co/resource/${DATASET}.json`;
const FIELDS = ['expediente', 'producto', 'titular', 'registrosanitario', 'viaadministracion', 'atc', 'descripcionatc', 'principioactivo', 'cantidad', 'unidadmedida', 'unidadreferencia', 'formafarmaceutica'];
const PAGE = 50000;

async function fetchAll() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const url = `${API}?$select=${FIELDS.join(',')}&$where=estadocum='Activo'&$order=expediente&$limit=${PAGE}&$offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`datos.gov.co respondió ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    process.stdout.write(`\r${rows.length} filas`);
    if (page.length < PAGE) break;
  }
  process.stdout.write('\n');
  return rows;
}

/** "DOLEX® ACTIVGEL." → "DOLEX ACTIVGEL" (sin marcas registradas ni puntos finales). */
const cleanName = (s = '') => s.replace(/[®™©]/g, '').replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
const titleCase = (s = '') => s.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

const meta = await (await fetch(`https://www.datos.gov.co/api/views/${DATASET}.json`)).json();
const rows = await fetchAll();

// Diccionarios: textos repetidos se guardan una vez y se referencian por índice.
const dict = [];
const at = new Map();
const ref = (s) => {
  const v = s ?? '';
  if (!at.has(v)) {
    at.set(v, dict.length);
    dict.push(v);
  }
  return at.get(v);
};

const products = new Map();
for (const r of rows) {
  let p = products.get(r.expediente);
  if (!p) {
    p = { n: cleanName(r.producto), f: titleCase(r.formafarmaceutica), v: titleCase(r.viaadministracion), atc: r.atc ?? '', ad: r.descripcionatc ?? '', t: r.titular ?? '', rs: r.registrosanitario ?? '', ing: new Map() };
    products.set(r.expediente, p);
  }
  if (r.principioactivo && !p.ing.has(r.principioactivo)) p.ing.set(r.principioactivo, [r.principioactivo, r.cantidad ?? '', r.unidadmedida ?? '', r.unidadreferencia ?? '']);
}

// Formato compacto: [nombre, forma, vía, atc, descripción ATC, titular, registro, [[principio, cantidad, unidad, referencia]...]]
const items = [...products.values()]
  .filter((p) => p.n)
  .sort((a, b) => a.n.localeCompare(b.n, 'es'))
  .map((p) => [p.n, ref(p.f), ref(p.v), ref(p.atc), ref(p.ad), ref(p.t), p.rs, [...p.ing.values()].map(([n, c, u, rf]) => [ref(n), c, ref(u), ref(titleCase(rf))])]);

const out = {
  meta: {
    source: 'INVIMA — Código Único de Medicamentos vigentes (datos abiertos)',
    dataset: DATASET,
    url: `https://www.datos.gov.co/d/${DATASET}`,
    license: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)',
    attribution: meta.attribution ?? 'Instituto Nacional de Vigilancia de Medicamentos y Alimentos - INVIMA',
    dataUpdatedAt: new Date((meta.rowsUpdatedAt ?? 0) * 1000).toISOString().slice(0, 10),
    builtAt: new Date().toISOString().slice(0, 10),
    rows: rows.length,
    products: items.length,
    filter: "estadocum = 'Activo'",
  },
  dict,
  items,
};
writeFileSync('src/data/cum-index.json', JSON.stringify(out));
console.log(`OK: ${items.length} productos, ${dict.length} textos únicos → src/data/cum-index.json`);
