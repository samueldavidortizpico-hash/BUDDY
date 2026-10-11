import type { ProfileRepository } from '@/repositories/contracts';
import type { Role, Settings } from '@/types/domain';
import type { TextScale } from '@/theme';

export const TEXT_SCALE_OPTIONS: { key: TextScale; label: string }[] = [
  { key: 'normal', label: 'Normal' },
  { key: 'large', label: 'Grande' },
  { key: 'xlarge', label: 'Muy grande' },
];

export function chooseRole(repo: ProfileRepository, role: Role): void {
  repo.update({ role, onboarded: true });
}

export function signOut(repo: ProfileRepository): void {
  repo.update({ role: null });
}

export function setTextScale(repo: ProfileRepository, textScale: TextScale): void {
  repo.update({ textScale });
}

export type NotificationKey = keyof Settings['notifications'];

export function toggleNotification(repo: ProfileRepository, key: NotificationKey): boolean {
  const current = repo.settings().notifications;
  const value = !current[key];
  repo.update({ notifications: { ...current, [key]: value } });
  return value;
}

/** Restablece todos los datos locales a los de demostración (no hay datos remotos). */
export function resetDemoData(repo: ProfileRepository): void {
  repo.resetDemo();
}
