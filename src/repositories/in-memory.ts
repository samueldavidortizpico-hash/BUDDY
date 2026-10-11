/**
 * Implementación local de los repositorios sobre el store persistido (datos FICTICIOS de demostración).
 * Es la única capa que conoce el store.
 */
import { useAppStore } from '@/store/app-store';
import { createDemoState } from '@/store/demo-state';

import type {
  CaregiverRepository,
  ChatRepository,
  MedicationRepository,
  ProfileRepository,
  SleepRepository,
  VitalsRepository,
  WellbeingRepository,
} from './contracts';

const get = () => useAppStore.getState();
const set = useAppStore.setState;
const subscribe = (listener: () => void) => useAppStore.subscribe(listener);

const CHAT_LIMIT = 80;

export const medicationRepository: MedicationRepository = {
  subscribe,
  listMedications: () => get().medications,
  listDoses: () => get().doses,
  addMedication: (medication) => set((s) => ({ medications: [...s.medications, medication] })),
  addDoses: (doses) => set((s) => ({ doses: [...s.doses, ...doses] })),
  updateDose: (id, patch) => set((s) => ({ doses: s.doses.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
};

export const wellbeingRepository: WellbeingRepository = {
  subscribe,
  listMoods: () => get().moods,
  addMood: (entry) => set((s) => ({ moods: [...s.moods, entry] })),
  listSymptoms: () => get().symptoms,
  addSymptom: (entry) => set((s) => ({ symptoms: [...s.symptoms, entry] })),
  waterLog: () => get().water,
  setWater: (date, glasses) => set((s) => ({ water: { ...s.water, [date]: glasses } })),
  habitLog: () => get().habits,
  setHabits: (date, ids) => set((s) => ({ habits: { ...s.habits, [date]: ids } })),
};

export const sleepRepository: SleepRepository = {
  subscribe,
  list: () => get().sleep,
  upsert: (entry) => set((s) => ({ sleep: [...s.sleep.filter((e) => e.date !== entry.date), entry] })),
};

export const vitalsRepository: VitalsRepository = {
  subscribe,
  list: () => get().vitals,
  add: (entry) => set((s) => ({ vitals: [...s.vitals, entry] })),
};

export const chatRepository: ChatRepository = {
  subscribe,
  list: () => get().chat,
  append: (message) => set((s) => ({ chat: [...s.chat, message].slice(-CHAT_LIMIT) })),
};

export const caregiverRepository: CaregiverRepository = {
  subscribe,
  listAlerts: () => get().alerts,
  alertOverrides: () => get().alertOverrides,
  setAlertStatus: (id, status) => set((s) => ({ alertOverrides: { ...s.alertOverrides, [id]: status } })),
};

export const profileRepository: ProfileRepository = {
  subscribe,
  settings: () => get().settings,
  update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  contacts: () => get().contacts,
  resetDemo: () => {
    const { role, onboarded } = get().settings;
    const fresh = createDemoState(new Date());
    set({ ...fresh, settings: { ...fresh.settings, role, onboarded } });
  },
  isReady: () => useAppStore.persist.hasHydrated(),
  subscribeReady: (listener) => useAppStore.persist.onFinishHydration(listener),
};
