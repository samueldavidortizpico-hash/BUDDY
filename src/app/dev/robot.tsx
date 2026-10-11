/** Solo desarrollo: compara el robot vectorial con la referencia de marca y muestra todos sus estados. */
import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { RobotArt, type RobotMood } from '@/components/robot';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { spacing } from '@/theme';

const MOODS: RobotMood[] = ['idle', 'wave', 'think', 'talk', 'celebrate', 'worry', 'look', 'cover', 'sleep'];

export default function RobotLab() {
  const { still } = useLocalSearchParams<{ still?: string }>();
  if (!__DEV__) return <Redirect href="/" />;
  const animated = still !== '1';
  return (
    <ScreenContainer header={<ScreenHeader title="Robot (desarrollo)" />}>
      <View style={styles.row}>
        <Image source={require('../../../assets/images/splash-icon.png')} style={styles.ref} contentFit="cover" />
        <View style={styles.cell}>
          <RobotArt size={160} mood="idle" look={0} animated={animated} />
        </View>
      </View>
      <View style={styles.grid}>
        {MOODS.map((m) => (
          <View key={m} style={styles.mood}>
            <RobotArt size={96} mood={m} look={m === 'look' ? -1 : 0} animated={animated} />
            <AppText variant="caption">{m}</AppText>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', justifyContent: 'center' },
  ref: { width: 160, height: 160 },
  cell: { width: 160, height: 170, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg, justifyContent: 'center' },
  mood: { alignItems: 'center', gap: spacing.xxs, width: 100 },
});
