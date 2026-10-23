import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { TimeWheelPicker } from '@/components/time-picker';
import type { Reminder } from '@/domain/types';
import { useRecords } from '@/state/data';
import { automationActions } from '@/state/automations';
import { describeDays } from '@/domain/time';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';
import { formatClock } from '@/utils/dates';

export default function AutomationsScreen() {
  const t = useTheme();
  const records = useRecords('reminders').filter((r) => !!r.automation);
  const [editing, setEditing] = useState<Reminder | null>(null);
  return (
    <ScreenContainer header={<ScreenHeader title="Automatizaciones" fallback="/routine" />}>
      <AppText variant="secondary" color={t.c.muted}>Preguntas y recordatorios que BUDDY programa en el celular de la persona.</AppText>
      {!records.length ? <AppText variant="body" color={t.c.muted}>Aún no hay automatizaciones. Puedes pedirlas en el chat de BUDDY.</AppText> : null}
      {records.map((r) => (
        <Card key={r.id} style={s.card}>
          <AppText variant="h3" numberOfLines={2}>{r.title}</AppText>
          <AppText variant="secondary" color={t.c.muted}>{formatClock(r.time)} · {describeDays(r.days)} · {r.automation?.enabled ? 'Activa' : 'Pausada'}</AppText>
          <View style={s.actions}>
            <Button size="sm" variant="tonal" label="Editar hora" onPress={() => setEditing(r)} />
            <Button size="sm" variant="ghost" label={r.automation?.enabled ? 'Pausar' : 'Reanudar'} onPress={() => automationActions.setEnabled(r.automation!.kind, !r.automation!.enabled, r.id)} />
            <Button size="sm" variant="ghost" label="Borrar" onPress={() => Alert.alert('Borrar automatización', `¿Quieres borrar “${r.title}”?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Borrar', style: 'destructive', onPress: () => automationActions.remove(r.id) }])} />
          </View>
        </Card>
      ))}
      <TimeWheelPicker visible={!!editing} title="Editar hora" value={editing?.time ?? '08:00'} onClose={() => setEditing(null)} onConfirm={(time) => { if (editing?.automation) automationActions.setTime(editing.automation.kind, time, editing.id); setEditing(null); }} />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({ card: { gap: spacing.sm }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs } });
