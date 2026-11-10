import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Appear } from '@/components/appear';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/forms';
import { IconTile } from '@/components/icon-tile';
import { LockedPreview } from '@/components/plus-lock';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { addNote, nextShift, shiftFor, type FamilyNote, type Shifts } from '@/domain/family';
import type { Invite } from '@/domain/invites';
import { db, useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { useActiveElder, useUserId } from '@/state/data';
import { useHasFeature } from '@/state/entitlements';
import { invites } from '@/state/invites';
import { sessionActions, useSession } from '@/state/session';
import { motion, radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { DAY_INITIALS, DAYS, formatAgo, toISODate } from '@/utils/dates';
import { tapHaptic } from '@/utils/haptics';

const F = strings.family;
const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;
const NO_INVITES: Invite[] = [];

/**
 * Familia (V4.3, plan Familiar): vista de familia con quién acompaña hoy, integrantes con su rol, turnos de cuidado por
 * día y notas compartidas. Hoy vive en este teléfono; compartirlo entre celulares llega con el servidor.
 */
export default function Family() {
  const allowed = useHasFeature('family_view');
  return (
    <ScreenContainer header={<ScreenHeader title={F.title} fallback="/settings" />}>
      {allowed ? (
        <FamilyView />
      ) : (
        <LockedPreview feature="family_view" title={F.lockedTitle} body={F.lockedBody}>
          <FamilyPreview />
        </LockedPreview>
      )}
    </ScreenContainer>
  );
}

function FamilyView() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const elder = useActiveElder();
  const owner = useUserId() ?? '';
  const me = useSession((x) => x.user?.name.split(' ')[0] ?? '');
  const shiftsKey = `family.shifts.${elder?.id ?? ''}`;
  const notesKey = `family.notes.${elder?.id ?? ''}`;
  const shifts = (useDb((x) => x.drafts[owner]?.[shiftsKey]) as Shifts | undefined) ?? {};
  const notes = (useDb((x) => x.drafts[owner]?.[notesKey]) as FamilyNote[] | undefined) ?? [];
  const inviteList = (useDb((x) => x.drafts[owner]?.[invites.key]) as Invite[] | undefined) ?? NO_INVITES;
  const [nurse, setNurse] = useState<string | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!elder) return;
    let alive = true;
    void sessionActions.nurseAccess(elder.id).then((a) => alive && setNurse(a && !a.revoked ? a.email : null)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [elder]);

  const members = useMemo(() => {
    const list: { name: string; role: string; icon: 'user' | 'plus' | 'users' | 'heart' }[] = [{ name: me, role: F.roles.admin, icon: 'user' }];
    if (nurse) list.push({ name: nurse, role: F.roles.nurse, icon: 'plus' });
    inviteList
      .filter((i) => i.elderId === elder?.id && i.status !== 'revoked')
      .forEach((i) => list.push({ name: i.code, role: `${strings.invite.roles[i.role]} · ${i.status === 'accepted' ? F.accepted : F.pending}`, icon: 'users' }));
    return list;
  }, [me, nurse, inviteList, elder?.id]);
  const shiftNames = useMemo(() => [me, ...(nurse ? [nurse.split('@')[0]] : [])], [me, nurse]);

  if (!elder) return null;
  const today = shiftFor(shifts, toISODate(new Date()));

  return (
    <View style={s.sections}>
      <Appear index={0}>
        <Card radius={radius.cardLg} style={s.hero}>
          <IconTile icon="users" domain="contact" size={56} />
          <View style={s.flex}>
            <AppText variant="caption" color={t.c.muted}>{F.todayLabel}</AppText>
            <AppText variant="h2">{today ? F.todayWith(today, elder.firstName) : F.todayNobody}</AppText>
            <AppText variant="secondary" color={t.c.muted}>{F.membersCount(members.length)}</AppText>
          </View>
        </Card>
      </Appear>

      <Appear index={1} style={s.stack}>
        <AppText variant="h2">{F.membersTitle}</AppText>
        <Card padding={0} style={s.list}>
          {members.map((m, i) => (
            <View key={`${m.name}-${i}`} style={[s.row, i > 0 && s.divider]}>
              <IconTile icon={m.icon} domain={m.icon === 'plus' ? 'water' : 'contact'} size={40} />
              <View style={s.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>{m.name}</AppText>
                <AppText variant="caption" color={t.c.muted}>{m.role}</AppText>
              </View>
            </View>
          ))}
        </Card>
        <Button label={F.invite} icon="users" variant="secondary" onPress={() => router.push('/settings/invite' as Href)} />
      </Appear>

      <Appear index={2} style={s.stack}>
        <AppText variant="h2">{F.shiftsTitle}</AppText>
        <AppText variant="secondary" color={t.c.muted}>{F.shiftsHint}</AppText>
        <View style={s.week}>
          {WEEK.map((d) => {
            const who = shifts[d];
            return (
              <PressableScale
                key={d}
                scaleTo={motion.pressScaleCard}
                dim={0.04}
                onPress={() => {
                  tapHaptic();
                  db.setDraft(owner, shiftsKey, { ...shifts, [d]: nextShift(who, shiftNames) });
                }}
                accessibilityLabel={`${DAYS[d]}: ${who ?? F.noShift}`}
                style={[s.day, who ? s.dayOn : null]}
              >
                <AppText variant="captionStrong" color={t.c.muted}>{DAY_INITIALS[d]}</AppText>
                <AppText variant="caption" numberOfLines={1} align="center">{who ?? '—'}</AppText>
              </PressableScale>
            );
          })}
        </View>
      </Appear>

      <Appear index={3} style={s.stack}>
        <AppText variant="h2">{F.notesTitle}</AppText>
        <Field label={F.notePlaceholder} value={text} onChangeText={setText} multiline maxLength={500} />
        <Button
          label={F.addNote}
          icon="plus"
          variant="secondary"
          disabled={!text.trim()}
          onPress={() => {
            db.setDraft(owner, notesKey, addNote(notes, { id: `${Date.now()}`, text, author: me, now: new Date() }));
            setText('');
          }}
        />
        {notes.length ? (
          notes.map((n) => (
            <Card key={n.id} style={s.note}>
              <AppText variant="body">{n.text}</AppText>
              <AppText variant="caption" color={t.c.muted}>{`${n.author} · ${formatAgo(new Date(n.at), new Date())}`}</AppText>
            </Card>
          ))
        ) : (
          <AppText variant="secondary" color={t.c.muted}>{F.noNotes}</AppText>
        )}
      </Appear>
      <AppText variant="caption" color={t.c.muted}>{F.localNote}</AppText>
    </View>
  );
}

/** Vista previa de ejemplo detrás del candado (sin datos reales). */
function FamilyPreview() {
  const s = useStyles();
  return (
    <View style={s.sections}>
      <Card radius={radius.cardLg} style={s.hero}>
        <IconTile icon="users" domain="contact" size={56} />
        <View style={s.flex}>
          <AppText variant="h2">{F.previewToday}</AppText>
        </View>
      </Card>
      <View style={s.week}>
        {WEEK.map((d) => (
          <View key={d} style={[s.day, d % 2 ? s.dayOn : null]}>
            <AppText variant="captionStrong">{DAY_INITIALS[d]}</AppText>
          </View>
        ))}
      </View>
      <Card>
        <AppText variant="body">{F.previewNote}</AppText>
      </Card>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1, minWidth: 0 },
    sections: { gap: spacing.section, paddingVertical: spacing.xs },
    stack: { gap: spacing.sm },
    hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    list: { overflow: 'hidden', borderRadius: radius.card },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    divider: { borderTopWidth: t.borderWidth, borderTopColor: t.c.border },
    week: { flexDirection: 'row', gap: 6 },
    day: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2, borderRadius: radius.sm, backgroundColor: t.c.surface, overflow: 'hidden', ...t.hairline },
    dayOn: { backgroundColor: t.tones.mint.bg, borderColor: t.hc ? t.c.text : t.domains.contact.accent },
    note: { gap: spacing.xs },
  }),
);
