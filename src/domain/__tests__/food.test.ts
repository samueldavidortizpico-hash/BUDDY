/** V2.4 · Evaluador de alimentos: casos calculados a mano con las fórmulas de la Tabla 17 (Res. 254 de 2023). */
import { FOOD_RULES, HOMEMADE_MESSAGE, evaluateFood, type FoodInput, type FoodResult } from '../food';

const base: FoodInput = { name: '[PRUEBA] Galletas', packaged: true, state: 'solid', basis: 'per100', energyKcal: 450, sodiumMg: 350, freeSugarsG: 20, satFatG: 5, transFatG: 0.2, added: 'yes' };
const statusOf = (r: FoodResult, n: string) => (r.kind === 'evaluated' ? r.nutrients.find((x) => x.nutrient === n)?.status : undefined);

describe('evaluador de alimentos (norma de etiquetado frontal)', () => {
  it('umbrales versionados con fuente y fecha', () => {
    expect(FOOD_RULES.version).toMatch(/810 de 2021.*2492 de 2022.*254 de 2023/);
    expect(FOOD_RULES.consultedAt).toBe('2026-10-12');
  });

  it('galletas por 100 g: sodio por 300 mg/100 g, azúcares 17,8 %, saturadas justo 10 %, trans 0,4 %', () => {
    const r = evaluateFood(base);
    expect(['sodium', 'sugars', 'satFat', 'transFat'].map((n) => statusOf(r, n))).toEqual(['exceeds', 'exceeds', 'exceeds', 'below']);
    expect(r.kind === 'evaluated' && r.summary).toBe('Exceso en sodio, azúcares, grasas saturadas según la norma.');
  });

  it('sodio: 1 mg/kcal exacto supera; 0,995 mg/kcal y menos de 300 mg/100 g no', () => {
    expect(statusOf(evaluateFood({ ...base, energyKcal: 200, sodiumMg: 200 }), 'sodium')).toBe('exceeds');
    expect(statusOf(evaluateFood({ ...base, energyKcal: 200, sodiumMg: 199 }), 'sodium')).toBe('below');
  });

  it('bebida sin aporte energético: 40 mg/100 ml supera, 39 no; 0 g de azúcar con 0 kcal no supera', () => {
    const drink: FoodInput = { ...base, state: 'liquid', energyKcal: 0, sodiumMg: 40, freeSugarsG: 0, satFatG: 0, transFatG: 0 };
    expect(statusOf(evaluateFood(drink), 'sodium')).toBe('exceeds');
    expect(statusOf(evaluateFood({ ...drink, sodiumMg: 39 }), 'sodium')).toBe('below');
    expect(statusOf(evaluateFood(drink), 'sugars')).toBe('below');
  });

  it('por porción: convierte a 100 g; sin tamaño de porción no da por bueno el sodio', () => {
    const portion: FoodInput = { ...base, basis: 'portion', portionSize: 30, energyKcal: 150, sodiumMg: 95 }; // 0,63 mg/kcal; 316,7 mg/100 g
    expect(statusOf(evaluateFood(portion), 'sodium')).toBe('exceeds');
    expect(statusOf(evaluateFood({ ...portion, portionSize: null }), 'sodium')).toBe('missing');
  });

  it('sin la energía no calcula porcentajes ni da veredicto completo', () => {
    const r = evaluateFood({ ...base, energyKcal: null, sodiumMg: 100 });
    expect(statusOf(r, 'sugars')).toBe('missing');
    expect(r.kind === 'evaluated' && r.summary).toBe('Faltan datos para evaluar todo lo que pide la norma.');
  });

  it('si los ingredientes no tienen nada añadido, dice que la norma no exige sello', () => {
    const r = evaluateFood({ ...base, added: 'no' });
    expect(r.kind === 'evaluated' && r.summary).toMatch(/sin ingredientes añadidos la norma no exige sello/);
  });

  it('un plato casero no tiene veredicto: se registra y se sugiere nutricionista', () => {
    expect(evaluateFood({ ...base, packaged: false })).toEqual({ kind: 'not_applicable', message: HOMEMADE_MESSAGE });
  });

  it('relaciona las restricciones escritas por el cuidador, sin recomendar dietas', () => {
    const r = evaluateFood(base, ['Bajo en azúcar', 'Sin gluten']);
    expect(r.kind === 'evaluated' && r.profileNotes).toEqual(['Restricción registrada por el cuidador: "Bajo en azúcar". Este producto supera el umbral de azúcares.']);
    expect(JSON.stringify(r)).not.toMatch(/recomend|debe comer|no coma|seguro|sano/i);
  });
});
