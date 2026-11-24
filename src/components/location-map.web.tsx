/**
 * LocationMap en web (solo para pruebas y la vista previa en el navegador): mapa embebido de OpenStreetMap con su
 * atribución obligatoria. Uso ligero, sin descargar teselas por adelantado (política de uso de teselas de la OSMF).
 * react-native-maps no funciona en web.
 */
import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/provider';

import { Skeleton } from './states';

export interface LocationMapProps {
  lat: number;
  lng: number;
  accuracy: number | null;
  label: string;
  height?: number;
}

export function LocationMap({ lat, lng, label, height = 280 }: LocationMapProps) {
  const d = 0.006;
  const bbox = [lng - d, lat - d, lng + d, lat + d].map((n) => n.toFixed(5)).join('%2C');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
  const t = useTheme();
  return (
    <View style={[styles.frame, { height }]} accessibilityLabel={label}>
      {/* Fondo mientras carga (o si el servicio de teselas no responde): esqueleto del tema, nunca un hueco en blanco. */}
      <Skeleton height={height} round={20} style={StyleSheet.absoluteFill} />
      <View style={styles.loading} pointerEvents="none">
        <Text style={[styles.loadingText, { color: t.c.muted }]}>Cargando mapa…</Text>
      </View>
      {createElement('iframe', { src, title: label, style: { position: 'relative', border: 0, width: '100%', height: '100%' }, loading: 'lazy', referrerPolicy: 'strict-origin-when-cross-origin' })}
    </View>
  );
}

export const MAP_ATTRIBUTION = '© colaboradores de OpenStreetMap (openstreetmap.org/copyright)';

const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, fontWeight: '600' },
});
