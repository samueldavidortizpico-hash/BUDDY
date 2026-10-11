import type { Medication } from '@/types/domain';

import { doseLabel, emptyDraft, parseDecimal, strengthLabel, validateDraft, type MedicationDraft } from '../use-cases';

const TODAY = '2026-03-29';

const valid = (over: Partial<MedicationDraft> = {}): MedicationDraft => ({
  ...emptyDraft(TODAY),
  name: 'Medicamento de prueba',
  strengthValue: '50',
  strengthUnit: 'mg',
  form: 'Tableta',
  doseAmount: '1',
  times: ['09:00'],
  ...over,
});

describe('parseDecimal', () => {
  it('acepta coma y punto decimal', () => {
    expect(parseDecimal('0,5')).toBe(0.5);
    expect(parseDecimal(' 0.5 ')).toBe(0.5);
  });

  it('rechaza texto, vacío y negativos', () => {
    expect(parseDecimal('')).toBeNaN();
    expect(parseDecimal('abc')).toBeNaN();
    expect(parseDecimal('-1')).toBeNaN();
  });
});

describe('validateDraft', () => {
  it('un borrador completo es válido', () => {
    expect(validateDraft(valid(), [], TODAY).errors).toEqual({});
  });

  it('exige nombre, concentración, presentación, dosis y hora con mensajes legibles', () => {
    const { errors } = validateDraft(emptyDraft(TODAY), [], TODAY);
    expect(Object.keys(errors).sort()).toEqual(['doseAmount', 'form', 'name', 'strengthValue', 'times']);
    expect(errors.name).toMatch(/nombre/);
  });

  it('distingue concentración de dosis: ambas deben ser mayores que cero', () => {
    const { errors } = validateDraft(valid({ strengthValue: '0', doseAmount: '0' }), [], TODAY);
    expect(errors.strengthValue).toBeDefined();
    expect(errors.doseAmount).toBeDefined();
  });

  it('acepta dosis con decimales (media tableta)', () => {
    expect(validateDraft(valid({ doseAmount: '0,5' }), [], TODAY).errors).toEqual({});
  });

  it('rechaza fecha de fin anterior al inicio', () => {
    expect(validateDraft(valid({ endDate: '2026-03-28' }), [], TODAY).errors.endDate).toBeDefined();
  });

  it('rechaza horas repetidas', () => {
    expect(validateDraft(valid({ times: ['09:00', '09:00'] }), [], TODAY).errors.times).toMatch(/repetidas/);
  });

  it('"solo si lo necesito" no exige horas', () => {
    expect(validateDraft(valid({ frequency: 'as_needed', times: [] }), [], TODAY).errors).toEqual({});
  });

  it('advierte (sin bloquear) si ya existe un medicamento activo con el mismo nombre', () => {
    const existing = [{ name: 'medicamento de prueba', startDate: '2026-01-01', endDate: null } as Medication];
    const result = validateDraft(valid(), existing, TODAY);
    expect(result.errors).toEqual({});
    expect(result.warnings).toHaveLength(1);
  });
});

describe('etiquetas', () => {
  it('formatea concentración con separador de miles', () => {
    expect(strengthLabel({ strengthValue: '1000', strengthUnit: 'UI' })).toBe('1.000 UI');
    expect(strengthLabel({ strengthValue: '0,5', strengthUnit: 'mg' })).toBe('0,5 mg');
  });

  it('formatea la dosis en singular o plural según la presentación', () => {
    expect(doseLabel({ doseAmount: '1', form: 'Tableta' })).toBe('1 tableta');
    expect(doseLabel({ doseAmount: '2', form: 'Tableta' })).toBe('2 tabletas');
    expect(doseLabel({ doseAmount: '5', form: 'Jarabe' })).toBe('5 ml');
  });
});
