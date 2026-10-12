/** V2.4 · MedicationKnowledgeService: índice real del INVIMA y servicio en línea con respuestas SIMULADAS. */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FRECUENTES } from '../../../tests/medicamentos-frecuentes';
import idx from '@/data/cum-index.json';
import { medicationKnowledge } from '@/infrastructure/knowledge';

import { formOf, lookupIndex, plainSummary, strengthText, type CumIndex } from '../knowledge';

const index = idx as unknown as CumIndex;
const fetchMock = globalThis.fetch as jest.Mock;
const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

describe('índice del INVIMA (sin conexión)', () => {
  it('tiene fuente, licencia y fecha de corte', () => {
    expect(index.meta).toMatchObject({ dataset: 'i7cb-raxc', license: expect.stringContaining('CC BY-SA 4.0'), attribution: expect.stringContaining('INVIMA') });
    expect(index.meta.products).toBeGreaterThan(5000);
  });

  it('"dolex" devuelve presentaciones del registro con fuente y sin dosis', () => {
    const r = lookupIndex(index, 'dolex');
    expect(r.status).toBe('found');
    if (r.status !== 'found') return;
    expect(r.by).toBe('brand');
    const avanzado = r.matches.find((m) => m.name === 'Dolex Avanzado')!;
    expect(strengthText(avanzado)).toBe('500 mg');
    expect(avanzado.atc).toBe('N02BE01');
    expect(avanzado.source).toMatchObject({ id: expect.stringMatching(/^INVIMA/), date: index.meta.dataUpdatedAt });
    expect(Object.keys(avanzado)).not.toContain('dose');
  });

  it('un principio activo agrupa por concentración, no por laboratorio', () => {
    const r = lookupIndex(index, 'losartán');
    expect(r.status === 'found' && r.by).toBe('ingredient');
    if (r.status === 'found') expect(r.matches.map(strengthText)).toEqual(expect.arrayContaining(['50 mg', '100 mg']));
  });

  it('un error de ortografía solo da sugerencias; lo inexistente, nada', () => {
    expect(lookupIndex(index, 'metformna')).toEqual({ status: 'suggest', suggestions: expect.arrayContaining(['Metformina']) });
    expect(lookupIndex(index, 'zqxvita')).toEqual({ status: 'none' });
    expect(lookupIndex(index, 'ab')).toEqual({ status: 'none' });
  });

  it('formas del INVIMA → forma de BUDDY', () => {
    expect([formOf('Tableta Recubierta'), formOf('Jarabe'), formOf('Capsula Blanda'), formOf('Crema Topica')]).toEqual(['tablet', 'syrup', 'capsule', 'cream']);
    expect(plainSummary('<p>Uno. Dos. Tres.</p>')).toBe('Uno. Dos.');
  });

  it('cobertura con 100 medicamentos frecuentes en Colombia (se informa; no se ajusta la lista)', () => {
    expect(FRECUENTES).toHaveLength(100);
    const results = FRECUENTES.map((q) => ({ q, r: lookupIndex(index, q) }));
    const found = results.filter((x) => x.r.status === 'found');
    const missing = results.filter((x) => x.r.status !== 'found').map((x) => `${x.q} (${x.r.status === 'suggest' ? `sugiere ${x.r.suggestions.join('/')}` : 'sin resultado'})`);
    console.log(`Cobertura del índice INVIMA: ${found.length}/100\nSin coincidencia directa: ${missing.join(', ') || 'ninguno'}`);
    expect(found.length).toBeGreaterThan(0);
  });
});

describe('explain(): información en español de MedlinePlus.gov', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    fetchMock.mockReset();
  });
  const losartan = { atc: 'C09CA01', ingredients: [{ name: 'LOSARTAN POTASICO', amount: '50', unit: 'mg', per: '' }] };

  it('ruta ATC → RxCUI → MedlinePlus en español, con fuente y fecha; luego usa la caché', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('rxcui.json')
        ? ok({ idGroup: { rxnormId: ['52175'] } })
        : ok({ feed: { entry: [{ title: { _value: 'Losartán' }, summary: { _value: 'El losartán se usa para tratar la presión arterial alta. Otra.' }, link: [{ href: 'https://medlineplus.gov/spanish/druginfo/meds/a695008-es.html?utm=1' }] }] } }),
    );
    const r = await medicationKnowledge.explain(losartan);
    expect(r).toMatchObject({ status: 'found', uses: 'El losartán se usa para tratar la presión arterial alta. Otra.', url: 'https://medlineplus.gov/spanish/druginfo/meds/a695008-es.html', rxcui: '52175', source: { name: 'MedlinePlus.gov' } });
    expect(fetchMock.mock.calls[1][0]).toContain('informationRecipient.languageCode.c=es');
    fetchMock.mockClear();
    await medicationKnowledge.explain(losartan);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('con la ruta aproximada, si MedlinePlus habla de OTRO medicamento no se muestra', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('approximateTerm') ? ok({ approximateGroup: { candidate: [{ rxcui: '1', rank: '1' }] } }) : ok({ feed: { entry: [{ title: { _value: 'Ibuprofeno' }, summary: { _value: 'Otro.' } }] } }),
    );
    expect(await medicationKnowledge.explain({ atc: '', ingredients: [{ name: 'ZQXVITA', amount: '', unit: '', per: '' }] })).toEqual({ status: 'none' });
  });

  it('sin conexión y sin caché: "offline"; sin conexión con caché vieja: la guardada, marcada como tal', async () => {
    fetchMock.mockRejectedValue(new Error('sin red'));
    expect(await medicationKnowledge.explain(losartan)).toEqual({ status: 'offline' });
    const old = { status: 'found', title: 'Losartán', uses: 'Texto guardado.', url: 'u', source: { name: 'MedlinePlus.gov', url: 'u', date: '2026-10-01' }, rxcui: '52175', stale: false };
    await AsyncStorage.setItem('buddy.knowledge.v1', JSON.stringify({ 'atc:C09CA01': { at: 0, value: old } }));
    expect(await medicationKnowledge.explain(losartan)).toMatchObject({ status: 'found', uses: 'Texto guardado.', stale: true });
  });
});
