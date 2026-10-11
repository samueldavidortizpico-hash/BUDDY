/** DATOS FICTICIOS DE DEMOSTRACIÓN — usuaria y contactos inventados. Los números no se marcan nunca. */
import type { Contact, Settings } from '@/types/domain';

export const DEMO_PROFILE = {
  fullName: 'Carmen García',
  initials: 'CG',
  memberSince: 'Usuaria de demostración',
} as const;

export const DEMO_CONTACTS: Contact[] = [
  { id: 'demo-contact-1', name: 'Laura García', relation: 'Hija', phone: '300 000 0001', demo: true },
  { id: 'demo-contact-2', name: 'Miguel López', relation: 'Cuidador', phone: '300 000 0002', demo: true },
];

export function createDemoSettings(now: Date): Settings {
  return {
    role: null,
    onboarded: false,
    userName: 'Carmen',
    textScale: 'normal',
    notifications: { reminders: true, caregiverAlerts: true, hideNameOnLockScreen: true },
    locationSharing: { enabled: true, updatedAt: new Date(now.getTime() - 8 * 60_000).toISOString() },
  };
}
