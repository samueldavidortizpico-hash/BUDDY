import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field, Segmented } from '@/components/forms';
import { Icon } from '@/components/icon';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenHeader } from '@/components/screen-header';
import { FOOD_RULES, NUTRIENT_LABEL, evaluateFood, type FoodInput, type FoodResult } from '@/domain/food';
import { strings } from '@/i18n';
import { useActiveElder } from '@/state/data';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const F = strings.food;
/** "12,5" o "12.5" → 12.5; vacío → null. */
const toNum = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : null);

/** Selector con su pregunta VISIBLE (Segmented solo la expone al lector de pantalla). */
function Choice<T extends string>(p: { label: string; value: T; onChange: (v: T) => void; options: { key: T; label: string }[] }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="secondaryStrong">{p.label}</AppText>
      <Segmented {...p} />
    </View>
  );
}

/**
 * Analizar un alimento: el cuidador escribe la tabla nutricional y BUDDY la compara con la norma de etiquetado frontal
 * (evaluador determinista `src/domain/food.ts`). La lectura de la foto de la tabla llega en la Fase 6 ("Pronto").
 */
export default function FoodAnalysis() {
  const t = useTheme();
  const s = useStyles();
  const elder = useActiveElder();
  const [packaged, setPackaged] = useState<'yes' | 'no'>('yes');
  const [state, setState] = useState<FoodInput['state']>('solid');
  const [basis, setBasis] = useState<FoodInput['basis']>('per100');
  const [added, setAdded] = useState<FoodInput['added']>('unknown');
  const [v, setV] = useState({ name: '', portion: '', kcal: '', sodium: '', sugars: '', sat: '', trans: '' });
  const [result, setResult] = useState<FoodResult | null>(null);
  const unit = state === 'solid' ? 'g' : 'ml';
  const set = (k: keyof typeof v) => (text: string) => setV((x) => ({ ...x, [k]: text }));
  const num = { keyboardType: 'decimal-pad' as const, inputMode: 'decimal' as const };

  const evaluate = () =>
    setResult(
      evaluateFood(
        {
          name: v.name,
          packaged: packaged === 'yes',
          state,
          basis,
          portionSize: toNum(v.portion),
          energyKcal: toNum(v.kcal),
          sodiumMg: toNum(v.sodium),
          freeSugarsG: toNum(v.sugars),
          satFatG: toNum(v.sat),
          transFatG: toNum(v.trans),
          added,
        },
        elder?.dietRestrictions ?? [],
      ),
    );

  return (
    <ScreenContainer header={<ScreenHeader title={F.title} fallback="/routine" />}>
      <View style={s.stack}>
        <AppText variant="secondary" color={t.c.muted}>{F.intro}</AppText>
        <View style={s.soon} accessible accessibilityLabel={`${F.photo}: ${F.soon}`}>
          <Icon name="camera" color={t.c.muted} size={18} />
          <AppText variant="captionStrong" color={t.c.muted} style={s.flex}>{F.photo}</AppText>
          <AppText variant="captionStrong" color={t.ink.mint}>{F.soon}</AppText>
        </View>
        <Field label={F.name} value={v.name} onChangeText={set('name')} optional />
        <Choice label={F.packaged} value={packaged} onChange={setPackaged} options={[{ key: 'yes', label: F.yes }, { key: 'no', label: F.no }]} />
        {packaged === 'yes' ? (
          <>
            <Choice label={F.state} value={state} onChange={setState} options={[{ key: 'solid', label: F.solid }, { key: 'liquid', label: F.liquid }]} />
            <Choice label={F.basis} value={basis} onChange={setBasis} options={[{ key: 'per100', label: F.per100(unit) }, { key: 'portion', label: F.portion }]} />
            {basis === 'portion' ? <Field label={F.portionSize(unit)} value={v.portion} onChangeText={set('portion')} {...num} /> : null}
            <Field label={F.energy} value={v.kcal} onChangeText={set('kcal')} {...num} />
            <Field label={F.sodium} value={v.sodium} onChangeText={set('sodium')} {...num} />
            <Field label={F.sugars} hint={F.sugarsHint} value={v.sugars} onChangeText={set('sugars')} {...num} />
            <Field label={F.satFat} value={v.sat} onChangeText={set('sat')} {...num} />
            <Field label={F.transFat} value={v.trans} onChangeText={set('trans')} {...num} />
            <Choice label={F.added} value={added} onChange={setAdded} options={[{ key: 'yes', label: F.yes }, { key: 'no', label: 'No' }, { key: 'unknown', label: F.unknown }]} />
          </>
        ) : null}
        <Button label={F.evaluate} icon="check" onPress={evaluate} />
        {result ? <Result r={result} /> : null}
      </View>
    </ScreenContainer>
  );
}

function Result({ r }: { r: FoodResult }) {
  const t = useTheme();
  const s = useStyles();
  if (r.kind === 'not_applicable') {
    return (
      <View testID="food-result">
        <Card style={s.stack}>
          <AppText variant="secondary" accessibilityLiveRegion="polite">{r.message}</AppText>
        </Card>
      </View>
    );
  }
  const color = { exceeds: t.ink.danger, below: t.ink.mint, missing: t.c.muted } as const;
  const label = { exceeds: F.exceeds, below: F.below, missing: F.missing } as const;
  return (
    <View testID="food-result">
      <Card style={s.stack}>
        <AppText variant="h3" accessibilityLiveRegion="polite">{r.summary}</AppText>
        {r.nutrients.map((n) => (
          <View key={n.nutrient} style={s.row} accessible accessibilityLabel={`${NUTRIENT_LABEL[n.nutrient]}: ${label[n.status]}. ${n.detail}`}>
            <Icon name={n.status === 'exceeds' ? 'warning' : n.status === 'below' ? 'check' : 'minus'} color={color[n.status]} size={20} />
            <View style={s.flex}>
              <AppText variant="secondaryStrong">{`${NUTRIENT_LABEL[n.nutrient].charAt(0).toUpperCase()}${NUTRIENT_LABEL[n.nutrient].slice(1)}: ${label[n.status]}`}</AppText>
              <AppText variant="caption" color={t.c.muted}>{n.detail}</AppText>
            </View>
          </View>
        ))}
        {r.profileNotes.map((note) => (
          <AppText key={note} variant="secondaryStrong">{note}</AppText>
        ))}
        <AppText variant="captionStrong">{r.notice}</AppText>
        <AppText variant="caption" color={t.c.muted}>{F.source(FOOD_RULES.version, FOOD_RULES.consultedAt)}</AppText>
        <AppText variant="caption" color={t.c.muted}>{F.pending(FOOD_RULES.pending)}</AppText>
      </Card>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    stack: { gap: spacing.md },
    row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
    soon: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, borderWidth: t.borderWidth, borderColor: t.c.border, borderStyle: 'dashed' },
  }),
);
