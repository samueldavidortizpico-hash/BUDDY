import { useRepositoryValue } from '@/hooks/use-repository';
import { profileRepository as repo } from '@/repositories/in-memory';
import { textScales, type TextScale } from '@/theme';
import type { Role } from '@/types/domain';

import { chooseRole, resetDemoData, setTextScale, signOut, toggleNotification, type NotificationKey } from './use-cases';

export { DEMO_PROFILE } from './demo-data';
export { TEXT_SCALE_OPTIONS, type NotificationKey } from './use-cases';

const readTextScale = () => textScales[repo.settings().textScale];

export function useSettings() {
  return useRepositoryValue(repo, repo.settings);
}

/** Multiplicador de texto elegido en Accesibilidad (se suma a la escala del sistema). */
export function useTextScale(): number {
  return useRepositoryValue(repo, readTextScale);
}

export function useContacts() {
  return useRepositoryValue(repo, repo.contacts);
}

export function useStorageReady(): boolean {
  return useRepositoryValue({ subscribe: repo.subscribeReady }, repo.isReady);
}

export const profileActions = {
  chooseRole: (role: Role) => chooseRole(repo, role),
  signOut: () => signOut(repo),
  setTextScale: (scale: TextScale) => setTextScale(repo, scale),
  toggleNotification: (key: NotificationKey) => toggleNotification(repo, key),
  resetDemoData: () => resetDemoData(repo),
};
