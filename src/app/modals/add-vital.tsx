import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Notice } from '@/components/blocks';
import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { useToast } from '@/components/feedback';
import { Field } from '@/components/field';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { formatVitalValue, validateVital, VITAL_TYPES, vitalActions, VITALS } from '@/features/vitals/hooks';
import type { VitalType } from '@/types/domain';
import { spacing } from '@/theme';
import { successHaptic, warningHaptic } from '@/utils/haptics';

export default function AddVital() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ type?: string }>();
  const initial = VITAL_TYPES.includes(params.type as VitalType) ? (params.type as VitalType) : 'bloodPressure';
  const [type, setType] = useState<VitalType>(initial);
  const [value, setValue] = useState('');
  const [secondary, setSecondary] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const meta = VITALS[type];
  const errors = submitted ? validateVital({ type, value, secondary }) : {};
  const close = () => (router.canGoBack() ? router.back() : router.replace('/health'));

  const save = () => {
    setSubmitted(true);
    const r = vitalActions.add({ type, value, secondary });
    if (!r.ok) {
      warningHaptic();
      return;
    }
    successHaptic();
    toast({ message: `${meta.label}: ${formatVitalValue(r.entry)} ${meta.unit} registrado manualmente.`, icon: 'check' });
    close();
  };

  return (
    <ScreenContainer keyboard header={<ScreenHeader title="Nuevo registro" backLabel="Cancelar" onBack={close} />}>
      <View style={styles.stack}>
        <Notice text="Registro manual: escribe el valor tal como lo mediste. BUDDY no interpreta los resultados ni se conecta a dispositivos." />
        <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="Tipo de registro">
          <AppText variant="captionStrong">Tipo de registro</AppText>
          <View style={styles.chips}>
            {VITAL_TYPES.map((t) => (
              <Chip
                key={t}
                label={VITALS[t].label}
                selected={type === t}
                onPress={() => {
                  setType(t);
                  setValue('');
                  setSecondary('');
                  setSubmitted(false);
                }}
              />
            ))}
          </View>
        </View>

        {meta.secondaryRange ? (
          <>
            <Field label="Sistólica (número de arriba)" placeholder="Ej.: 120" keyboardType="number-pad" value={value} onChangeText={setValue} error={errors.value} hint="mmHg" />
            <Field label="Diastólica (número de abajo)" placeholder="Ej.: 80" keyboardType="number-pad" value={secondary} onChangeText={setSecondary} error={errors.secondary} hint="mmHg" />
          </>
        ) : (
          <Field
            label={`${meta.label} (${meta.unit})`}
            placeholder={meta.decimals ? 'Ej.: 36,5' : 'Ej.: 95'}
            keyboardType={meta.decimals ? 'decimal-pad' : 'number-pad'}
            value={value}
            onChangeText={setValue}
            error={errors.value}
          />
        )}

        <Button label="Guardar registro" icon="check" onPress={save} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg, paddingTop: spacing.xs },
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
