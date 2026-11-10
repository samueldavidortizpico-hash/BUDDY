/**
 * Casos de uso de la ubicación. El administrador solo SOLICITA; aceptar, rechazar y revocar son exclusivos del adulto
 * mayor (matriz `can`). Al revocar se borran las ubicaciones guardadas. Solo se registran ubicaciones con
 * consentimiento vigente y se conservan las últimas KEEP_FIXES.
 */
import { KEEP_FIXES } from '@/domain/location';
import { can } from '@/domain/permissions';
import { db } from '@/infrastructure/local/db';

import { actor } from './actions';
import { elderAnswers } from './care';
import { actingRole, currentAuthorId, currentRole } from './session';

/**
 * Quién decide y por qué vía (SEC-04). El rol sale de la sesión o de la entrega del teléfono a ESA persona, nunca de un
 * argumento: un administrador sin entrega no puede aceptar por el adulto mayor. La decisión queda trazada.
 */
function decision(consent: 'granted' | 'denied' | 'revoked') {
  return {
    locationConsent: consent,
    locationDecidedAt: new Date().toISOString(),
    locationDecidedBy: currentAuthorId(),
    locationDecidedVia: currentRole() === 'elder' ? ('account' as const) : ('handoff' as const),
  };
}

export const locationActions = {
  request(elderId: string) {
    if (actingRole(elderId) !== 'caregiver') return null; // solo el administrador solicita
    return db.update('elders', elderId, { locationConsent: 'requested', locationRequestedAt: new Date().toISOString() }) ?? null;
  },
  /** Decisión del adulto mayor: con su cuenta o en el teléfono que su administrador le entregó. */
  decide(elderId: string, accept: boolean) {
    if (!can(actingRole(elderId), 'location_consent')) return null;
    const saved = db.update('elders', elderId, decision(accept ? 'granted' : 'denied'));
    if (!saved) return null;
    elderAnswers.permissionChanged(elderId, 'location', accept);
    return saved;
  },
  revoke(elderId: string) {
    if (!can(actingRole(elderId), 'location_consent')) return null;
    const elder = db.get('elders', elderId);
    if (!elder) return null;
    db.purge('locations', db.list('locations', elder.ownerUserId, elderId).map((f) => f.id));
    const saved = db.update('elders', elderId, decision('revoked'));
    elderAnswers.permissionChanged(elderId, 'location', false);
    return saved ?? null;
  },
  /** Guarda una ubicación real (solo con consentimiento vigente) y descarta las más viejas. */
  record(elderId: string, fix: { lat: number; lng: number; accuracy: number | null }) {
    const elder = db.get('elders', elderId);
    if (!elder || elder.locationConsent !== 'granted' || !can(actingRole(elderId), 'share_location')) return null;
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
