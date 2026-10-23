/**
 * Modelo de dominio de BUDDY v2.1. Fechas de calendario en hora local `YYYY-MM-DD`; horas `HH:mm` (24 h, local);
 * instantes en ISO 8601. Todo registro lleva `SyncMeta` para sincronizar con Supabase (docs/SUPABASE_PLAN.md).
 */
import type { TextScale } from '@/theme';

export type ISODate = string;
export type ClockTime = string;
export type Timestamp = string;

export type SyncStatus = 'local' | 'pending' | 'synced';

export interface SyncMeta {
  id: string;
  /** Cuenta dueña del dato (cuidador). */
  ownerUserId: string;
  /** Adulto mayor al que pertenece (null en datos de la cuenta). */
  elderId: string | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Borrado lógico: el registro se oculta pero se conserva para sincronizar y deshacer. */
  deletedAt: Timestamp | null;
  syncStatus: SyncStatus;
  /** Versión del registro (sube en cada cambio): base de la resolución de conflictos del SyncEngine. */
  version?: number;
}

export type Role = 'caregiver' | 'elder';

/** 0 = domingo … 6 = sábado. Lista vacía = todos los días. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ── Adulto mayor ─────────────────────────────────────────────
export type Gender = 'female' | 'male' | 'other' | 'undisclosed';
export type Relation = 'mother' | 'father' | 'grandmother' | 'grandfather' | 'other';
export type SummaryFrequency = 'daily' | 'weekly' | 'none';
export type ElderAppearance = 'auto' | 'light' | 'dark' | 'contrast';

export interface ElderScreenPrefs {
  textScale: TextScale;
  appearance: ElderAppearance;
  voice: boolean;
  /** 0.7 (lenta) … 1.1 (normal+). */
  voiceRate: number;
  maxSnoozes: number;
  /** Hora del aviso del día anterior a una cita (la define el cuidador; 18:00 por defecto). */
  apptNoticeTime?: ClockTime;
  /** Mostrar el nombre del medicamento en las notificaciones (pantalla de bloqueo). Apagado por defecto. */
  showMedName?: boolean;
  /** Aviso escalonado (V3.0): segundo aviso a T+N min y "sin confirmar" a T+M min. Lo define el administrador. */
  remindAfterMin?: number;
  unconfirmedAfterMin?: number;
  /** Detección de silencio: horas sin señal del celular del adulto mayor para "No puedo verificar" (12 por defecto). */
  silenceHours?: number;
}

/** Consentimiento de ubicación del adulto mayor (solo él decide; revocable en cualquier momento). */
export type LocationConsent = 'none' | 'requested' | 'granted' | 'denied' | 'revoked';

/** Ubicación compartida en primer plano, con su hora y precisión (metros). */
export interface LocationFix extends SyncMeta {
  lat: number;
  lng: number;
  accuracy: number | null;
  at: Timestamp;
}

export interface Elder extends SyncMeta {
  /** Ubicación: estado del consentimiento y fechas de solicitud y decisión. */
  locationConsent?: LocationConsent;
  locationRequestedAt?: Timestamp | null;
  locationDecidedAt?: Timestamp | null;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: ISODate | null;
  /** Edad declarada cuando no se conoce la fecha de nacimiento. */
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  relation: Relation;
  relationOther: string;
  /** Celular del adulto mayor (opcional): para llamarlo desde las alertas y recomendaciones de BUDDY. */
  phone?: string;
  allergies: string[];
  conditions: string[];
  /** Contraindicaciones o cosas que debe evitar (texto del cuidador). */
  avoid: string[];
  surgeries: string[];
  insurer: string;
  doctor: string;
  dietRestrictions: string[];
  foodAllergies: string[];
  checkinTime: ClockTime | null;
  summaries: SummaryFrequency;
  /** Hora del resumen diario de una línea para el administrador (20:00 por defecto). */
  summaryTime?: ClockTime;
  alertPrefs: Record<AlertKind, boolean>;
  screen: ElderScreenPrefs;
  /** Equivalencias editables para la revisión de alergias: { "penicilina": ["amoxicilina", …] }. */
  equivalences: Record<string, string[]>;
  /** Paso del asistente de registro (1–8); `setupDone` cuando se completó. */
  setupStep: number;
  setupDone: boolean;
}

// ── Medicamentos ─────────────────────────────────────────────
export type MedForm = 'tablet' | 'capsule' | 'syrup' | 'drops' | 'cream' | 'injection' | 'patch' | 'other';
export type DoseUnit = 'unit' | 'ml' | 'drops' | 'application';

export type MedSchedule =
  | { kind: 'times'; times: ClockTime[]; days: Weekday[] }
  | { kind: 'interval'; everyHours: number; from: ClockTime; days: Weekday[] };

export interface Medication extends SyncMeta {
  name: string;
  activeIngredient: string;
  /** Concentración del producto, p. ej. "50 mg". Distinta de la dosis. */
  strength: string;
  form: MedForm;
  /** Cuánto se toma cada vez (0.25, 0.5, 1, 1.5…). */
  doseAmount: number;
  doseUnit: DoseUnit;
  schedule: MedSchedule;
  startDate: ISODate;
  endDate: ISODate | null;
  /** Instrucciones del cuidador: con comida, en ayunas… */
  instructions: string;
  /** Para qué sirve, en palabras del cuidador. */
  purpose: string;
  /** Descripción: la escribe el cuidador o el servicio farmacológico futuro. Nunca la inventa BUDDY. */
  description: string;
  /** Código ATC del registro elegido (si se eligió una presentación del INVIMA). */
  atc?: string;
  /** De dónde salieron nombre, principio activo y concentración (trazabilidad); ausente = escrito a mano. */
  verifiedSource?: { source: string; id?: string; date: string } | null;
  unitsPerPackage: number | null;
  /** Existencias actuales en unidades de dosis (tabletas, ml, gotas…). null = no se registran. */
  unitsOnHand: number | null;
  refillAlertDays: number;
  /** Avisos de existencias ya dados en el ciclo actual (se limpia al volver a nivel normal, p. ej. tras una compra). */
  stockAlerted?: ('stock_low' | 'stock_out')[];
  photoUri: string | null;
  paused: boolean;
}

/** "taken" es una confirmación declarada, no una ingestión comprobada. */
export type DoseStatus = 'pending' | 'taken' | 'snoozed' | 'skipped';
/** Estado mostrado: añade "unconfirmed" cuando pasó el margen sin respuesta (no es omisión ni emergencia). */
export type DisplayDoseStatus = DoseStatus | 'unconfirmed';

export interface DoseEvent extends SyncMeta {
  medicationId: string;
  date: ISODate;
  time: ClockTime;
  status: DoseStatus;
  respondedAt: Timestamp | null;
  snoozedTo: ClockTime | null;
  snoozeCount: number;
  answeredBy: Role | null;
  /** Unidades descontadas de las existencias al confirmar (idempotencia y compensación); null = no se descontó. */
  stockApplied?: number | null;
}

export interface StockEntry extends SyncMeta {
  medicationId: string;
  /** Positivo = compra; negativo = corrección. */
  units: number;
  note: string;
}

// ── Rutina ───────────────────────────────────────────────────
export interface WaterPlan extends SyncMeta {
  glasses: number;
  times: ClockTime[];
}

export interface WaterEntry extends SyncMeta {
  date: ISODate;
  at: Timestamp;
}

export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal extends SyncMeta {
  kind: MealKind;
  time: ClockTime;
}

export interface MealLog extends SyncMeta {
  mealId: string;
  date: ISODate;
  answer: 'yes' | 'no';
}

export type ActivityKind = 'walk' | 'stretch' | 'air' | 'breath' | 'music' | 'read' | 'call' | 'custom';

export interface Activity extends SyncMeta {
  kind: ActivityKind;
  title: string;
  time: ClockTime;
  minutes: number | null;
  days: Weekday[];
  /** Para "llamar a un familiar". */
  contactId: string | null;
  /** Meta de pasos: solo se mide con reloj conectado. */
  stepsGoal: number | null;
}

export interface ActivityLog extends SyncMeta {
  activityId: string;
  date: ISODate;
  done: boolean;
}

export interface Contact extends SyncMeta {
  name: string;
  relation: string;
  phone: string;
  primary: boolean;
}

export interface Reminder extends SyncMeta {
  title: string;
  time: ClockTime;
  days: Weekday[];
  /** Solo ese día (mensajes del cuidador). Sin valor = se repite según `days`. */
  date?: ISODate | null;
  /** Pregunta/aviso recurrente administrable desde Rutina. Ausente en recordatorios antiguos. */
  automation?: { kind: 'mood' | 'sleep' | 'emotional' | 'water' | 'meal' | 'walk' | 'medication_alert'; enabled: boolean; medicationId?: string };
}

export interface Appointment extends SyncMeta {
  title: string;
  date: ISODate;
  time: ClockTime;
  /** Dirección (calle y número). */
  place: string;
  /** Especialidad o médico. */
  doctor?: string;
  /** Clínica, hospital o consultorio. */
  institution?: string;
  city?: string;
  /** Punto de referencia ("frente al parque"). */
  reference?: string;
  /** Teléfono del consultorio. */
  phone?: string;
  notes?: string;
  /** Preguntas para llevar a la cita. */
  questions?: string[];
}

/** "Calle 10 # 5-20, Bogotá (frente al parque)". */
export function appointmentAddress(a: Pick<Appointment, 'place' | 'city' | 'reference'> & { institution?: string }): string {
  const main = [a.institution, a.place, a.city].map((x) => x?.trim()).filter(Boolean).join(', ');
  return a.reference?.trim() ? `${main}${main ? ' ' : ''}(${a.reference.trim()})` : main;
}

// ── Respuestas del adulto mayor ──────────────────────────────
export type Answer3 = 'good' | 'regular' | 'bad';

export interface CheckinAnswer extends SyncMeta {
  date: ISODate;
  mood: Answer3 | null;
  sleep: Answer3 | null;
  /** ¿Tiene algún malestar? */
  unwell: boolean | null;
  /** Respuestas exactas de automatizaciones, además de las métricas diarias ya normalizadas. */
  automationAnswers?: Record<string, { answer: string; respondedAt: Timestamp }>;
}

// ── Avisos ───────────────────────────────────────────────────
export type AlertKind =
  | 'dose_unconfirmed'
  | 'stock_low'
  | 'stock_out'
  | 'allergy_match'
  | 'duplicate_ingredient'
  | 'same_class'
  | 'schedule_overlap'
  | 'help_requested'
  | 'checkin_unwell';

export interface Alert extends SyncMeta {
  kind: AlertKind;
  title: string;
  detail: string;
  /** Registro relacionado (medicamento, toma, chequeo…). */
  refId: string | null;
  status: 'pending' | 'attended';
  snoozedUntil: Timestamp | null;
}

// ── Asistente ────────────────────────────────────────────────
export interface AssistantMessage extends SyncMeta {
  from: 'user' | 'buddy';
  text: string;
  /** Propuesta de acciones (JSON de AssistantAction) pendiente de confirmar. */
  proposal: string | null;
  proposalState: 'open' | 'confirmed' | 'cancelled' | null;
  quickReplies: string[];
  imageUri: string | null;
}

// ── Cuenta ───────────────────────────────────────────────────
export interface AccountSettings extends SyncMeta {
  activeElderId: string | null;
  /** PIN de 4 dígitos (hash con sal) para salir de la pantalla del adulto mayor. */
  pinHash: string | null;
  pinSalt: string | null;
  myAlerts: Record<AlertKind, boolean>;
  permissions: { camera: boolean; notifications: boolean; health: boolean };
  demoMode: boolean;
}

export const ALERT_KINDS: AlertKind[] = [
  'dose_unconfirmed',
  'stock_low',
  'stock_out',
  'allergy_match',
  'duplicate_ingredient',
  'same_class',
  'schedule_overlap',
  'help_requested',
  'checkin_unwell',
];
