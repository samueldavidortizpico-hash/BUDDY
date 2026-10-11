import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { BottomSheet } from '@/components/feedback';
import { Segmented, Stepper } from '@/components/forms';
import { Icon, type IconName } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { healthConnectProvider, healthKitProvider } from '@/domain/services';
import { strings } from '@/i18n';
import { spacing } from '@/theme';
import { useTheme } from '@/theme/provider';

const H = strings.health;

/** Reloj y monitoreo avanzado (Premium). Sin reloj conectado, todo vacío: nunca datos inventados. */
export default function Watch() {
  const t = useTheme();
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Platform.OS === 'web';
  const [platform, setPlatform] = useState<'apple' | 'android'>(Platform.OS === 'ios' ? 'apple' : 'android');
  const [info, setInfo] = useState<string | null>(null);
  const [pulse, setPulse] = useState({ min: 50, max: 110 });
  const [steps, setSteps] = useState(3000);
  const provider = platform === 'apple' ? healthKitProvider : healthConnectProvider;

  const connect = async () => {
    const r = await provider.getSteps(new Date().toISOString().slice(0, 10));
    setInfo(typeof r === 'number' ? null : r.reason);
  };

  const tiles: { icon: IconName; label: string }[] = [
    { icon: 'heart', label: H.pulse },
    { icon: 'walk', label: H.stepsLabel },
    { icon: 'drop', label: H.oxygen },
    { icon: 'moon', label: H.sleepWatch },
  ];

  return (
    <ScreenContainer header={<ScreenHeader title={H.watch} fallback="/health" />}>
      <View style={styles.stack}>
        <AppText variant="body" color={t.c.muted}>
          {H.watchBody}
        </AppText>
        {expoGo ? (
          <Card variant="tint" tone="lavender" style={styles.row}>
            <Icon name="info" color={t.ink.lavender} />
            <AppText variant="secondaryStrong" style={styles.flex}>
              {H.watchExpoGo}
            </AppText>
          </Card>
        ) : null}
        <AppText variant="secondaryStrong">{H.platform}</AppText>
        <Segmented label={H.platform} value={platform} onChange={setPlatform} options={[{ key: 'apple', label: H.apple }, { key: 'android', label: H.android }]} />
        <Button label={H.connect} icon="watch" onPress={connect} />
        <View style={styles.grid}>
          {tiles.map((tile) => (
            <Card key={tile.label} style={styles.tile}>
              <Icon name={tile.icon} color={t.c.muted} />
              <AppText variant="secondaryStrong">{tile.label}</AppText>
              <AppText variant="caption" color={t.c.muted}>
                {H.emptyWatch}
              </AppText>
            </Card>
          ))}
        </View>
        <AppText variant="h3">{H.ranges}</AppText>
        <Stepper label={`${H.pulse} mínimo`} value={pulse.min} min={30} max={pulse.max - 10} step={5} onChange={(min) => setPulse({ ...pulse, min })} />
        <Stepper label={`${H.pulse} máximo`} value={pulse.max} min={pulse.min + 10} max={180} step={5} onChange={(max) => setPulse({ ...pulse, max })} />
        <Stepper label={strings.routine.steps} value={steps} min={500} max={20000} step={500} onChange={setSteps} />
        <AppText variant="caption" color={t.c.muted}>
          {H.stepsNote}
        </AppText>
      </View>
      <BottomSheet visible={!!info} onClose={() => setInfo(null)} title={H.watch}>
        <AppText variant="body">{info}</AppText>
        <Button label={strings.common.understood} onPress={() => setInfo(null)} />
      </BottomSheet>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexGrow: 1, flexBasis: 140, gap: spacing.xxs },
});
