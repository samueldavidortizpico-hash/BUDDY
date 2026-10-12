/**
 * LocationMap en web (solo para pruebas y la vista previa en el navegador): mapa embebido de OpenStreetMap con su
 * atribución obligatoria. Uso ligero, sin descargar teselas por adelantado (política de uso de teselas de la OSMF).
 * react-native-maps no funciona en web.
 */
import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  return (
    <View style={[styles.frame, { height }]} accessibilityLabel={label}>
      {/* Fondo mientras carga (o si el servicio de teselas no responde): nunca un hueco en blanco. */}
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Cargando mapa…</Text>
      </View>
      {createElement('iframe', { src, title: label, style: { position: 'relative', border: 0, width: '100%', height: '100%' }, loading: 'lazy', referrerPolicy: 'strict-origin-when-cross-origin' })}
    </View>
  );
}

export const MAP_ATTRIBUTION = '© colaboradores de OpenStreetMap (openstreetmap.org/copyright)';

const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: 20, overflow: 'hidden', backgroundColor: '#E6EEF0' },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#41545C', fontSize: 14 },
});
