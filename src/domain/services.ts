/**
 * Contratos de servicios futuros. Hoy todas las implementaciones responden "no disponible" de forma honesta:
 * la interfaz no simula lecturas, análisis ni datos de reloj.
 *
 * - MedicationScanService (Fase 6): leer el envase desde una foto → campos con nivel de confianza para confirmar.
 * - MedicationKnowledgeRepository / MedicationAnalysisService (Fase 7): base farmacológica verificada
 *   (interacciones, contraindicaciones, componentes) con fuente y fecha de revisión.
 * - HealthProvider (Fase 8): HealthKit (iOS) y Health Connect (Android); requiere la versión instalable.
 */
import type { ISODate, Medication } from './types';

export type Unavailable = { available: false; reason: string };

// ── Lectura del envase ───────────────────────────────────────

export interface ExtractedField<T> {
  value: T;
  /** 0–1. El cuidador confirma campo por campo; nada se programa desde un borrador. */
  confidence: number;
}

export interface ScanResult {
  available: true;
  name?: ExtractedField<string>;
  activeIngredient?: ExtractedField<string>;
  strength?: ExtractedField<string>;
  form?: ExtractedField<Medication['form']>;
  unitsPerPackage?: ExtractedField<number>;
  lot?: ExtractedField<string>;
  expiry?: ExtractedField<ISODate>;
}

export interface MedicationScanService {
  extract(photoUri: string): Promise<ScanResult | Unavailable>;
}

export const medicationScanService: MedicationScanService = {
  async extract() {
    return { available: false, reason: 'La lectura automática del envase llegará en una próxima fase. Por ahora completa los datos mirando la foto.' };
  },
};

// ── Conocimiento farmacológico ───────────────────────────────

export interface VerifiedSource {
  name: string;
  url: string;
  reviewedAt: ISODate;
}

export interface InteractionWarning {
  severity: 'info' | 'caution' | 'major';
  text: string;
  source: VerifiedSource;
}

export interface MedicationKnowledgeRepository {
  findByName(name: string): Promise<{ ingredient: string; components: string[]; source: VerifiedSource }[] | Unavailable>;
}

export interface MedicationAnalysisService {
  analyze(meds: Medication[], profile: { allergies: string[]; conditions: string[] }): Promise<InteractionWarning[] | Unavailable>;
}

const NOT_YET: Unavailable = { available: false, reason: 'Disponible cuando se conecte la base de datos farmacológica verificada (Fase 7).' };

export const medicationKnowledge: MedicationKnowledgeRepository = { findByName: async () => NOT_YET };
export const medicationAnalysis: MedicationAnalysisService = { analyze: async () => NOT_YET };

// ── Reloj inteligente ────────────────────────────────────────

export interface HealthSample {
  at: string;
  value: number;
}

export interface HealthProvider {
  readonly platform: 'healthkit' | 'healthconnect';
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  getSteps(day: ISODate): Promise<number | Unavailable>;
  getHeartRate(day: ISODate): Promise<HealthSample[] | Unavailable>;
  getSleep(day: ISODate): Promise<{ minutes: number } | Unavailable>;
  getSpO2(day: ISODate): Promise<HealthSample[] | Unavailable>;
}

const NEEDS_BUILD: Unavailable = { available: false, reason: 'Requiere la versión instalable de BUDDY (no funciona en Expo Go).' };

function skeleton(platform: HealthProvider['platform']): HealthProvider {
  return {
    platform,
    isAvailable: async () => false,
    requestPermissions: async () => false,
    getSteps: async () => NEEDS_BUILD,
    getHeartRate: async () => NEEDS_BUILD,
    getSleep: async () => NEEDS_BUILD,
    getSpO2: async () => NEEDS_BUILD,
  };
}

export const healthKitProvider = skeleton('healthkit');
export const healthConnectProvider = skeleton('healthconnect');
