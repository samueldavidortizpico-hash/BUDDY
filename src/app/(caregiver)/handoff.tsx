import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { useActiveElder } from '@/state/data';
import { handoffActions } from '@/state/handoff';
import { spacing } from '@/theme';

/** The legacy route now leads to the common read-only view and account switch. */
export default function Handoff() {
  const router = useRouter();
  const elder = useActiveElder();
  return <ScreenContainer header={<ScreenHeader title="Pantalla del adulto mayor" fallback="/routine" />}>
    <View style={{ gap: spacing.md }}>
      <AppText>La vista no cambia respuestas, permisos ni avisos.</AppText>
      <Button label={`Vista de ${elder?.firstName ?? 'tu persona'}`} icon="eye" disabled={!elder} onPress={() => router.push('/preview')} />
      <Button label={`Cambiar a la cuenta de ${elder?.firstName ?? 'tu persona'}`} variant="ghost" disabled={!elder} onPress={() => router.push('/account-switch' as Href)} />
      {__DEV__ && elder ? <Button label={`Probar como ${elder.firstName}`} variant="ghost" onPress={() => { handoffActions.startTest(elder.id); router.replace('/elder'); }} /> : null}
    </View>
  </ScreenContainer>;
}
