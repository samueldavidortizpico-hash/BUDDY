import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Segmented } from '@/components/forms';
import { Icon } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { EmptyState } from '@/components/states';
import { FeedCard } from '@/features/feed/feed-card';
import { strings } from '@/i18n';
import { alertActions } from '@/state/care';
import { useRecords } from '@/state/data';
import { feedActions, useFeed } from '@/state/feed';
import { spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';
import { formatAgo } from '@/utils/dates';

const F = strings.feed;
type Tab = 'all' | 'alert' | 'recommendation' | 'attended';

/**
 * Novedades de BUDDY: feed unificado de alertas (algo que requiere acción ahora) y recomendaciones (patrones y
 * observaciones), por prioridad. Abrir el feed marca como leído lo que se ve.
 */
export default function Alerts() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles();
  const [tab, setTab] = useState<Tab>('all');
  const { items } = useFeed();
  const attended = useRecords('alerts')
    .filter((a) => a.status === 'attended')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20);

  useEffect(() => {
    if (items.length) feedActions.markRead(items);
  }, [items]);

  const list = tab === 'all' ? items : items.filter((f) => f.kind === tab);

  return (
    <ScreenContainer
      header={<ScreenHeader title={F.title} fallback="/summary" right={<IconButton icon="sparkle" label={strings.brand.name} showLabel={false} onPress={() => router.push('/buddy' as Href)} />} />}
    >
      <Segmented
        scroll
        label={F.title}
        value={tab}
        onChange={setTab}
        options={[
          { key: 'all', label: F.all },
          { key: 'alert', label: F.alerts },
          { key: 'recommendation', label: F.recommendations },
          { key: 'attended', label: F.attended },
        ]}
      />
      <View style={s.list}>
        {tab === 'attended' ? (
          attended.length ? (
            attended.map((a) => (
              <Card key={a.id} style={s.done}>
                <Icon name="check" color={t.ink.mint} />
                <View style={s.flex}>
                  <AppText variant="secondaryStrong">{a.title}</AppText>
                  <AppText variant="caption" color={t.c.muted}>
                    {formatAgo(new Date(a.updatedAt), new Date())}
                  </AppText>
                </View>
                <Button label={strings.common.undo} size="sm" variant="ghost" onPress={() => alertActions.reopen(a.id)} />
              </Card>
            ))
          ) : (
            <EmptyState title={F.empty} text={F.emptyBody} mood="happy" />
          )
        ) : list.length ? (
          list.map((f, i) => <FeedCard key={f.key} item={f} index={i} />)
        ) : (
          <EmptyState title={F.empty} text={F.emptyBody} mood="happy" />
        )}
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles(() =>
  StyleSheet.create({
    flex: { flex: 1 },
    list: { gap: spacing.md, marginTop: spacing.md },
    done: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  }),
);
