/**
 * Invitación familiar (V3.0, principio 9). PURO: el administrador invita a otro familiar a seguir a una persona con un
 * permiso: "ver" (ve el Inicio, las alertas y el registro) o "administrar" (además configura). Un código legible de 8
 * caracteres con vencimiento; se puede revocar.
 *
 * Hoy funciona en local (crear, compartir, listar, revocar y validar). Aceptarla desde OTRO celular exige el servidor:
 * `InviteRepository.accept` es el contrato de esa fase (la implementación local responde `needs_backend`).
 */
import type { Timestamp } from './types';

export type InviteRole = 'viewer' | 'admin';
export type InviteStatus = 'pending' | 'revoked' | 'accepted';

export interface Invite {
  code: string;
  elderId: string;
  role: InviteRole;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  status: InviteStatus;
  acceptedBy?: string | null;
}

export type InviteCheck = 'valid' | 'expired' | 'revoked' | 'used' | 'unknown';

export interface InviteRepository {
  create(input: { elderId: string; role: InviteRole }): Promise<Invite>;
  list(elderId: string): Invite[];
  revoke(code: string): void;
  /** Fase de backend: une la cuenta de quien acepta con la persona y su permiso. */
  accept(code: string, userId: string): Promise<{ ok: true; invite: Invite } | { ok: false; reason: InviteCheck | 'needs_backend' }>;
}

export const INVITE_DAYS = 7;
/** Sin letras ni números que se confunden al dictarlos (0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** "K7QM-4XRT" a partir de 8 bytes aleatorios. */
export function inviteCode(bytes: Uint8Array): string {
  const c = Array.from(bytes.slice(0, 8), (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${c.slice(0, 4)}-${c.slice(4, 8)}`;
}

/** Enlace con el esquema de la app (`scheme` de app.json). Abrirlo y aceptar desde otro celular llega con el servidor. */
export const inviteLink = (code: string) => `buddy://invitacion?codigo=${code}`;

/** Normaliza lo que escribe la persona ("k7qm 4xrt" → "K7QM-4XRT"). */
export function normalizeInviteCode(raw: string): string {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export function newInvite(input: { code: string; elderId: string; role: InviteRole; now: Date }): Invite {
  return {
    code: input.code,
    elderId: input.elderId,
    role: input.role,
    createdAt: input.now.toISOString(),
    expiresAt: new Date(input.now.getTime() + INVITE_DAYS * 86_400_000).toISOString(),
    status: 'pending',
    acceptedBy: null,
  };
}

export function checkInvite(invite: Invite | undefined, now: Date): InviteCheck {
  if (!invite) return 'unknown';
  if (invite.status === 'revoked') return 'revoked';
  if (invite.status === 'accepted') return 'used';
  return Date.parse(invite.expiresAt) <= now.getTime() ? 'expired' : 'valid';
}
