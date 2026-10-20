import { useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { ElderAccessForm } from '@/features/setup/access';
import { useDb } from '@/infrastructure/local/db';
import { strings } from '@/i18n';

/** Ajustes > Mis personas > Acceso: pantalla completa (antes una hoja que se cortaba con texto grande). */
export default function ElderAccess() {
  const { elderId } = useLocalSearchParams<{ elderId: string }>();
  const elder = useDb((s) => (elderId ? s.elders[elderId] : undefined));
  return (
    <ScreenContainer keyboard header={<ScreenHeader title={elder ? strings.setup.access.title(elder.firstName) : strings.setup.access.manage} fallback="/settings/people" />}>
      {elder ? <ElderAccessForm elder={elder} /> : null}
    </ScreenContainer>
  );
}
