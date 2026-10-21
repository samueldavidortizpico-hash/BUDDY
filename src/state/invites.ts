/**
 * InviteRepository local (V3.0): las invitaciones se guardan en la base local de la cuenta dueña (borrador `invites`).
 * Crear, listar, revocar y validar funcionan sin servidor; aceptar desde otro celular responde `needs_backend`.
 */
import * as Crypto from 'expo-crypto';

import { checkInvite, inviteCode, newInvite, normalizeInviteCode, type Invite, type InviteRepository } from '@/domain/invites';
import { db } from '@/infrastructure/local/db';

import { currentUserId } from './session';

const KEY = 'invites';
const all = () => db.draft<Invite[]>(currentUserId(), KEY) ?? [];
const save = (list: Invite[]) => db.setDraft(currentUserId(), KEY, list);

export const invites: InviteRepository & { key: string } = {
  key: KEY,
  async create({ elderId, role }) {
    const taken = new Set(all().map((i) => i.code));
    let code = inviteCode(await Crypto.getRandomBytesAsync(8));
    while (taken.has(code)) code = inviteCode(await Crypto.getRandomBytesAsync(8));
    const invite = newInvite({ code, elderId, role, now: new Date() });
    save([...all(), invite]);
    return invite;
  },
  list: (elderId) => all().filter((i) => i.elderId === elderId),
  revoke(code) {
    save(all().map((i) => (i.code === code ? { ...i, status: 'revoked' as const } : i)));
  },
  async accept(code) {
    const check = checkInvite(all().find((i) => i.code === normalizeInviteCode(code)), new Date());
    // Sin servidor no se puede unir otra cuenta a esta persona: se dice, no se simula.
    return { ok: false, reason: check === 'valid' ? 'needs_backend' : check };
  },
};
