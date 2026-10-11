/** Estado inicial de la app: DATOS FICTICIOS DE DEMOSTRACIÓN generados relativos a `now`. */
import { createDemoAlerts } from '@/features/caregiver/demo-data';
import { initialChat } from '@/features/chat/replies';
import { createDemoDoses, createDemoMedications } from '@/features/medications/demo-data';
import { createDemoSettings, DEMO_CONTACTS } from '@/features/profile/demo-data';
import { createDemoSleep } from '@/features/sleep/demo-data';
import { createDemoVitals } from '@/features/vitals/demo-data';
import { createDemoHabits, createDemoMoods, createDemoSymptoms, createDemoWater } from '@/features/wellbeing/demo-data';
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

export interface AppData {
  medications: Medication[];
  doses: DoseEvent[];
  moods: MoodEntry[];
  symptoms: SymptomEntry[];
  sleep: SleepEntry[];
  vitals: VitalEntry[];
  water: Record<ISODate, number>;
  habits: Record<ISODate, string[]>;
  chat: ChatMessage[];
  alerts: FollowUpAlert[];
  alertOverrides: Record<string, AlertStatus>;
  contacts: Contact[];
  settings: Settings;
}

export function createDemoState(now: Date): AppData {
  const medications = createDemoMedications(now);
  const settings = createDemoSettings(now);
  return {
    medications,
    doses: createDemoDoses(medications, now),
    moods: createDemoMoods(now),
    symptoms: createDemoSymptoms(now),
    sleep: createDemoSleep(now),
    vitals: createDemoVitals(now),
    water: createDemoWater(now),
    habits: createDemoHabits(now),
    chat: initialChat(now, settings.userName),
    alerts: createDemoAlerts(now),
    alertOverrides: {},
    contacts: DEMO_CONTACTS,
    settings,
  };
}
