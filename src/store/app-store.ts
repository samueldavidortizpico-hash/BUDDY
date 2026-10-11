/**
 * Estado global persistido en el dispositivo (AsyncStorage). Solo lo usan los repositorios en memoria
 * (src/repositories/in-memory.ts); pantallas, hooks y casos de uso no lo importan directamente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createDemoState, type AppData } from './demo-state';

export type { AppData };

export const useAppStore = create<AppData>()(
  persist(() => createDemoState(new Date()), {
    name: 'buddy-store-v1',
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
  }),
);
