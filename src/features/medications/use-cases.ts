/** Casos de uso de medicamentos: validación del formulario y transiciones de tomas. */
import type { MedicationRepository } from '@/repositories/contracts';
import type { ClockTime, DoseEvent, Frequency, ISODate, Medication, PillColor } from '@/types/domain';
import { daysBetween, isValidClock, parseISODate, toISODate } from '@/utils/dates';
import { createId } from '@/utils/id';

import { isActiveOn, missingDoses, snoozeTarget } from './schedule';

export const STRENGTH_UNITS = ['mg', 'mcg', 'g', 'UI', 'ml', '%'] as const;

export const FORMS = [
  { key: 'Tableta', one: 'tableta', many: 'tabletas' },
  { key: 'Cápsula', one: 'cápsula', many: 'cápsulas' },
  { key: 'Jarabe', one: 'ml', many: 'ml' },
  { key: 'Gotas', one: 'gota', many: 'gotas' },
  { key: 'Sobre', one: 'sobre', many: 'sobres' },
  { key: 'Inhalador', one: 'inhalación', many: 'inhalaciones' },
  { key: 'Crema', one: 'aplicación', many: 'aplicaciones' },
] as const;

export const FREQUENCIES: { key: Frequency; label: string }[] = [
  { key: 'daily', label: 'Todos los días' },
  { key: 'alternate', label: 'Días alternos' },
  { key: 'as_needed', label: 'Solo si lo necesito' },
];

export interface MedicationDraft {
  name: string;
  strengthValue: string;
  strengthUnit: string;
  form: string;
  doseAmount: string;
  frequency: Frequency;
  times: ClockTime[];
  instructions: string;
  startDate: ISODate;
  endDate: ISODate | null;
}

export type DraftField = keyof MedicationDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

/** Acepta coma o punto decimal ("0,5" o "0.5"). Devuelve NaN si no es un número. */
export function parseDecimal(input: string): number {
  const t = input.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export function emptyDraft(today: ISODate): MedicationDraft {
  return {
    name: '',
    strengthValue: '',
    strengthUnit: 'mg',
    form: '',
    doseAmount: '',
    frequency: 'daily',
    times: [],
    instructions: '',
    startDate: today,
    endDate: null,
  };
}

export function validateDraft(
  draft: MedicationDraft,
  existing: Medication[],
  today: ISODate,
): { errors: DraftErrors; warnings: string[] } {
  const errors: DraftErrors = {};
  if (draft.name.trim().length < 2) errors.name = 'Escribe el nombre del medicamento.';
  if (!(parseDecimal(draft.strengthValue) > 0))
    errors.strengthValue = 'Escribe la concentración con un número mayor que cero, por ejemplo 5.';
  if (!draft.strengthUnit) errors.strengthUnit = 'Elige la unidad de la concentración.';
  if (!draft.form) errors.form = 'Elige la presentación.';
  if (!(parseDecimal(draft.doseAmount) > 0))
    errors.doseAmount = 'Escribe cuánto tomas cada vez, por ejemplo 1.';
  if (draft.frequency !== 'as_needed') {
    if (draft.times.length === 0) errors.times = 'Agrega al menos una hora de toma.';
    else if (draft.times.some((t) => !isValidClock(t))) errors.times = 'Revisa las horas: alguna no es válida.';
    else if (new Set(draft.times).size !== draft.times.length) errors.times = 'Hay horas repetidas.';
  }
  if (!parseISODate(draft.startDate)) errors.startDate = 'La fecha de inicio no es válida.';
  else if (draft.endDate && !(daysBetween(draft.startDate, draft.endDate) >= 0))
    errors.endDate = 'La fecha de fin no puede ser anterior a la de inicio.';

  const warnings: string[] = [];
  const name = draft.name.trim().toLowerCase();
  if (name && existing.some((m) => m.name.trim().toLowerCase() === name && isActiveOn(m, today)))
    warnings.push('Ya tienes un medicamento activo con este nombre. Revisa que no esté duplicado.');
  return { errors, warnings };
}

const COLORS: PillColor[] = ['coral', 'blue', 'yellow'];

export function buildMedication(draft: MedicationDraft, now: Date, index: number): Medication {
  return {
    id: createId('med'),
    name: draft.name.trim(),
    strengthValue: draft.strengthValue.trim().replace('.', ','),
    strengthUnit: draft.strengthUnit,
    form: draft.form,
    doseAmount: draft.doseAmount.trim().replace('.', ','),
    frequency: draft.frequency,
    times: draft.frequency === 'as_needed' ? [] : [...draft.times].sort(),
    instructions: draft.instructions.trim(),
    startDate: draft.startDate,
    endDate: draft.endDate,
    color: COLORS[index % COLORS.length],
    createdAt: now.toISOString(),
    demo: false,
  };
}

export function strengthLabel(med: Pick<Medication, 'strengthValue' | 'strengthUnit'>): string {
  // Separador de miles con punto (es-CO) sin depender de Intl: "1000" → "1.000".
  const [int, dec] = med.strengthValue.split(',');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${dec ? `${grouped},${dec}` : grouped} ${med.strengthUnit}`;
}

/** "1 tableta", "2 tabletas", "0,5 tableta", "5 ml" */
export function doseLabel(med: Pick<Medication, 'doseAmount' | 'form'>): string {
  const form = FORMS.find((f) => f.key === med.form);
  const n = parseDecimal(med.doseAmount);
  const unit = form ? (n > 1 ? form.many : form.one) : med.form.toLowerCase();
  return `${med.doseAmount} ${unit}`;
}

// ── Casos de uso con repositorio ─────────────────────────────

export type AddResult =
  | { ok: true; medication: Medication; warnings: string[] }
  | { ok: false; errors: DraftErrors; warnings: string[] };

export function addMedication(repo: MedicationRepository, draft: MedicationDraft, now: Date): AddResult {
  const today = toISODate(now);
  const existing = repo.listMedications();
  const { errors, warnings } = validateDraft(draft, existing, today);
  if (Object.keys(errors).length > 0) return { ok: false, errors, warnings };
  const medication = buildMedication(draft, now, existing.length);
  repo.addMedication(medication);
  repo.addDoses(missingDoses([medication], repo.listDoses(), today));
  return { ok: true, medication, warnings };
}

/** Crea las tomas de hoy que falten. Idempotente. */
export function syncDoses(repo: MedicationRepository, now: Date): void {
  const created = missingDoses(repo.listMedications(), repo.listDoses(), toISODate(now));
  if (created.length > 0) repo.addDoses(created);
}

export function confirmDose(repo: MedicationRepository, id: string, now: Date): void {
  repo.updateDose(id, { status: 'taken', confirmedByUser: true, respondedAt: now.toISOString(), snoozedTo: null });
}

export function snoozeDose(repo: MedicationRepository, id: string, now: Date): DoseEvent['snoozedTo'] {
  const snoozedTo = snoozeTarget(now);
  repo.updateDose(id, { status: 'snoozed', snoozedTo, respondedAt: now.toISOString() });
  return snoozedTo;
}

/** "No lo tomé": respuesta explícita del usuario. */
export function skipDose(repo: MedicationRepository, id: string, now: Date): void {
  repo.updateDose(id, { status: 'skipped', confirmedByUser: false, respondedAt: now.toISOString(), snoozedTo: null });
}
