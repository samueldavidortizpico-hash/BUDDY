/**
 * Contratos de repositorio. Los casos de uso dependen solo de estas interfaces;
 * hoy la implementación es local (in-memory.ts) y en la Fase 2 podrá ser Supabase.
 * Las lecturas devuelven referencias estables mientras los datos no cambian.
 */
import type {
  AlertStatus,
  ChatMessage,
  Contact,
  DoseEvent,
  FollowUpAlert,
  ISODate,
  Medication,
  MoodEntry,
  Settings,
  SleepEntry,
  SymptomEntry,
  VitalEntry,
} from '@/types/domain';

export interface Subscribable {
  subscribe(listener: () => void): () => void;
}

export interface MedicationRepository extends Subscribable {
  listMedications(): Medication[];
  listDoses(): DoseEvent[];
  addMedication(medication: Medication): void;
  addDoses(doses: DoseEvent[]): void;
  updateDose(id: string, patch: Partial<DoseEvent>): void;
}

export interface WellbeingRepository extends Subscribable {
  listMoods(): MoodEntry[];
  addMood(entry: MoodEntry): void;
  listSymptoms(): SymptomEntry[];
  addSymptom(entry: SymptomEntry): void;
  waterLog(): Record<ISODate, number>;
  setWater(date: ISODate, glasses: number): void;
  habitLog(): Record<ISODate, string[]>;
  setHabits(date: ISODate, habitIds: string[]): void;
}

export interface SleepRepository extends Subscribable {
  list(): SleepEntry[];
  upsert(entry: SleepEntry): void;
}

export interface VitalsRepository extends Subscribable {
  list(): VitalEntry[];
  add(entry: VitalEntry): void;
}

export interface ChatRepository extends Subscribable {
  list(): ChatMessage[];
  append(message: ChatMessage): void;
}

export interface CaregiverRepository extends Subscribable {
  listAlerts(): FollowUpAlert[];
  alertOverrides(): Record<string, AlertStatus>;
  setAlertStatus(id: string, status: AlertStatus): void;
}

export interface ProfileRepository extends Subscribable {
  settings(): Settings;
  update(patch: Partial<Settings>): void;
  contacts(): Contact[];
  resetDemo(): void;
  isReady(): boolean;
  subscribeReady(listener: () => void): () => void;
}
