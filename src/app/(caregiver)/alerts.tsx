import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Segmented } from '@/components/forms';
import { Icon } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/states';
import { strings } from '@/i18n';
import { useNow } from '@/hooks/use-now';
import { alertActions } from '@/state/care';
import { useElders, useRecords } from '@/state/data';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatAgo } from '@/utils/dates';

const A = strings.alertsScreen;
const MED_KINDS = ['stock_low', 'stock_out', 'allergy_match', 'duplicate_ingredient', 'schedule_overlap', 'dose_unconfirmed'];

/** Avisos de todas las personas de la cuenta. Ámbar para seguimiento; rojo solo cuando pidió ayuda. */
export default function Alerts() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const [tab, setTab] = useState<'pending' | 'attended'>('pending');
  const [open, setOpen] = useState<string | null>(null);
  const elders = useElders();
  const all = useRecords('alerts', { scope: 'account' }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const contacts = useRecords('contacts', { scope: 'account' });
  const now = useNow().getTime();
  const list = all.filter((a) => a.status === tab && (tab === 'attended' || !a.snoozedUntil || Date.parse(a.snoozedUntil) < now));

  return (
    <ScreenContainer header={<ScreenHeader title={A.title} fallback="/summary" />}>
      <Segmented label={A.title} value={tab} onChange={setTab} options={[{ key: 'pending', label: A.pending }, { key: 'attended', label: A.attended }]} />
      <View style={s.list}>
        {list.length ? (
          list.map((a) => {
            const urgent = a.kind === 'help_requested';
            const elder = elders.find((e) => e.id === a.elderId);
            const primary = contacts.find((c) => c.elderId === a.elderId && c.primary);
            const medId = MED_KINDS.includes(a.kind) && a.refId && !a.refId.startsWith('help') ? (a.kind === 'dose_unconfirmed' ? null : a.refId) : null;
            return (
              <Card key={a.id} variant="tint" tone={urgent ? 'red' : 'yellow'} style={s.card}>
                <View style={s.head}>
                  <Icon name={urgent ? 'shield' : 'warning'} color={urgent ? t.ink.danger : t.ink.yellow} />
                  <View style={s.flex}>
                    <AppText variant="bodyStrong">{a.title}</AppText>
                    <AppText variant="caption" color={t.c.muted}>{`${elder?.firstName ?? ''} · ${formatAgo(new Date(a.createdAt), new Date())}`}</AppText>
                  </View>
                </View>
                <AppText variant="secondary">{a.detail}</AppText>
                {open === a.id ? (
                  <View style={s.advice}>
                    <AppText variant="secondary">{A.advice[a.kind]}</AppText>
                  </View>
                ) : null}
                <View style={s.actions}>
                  {urgent || a.kind === 'dose_unconfirmed' || a.kind === 'checkin_unwell' ? (
                    <Button label={A.call} icon="phone" size="sm" variant={urgent ? 'danger' : 'tonal'} tone="yellow" onPress={() => Linking.openURL(primary ? `tel:${primary.phone.replace(/\s/g, '')}` : 'tel:123')} />
                  ) : null}
                  {medId ? <Button label={a.kind.startsWith('stock') ? A.purchase : A.viewMed} size="sm" variant="ghost" onPress={() => router.push({ pathname: '/medication/[id]', params: { id: medId } })} /> : null}
                  <Button label={A.whatToDo} size="sm" variant="ghost" onPress={() => setOpen(open === a.id ? null : a.id)} />
                  {a.status === 'pending' ? (
                    <>
                      <Button label={A.attend} icon="check" size="sm" variant="ghost" onPress={() => alertActions.attend(a.id)} />
                      {a.kind.startsWith('stock') ? <Button label={A.snooze} size="sm" variant="ghost" onPress={() => alertActions.snooze(a.id)} /> : null}
                    </>
                  ) : (
                    <Button label={strings.common.undo} size="sm" variant="ghost" onPress={() => alertActions.reopen(a.id)} />
                  )}
                </View>
              </Card>
            );
          })
        ) : (
          <EmptyState title={A.empty} text={A.emptyBody} mood="celebrate" />
        )}
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    list: { gap: spacing.md, marginTop: spacing.md },
    card: { gap: spacing.sm },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    advice: { padding: spacing.md, borderRadius: radius.md, backgroundColor: t.c.surface, ...t.hairline },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  }),
);
