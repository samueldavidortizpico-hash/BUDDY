import * as Clipboard from 'expo-clipboard';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ConfirmDialog, useToast } from '@/components/feedback';
import { Segmented } from '@/components/forms';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { PlusLock } from '@/components/plus-lock';
import { checkInvite, inviteLink as link, type Invite, type InviteRole } from '@/domain/invites';
import { useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';
import { useActiveElder, useUserId } from '@/state/data';
import { useIsPlus } from '@/state/entitlements';
import { invites } from '@/state/invites';
import { spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const I = strings.invite;
const NONE: Invite[] = [];

/**
 * Invitar a un familiar (V3.0): código o enlace con permiso "ver" o "administrar", válido 7 días y revocable. Funciona en
 * local; aceptarlo desde otro celular llegará con el servidor (se dice en la pantalla).
 */
export default function InviteScreen() {
  const t = useTheme();
  const router = useRouter();
  const s = useStyles();
  const toast = useToast();
  const elder = useActiveElder();
  const userId = useUserId() ?? '';
  const list = useDb((x) => x.drafts[userId]?.[invites.key] as Invite[] | undefined) ?? NONE;
  const isPlus = useIsPlus();
  const [role, setRole] = useState<InviteRole>('viewer');
  const [created, setCreated] = useState<Invite | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  if (!elder) return null;
  const mine = list.filter((i) => i.elderId === elder.id).reverse();

  return (
    <ScreenContainer header={<ScreenHeader title={I.title} fallback="/settings/people" />}>
      <View style={s.stack}>
        <AppText variant="body" color={t.c.muted}>{I.body(elder.firstName)}</AppText>
        <Segmented label={I.roleLabel} value={role} onChange={setRole} options={[{ key: 'viewer', label: I.roles.viewer }, { key: 'admin', label: I.roles.admin }]} />
        <AppText variant="caption" color={t.c.muted}>{I.roleHint[role]}</AppText>
        {role === 'admin' && !isPlus ? <PlusLock label="Agregar otro cuidador · Disponible en BUDDY Plus" /> : null}
        <Button
          label={I.create}
          icon="users"
          haptic
          onPress={async () => {
            if (role === 'admin' && !isPlus) { router.push('/plus' as Href); return; }
            setCreated(await invites.create({ elderId: elder.id, role }));
          }}
        />

        {created ? (
          <Card variant="tint" tone="mint" style={s.stack}>
            <AppText variant="captionStrong" color={t.c.muted}>{I.codeFor(I.roles[created.role])}</AppText>
            <AppText variant="heroL" selectable accessibilityLabel={created.code.split('').join(' ')}>{created.code}</AppText>
            <AppText variant="caption" color={t.c.muted} selectable>{link(created.code)}</AppText>
            <Button label={I.share} icon="send" variant="tonal" tone="mint" onPress={() => Share.share({ message: I.shareText(elder.firstName, created.code, link(created.code)) }).catch(() => undefined)} />
            <Button
              label={I.copy}
              icon="copy"
              variant="ghost"
              size="md"
              onPress={async () => {
                await Clipboard.setStringAsync(created.code);
                toast({ message: strings.setup.access.copied, icon: 'check' });
              }}
            />
          </Card>
        ) : null}

        {mine.length ? <AppText variant="h3">{I.listTitle}</AppText> : null}
        {mine.map((inv) => {
          const st = checkInvite(inv, new Date());
          return (
            <Card key={inv.code} style={s.row}>
              <View style={s.flex}>
                <AppText variant="bodyStrong">{inv.code}</AppText>
                <AppText variant="caption" color={t.c.muted}>{`${I.roles[inv.role]} · ${I.status[st]}`}</AppText>
              </View>
              {st === 'valid' ? <Button label={I.revoke} size="sm" variant="ghost" onPress={() => setRevoking(inv.code)} /> : null}
            </Card>
          );
        })}

        <AppText variant="caption" color={t.c.muted}>{I.backendNote}</AppText>
      </View>

      <ConfirmDialog
        visible={!!revoking}
        title={I.revokeTitle}
        body={I.revokeBody}
        confirmLabel={I.revoke}
        cancelLabel={strings.common.cancel}
        destructive
        onConfirm={() => {
          if (revoking) invites.revoke(revoking);
          if (created?.code === revoking) setCreated(null);
          setRevoking(null);
        }}
        onCancel={() => setRevoking(null)}
      />
    </ScreenContainer>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    stack: { gap: spacing.md },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  }),
);
