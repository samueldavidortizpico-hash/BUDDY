/**
 * Casos de uso de la ubicación. El administrador solo SOLICITA; aceptar, rechazar y revocar son exclusivos del adulto
 * mayor (matriz `can`). Al revocar se borran las ubicaciones guardadas. Solo se registran ubicaciones con
 * consentimiento vigente y se conservan las últimas KEEP_FIXES.
 */
import { KEEP_FIXES } from '@/domain/location';
import { can } from '@/domain/permissions';
import type { Role } from '@/domain/types';
import { db } from '@/infrastructure/local/db';

import { actor } from './actions';
import { elderAnswers } from './care';
import { currentRole } from './session';

export const locationActions = {
  request(elderId: string) {
    if (currentRole() !== 'caregiver') return null; // solo el administrador solicita
    return db.update('elders', elderId, { locationConsent: 'requested', locationRequestedAt: new Date().toISOString() });
  },
  /** Decisión del adulto mayor (su pantalla pasa `by: 'elder'`). */
  decide(elderId: string, accept: boolean, by: Role) {
    if (!can(by, 'location_consent')) return null;
    const saved = db.update('elders', elderId, { locationConsent: accept ? 'granted' : 'denied', locationDecidedAt: new Date().toISOString() });
    elderAnswers.permissionChanged(elderId, 'location', accept);
    return saved;
  },
  revoke(elderId: string, by: Role) {
    if (!can(by, 'location_consent')) return null;
    const elder = db.get('elders', elderId);
    if (elder) db.purge('locations', db.list('locations', elder.ownerUserId, elderId).map((f) => f.id));
    const saved = db.update('elders', elderId, { locationConsent: 'revoked', locationDecidedAt: new Date().toISOString() });
    elderAnswers.permissionChanged(elderId, 'location', false);
    return saved;
  },
  /** Guarda una ubicación real (solo con consentimiento vigente) y descarta las más viejas. */
  record(elderId: string, fix: { lat: number; lng: number; accuracy: number | null }, by: Role) {
    const elder = db.get('elders', elderId);
    if (!elder || elder.locationConsent !== 'granted' || !can(by, 'share_location')) return null;
    const previous = db.list('locations', elder.ownerUserId, elderId).sort((a, b) => b.at.localeCompare(a.at));
    // Sin duplicados: si hay una ubicación de hace menos de un minuto, no se guarda otra.
    if (previous[0] && Date.now() - new Date(previous[0].at).getTime() < 60_000) return previous[0];
    // Solo coordenadas y precisión (nada más del adaptador).
    const saved = db.insert('locations', { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, at: new Date().toISOString() }, actor(elderId));
    const all = [saved, ...previous];
    db.purge('locations', all.slice(KEEP_FIXES).map((f) => f.id));
    return saved;
  },
};
