/** V2.4 · Alertas por perfil: reglas deterministas con su fuente; nunca "seguro" ni "apto". Datos ficticios. */
import { FEATURES } from '@/config/features';

import { CONSULT_TEXT, NO_MATCH_TEXT, reviewMedication } from '../review';
import type { Medication } from '../types';

const meta = { ownerUserId: 'u', elderId: 'e', createdBy: 'u', createdAt: '', updatedAt: '', deletedAt: null, syncStatus: 'pending' as const };
function med(over: Partial<Medication> = {}): Medication {
  return {
    ...meta, id: 'm1', name: '[PRUEBA] Medicamento', activeIngredient: '', strength: '', form: 'tablet', doseAmount: 1, doseUnit: 'unit',
    schedule: { kind: 'times', times: ['08:00'], days: [] }, startDate: '2026-10-01', endDate: null, instructions: '', purpose: '', description: '',
    unitsPerPackage: null, unitsOnHand: null, refillAlertDays: 3, photoUri: null, paused: false, ...over,
  };
}
const elder = (allergies: string[] = [], avoid: string[] = []) => ({ allergies, avoid, equivalences: {} });

describe('revisión por perfil (V2.4)', () => {
  // El nivel 2 está apagado por defecto (V3.0); estas pruebas lo encienden para verificar sus reglas.
  const level2 = FEATURES.level2Review;
  beforeEach(() => { FEATURES.level2Review = true; });
  afterEach(() => { FEATURES.level2Review = level2; });

  it('alergia a "penicilina" coincide con amoxicilina por su clase ATC (J01C), con la fuente de la regla', () => {
    const f = reviewMedication(med({ name: 'Amoxicilina', activeIngredient: 'Amoxicilina', atc: 'J01CA04' }), elder(['Penicilina']), []);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: 'allergy_match', source: expect.stringContaining('ATC') });
    expect(f[0].reason).toContain('penicilinas (ATC J01C)');
  });

  it('con el nivel 2 apagado (producción sin revisión profesional) la regla de clase no se aplica', () => {
    FEATURES.level2Review = false;
    expect(reviewMedication(med({ name: 'Amoxicilina', activeIngredient: 'Amoxicilina', atc: 'J01CA04' }), elder(['Penicilina']), [])).toEqual([]);
  });

  it('acetaminofén y paracetamol son el mismo principio activo (alergia escrita con el otro nombre)', () => {
    const f = reviewMedication(med({ name: 'Dolex Eferbest', activeIngredient: 'Cafeina + Paracetamol' }), elder(['acetaminofén']), []);
    expect(f[0]).toMatchObject({ kind: 'allergy_match', source: expect.stringContaining('cuidador') });
  });

  it('detecta el principio activo repetido dentro de una combinación', () => {
    const avanzado = med({ id: 'a', name: 'Dolex Avanzado', activeIngredient: 'Acetaminofen', schedule: { kind: 'times', times: ['20:00'], days: [] } });
    const f = reviewMedication(med({ id: 'b', name: 'Dolex Forte Nf', activeIngredient: 'Acetaminofen + Cafeina' }), elder(), [avanzado]);
    expect(f).toEqual([expect.objectContaining({ kind: 'duplicate_ingredient', otherMedicationId: 'a' })]);
    expect(f[0].reason).toContain('acetaminofen');
  });

  it('misma clase ATC con principios distintos: aviso de posible duplicado, no de contraindicación', () => {
    const losartan = med({ id: 'a', name: 'Losartán', activeIngredient: 'Losartan Potasico', atc: 'C09CA01', schedule: { kind: 'times', times: ['20:00'], days: [] } });
    const f = reviewMedication(med({ id: 'b', name: 'Valsartán', activeIngredient: 'Valsartan', atc: 'C09CA03' }), elder(), [losartan]);
    expect(f).toEqual([expect.objectContaining({ kind: 'same_class' })]);
    expect(f[0].reason).toMatch(/Puede ser intencional/);
  });

  it('sin coincidencias no hay hallazgos; ningún texto dice "seguro" ni "apto"', () => {
    expect(reviewMedication(med({ name: 'Metformina', activeIngredient: 'Metformina', atc: 'A10BA02' }), elder(['Penicilina']), [])).toEqual([]);
    for (const text of [NO_MATCH_TEXT, CONSULT_TEXT]) expect(text).not.toMatch(/\bseguro\b|\bapto\b|\bpeligroso\b/i);
  });

  it('con datos faltantes (sin principio activo ni ATC) no inventa coincidencias', () => {
    expect(reviewMedication(med({ name: 'Zqxvita' }), elder(['Penicilina']), [med({ id: 'x', name: 'Otro' })])).toEqual([expect.objectContaining({ kind: 'schedule_overlap' })]);
  });
});
