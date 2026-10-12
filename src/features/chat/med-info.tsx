/**
 * Tarjeta de información VERIFICADA de un medicamento en el chat: lo que dice el registro del INVIMA (con su fuente)
 * y "Para qué se usa" desde MedlinePlus.gov en español (con la fecha de consulta). Estados: cargando, encontrado,
 * sin información verificada y sin conexión. Nunca muestra dosis ni dice que algo es seguro.
 */
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { GENERAL_INFO_NOTICE } from '@/domain/knowledge';
import { medicationKnowledge, type ExplainResult } from '@/infrastructure/knowledge';
import { strings } from '@/i18n';
import { radius, spacing } from '@/theme';
import { makeStyles, useTheme } from '@/theme/provider';

const K = strings.knowledge;

export interface MedInfoPayload {
  kind: 'medinfo';
  name: string;
  /** "acetaminofén 500 mg" (principios activos y concentración del registro). */
  what: string;
  atc: string;
  ingredients: string[];
  registry?: { id?: string; date: string };
}

export function MedInfoCard({ p }: { p: MedInfoPayload }) {
  const t = useTheme();
  const s = useStyles();
  const [info, setInfo] = useState<ExplainResult | 'loading'>('loading');
  // Clave estable: el payload se lee del mensaje en cada render (un arreglo nuevo relanzaría la consulta sin fin).
  const ingredientsKey = p.ingredients.join('|');
  useEffect(() => {
    let alive = true;
    medicationKnowledge
      .explain({ atc: p.atc, ingredients: ingredientsKey.split('|').map((name) => ({ name, amount: '', unit: '', per: '' })) })
      .then((r) => alive && setInfo(r))
      .catch(() => alive && setInfo({ status: 'offline' }));
    return () => {
      alive = false;
    };
  }, [p.atc, ingredientsKey]);

  return (
    <View testID="med-info" style={[s.card, t.hairline]}>
      <View style={s.row}>
        <Icon name="info" color={t.ink.mint} size={20} />
        <AppText variant="secondaryStrong" style={s.flex}>
          {K.fromRegistry(p.name, p.what)}
        </AppText>
      </View>
      {p.registry ? (
        <AppText variant="caption" color={t.c.muted}>
          {K.registry(p.registry.id ?? '—', p.registry.date)}
        </AppText>
      ) : null}

      <AppText variant="captionStrong" color={t.c.muted} style={s.heading}>
        {K.uses}
      </AppText>
      {info === 'loading' ? (
        <AppText variant="secondary" color={t.c.muted} accessibilityLiveRegion="polite">
          {K.loading}
        </AppText>
      ) : info.status === 'found' ? (
        <>
          <AppText variant="secondary">{info.uses}</AppText>
          <AppText variant="captionStrong" color={t.c.muted} style={s.heading}>
            {K.whatToKnow}
          </AppText>
          <AppText variant="caption" color={t.c.muted}>
            {K.whatToKnowBody}
          </AppText>
          <Button label={K.readMore} icon="arrow" size="sm" variant="ghost" onPress={() => Linking.openURL(info.url)} style={s.start} />
          <AppText variant="caption" color={t.c.muted}>
            {info.stale ? K.stale(info.source.date) : K.source(info.source.date)}
          </AppText>
        </>
      ) : (
        <AppText variant="secondary" color={t.c.muted}>
          {info.status === 'offline' ? K.offline : K.none(p.name)}
        </AppText>
      )}
      <AppText variant="captionStrong" color={t.c.text}>
        {GENERAL_INFO_NOTICE}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    flex: { flex: 1 },
    card: { alignSelf: 'stretch', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.card, backgroundColor: t.c.surface },
    row: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
    heading: { marginTop: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
    start: { alignSelf: 'flex-start' },
  }),
);
