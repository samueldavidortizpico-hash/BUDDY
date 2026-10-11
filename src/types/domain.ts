/**
 * Modelo de dominio de BUDDY (Fase 1: todo local y ficticio).
 * Fechas de calendario en hora local `YYYY-MM-DD`; horas `HH:mm` (24 h, local); instantes en ISO 8601.
 */
import type { TextScale } from '@/theme';

export type ISODate = string;
export type ClockTime = string;
export type Timestamp = string;

export type Role = 'patient' | 'caregiver';

// ── Medicamentos ──────────────────────────────────────────────
export type PillColor = 'coral' | 'blue' | 'yellow';
export type Frequency = 'daily' | 'alternate' | 'as_needed';

export interface Medication {
  id: string;
  name: string;
  /** Concentración del producto, p. ej. 5 mg. Distinta de la dosis. */
  strengthValue: string;
  strengthUnit: string;
  /** Presentación: tableta, cápsula, jarabe… */
  form: string;
  /** Dosis: cuánto se toma cada vez, p. ej. 1 (tableta). */
  doseAmount: string;
  frequency: Frequency;
  times: ClockTime[];
  instructions: string;
  startDate: ISODate;
  endDate: ISODate | null;
  color: PillColor;
  createdAt: Timestamp;
  /** true = dato ficticio de demostración. */
  demo: boolean;
}

/** Respuesta del usuario a una toma. "taken" es una confirmación declarada, no una ingestión comprobada. */
export type DoseStatus = 'pending' | 'taken' | 'snoozed' | 'skipped';
/** Estado mostrado: añade "unconfirmed" cuando pasó el margen sin respuesta (no es omisión ni emergencia). */
export type DisplayDoseStatus = DoseStatus | 'unconfirmed';

export interface DoseEvent {
  id: string;
  medicationId: string;
  date: ISODate;
  time: ClockTime;
  status: DoseStatus;
  /** El usuario declaró haberla tomado. */
  confirmedByUser: boolean;
  respondedAt: Timestamp | null;
  snoozedTo: ClockTime | null;
  demo: boolean;
}

// ── Bienestar ────────────────────────────────────────────────
export type MoodKey = 'excellent' | 'good' | 'regular' | 'tired' | 'sad' | 'bad';

export interface MoodEntry {
  id: string;
  date: ISODate;
  time: ClockTime;
  mood: MoodKey;
  note: string;
  demo: boolean;
}

export type Intensity = 1 | 2 | 3;

export interface SymptomEntry {
  id: string;
  date: ISODate;
  time: ClockTime;
  symptom: string;
  intensity: Intensity;
  notes: string;
  demo: boolean;
}

export type SleepQuality = 'light' | 'good' | 'deep';

export interface SleepEntry {
  id: string;
  /** Fecha en que despertó. */
  date: ISODate;
  bedtime: ClockTime;
  wakeTime: ClockTime;
  quality: SleepQuality;
  napMinutes: number;
  demo: boolean;
}

// ── Registros de salud (manuales) ───────────────────────────
export type VitalType = 'bloodPressure' | 'glucose' | 'pulse' | 'oxygen' | 'temperature' | 'weight';

export interface VitalEntry {
  id: string;
  type: VitalType;
  value: number;
  /** Solo presión: diastólica. */
  secondary: number | null;
  recordedAt: Timestamp;
  /** Siempre manual en esta fase: no hay dispositivos conectados. */
  source: 'manual';
  demo: boolean;
}

// ── Chat ─────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  from: 'buddy' | 'user';
  text: string;
  at: Timestamp;
}

// ── Cuidador ─────────────────────────────────────────────────
export type AlertStatus = 'pending' | 'important' | 'attended' | 'resolved';
export type AlertKind = 'dose_unconfirmed' | 'symptom' | 'dose_confirmed' | 'mood' | 'vital_reminder';

export interface FollowUpAlert {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  at: Timestamp;
  status: AlertStatus;
  demo: boolean;
}

// ── Perfil y ajustes ────────────────────────────────────────
export interface Contact {
  id: string;
  name: string;
  relation: string;
  /** Número ficticio de demostración: nunca se marca. */
  phone: string;
  demo: boolean;
}

export interface Settings {
  role: Role | null;
  onboarded: boolean;
  userName: string;
  textScale: TextScale;
  notifications: { reminders: boolean; caregiverAlerts: boolean; hideNameOnLockScreen: boolean };
  locationSharing: { enabled: boolean; updatedAt: Timestamp | null };
}
