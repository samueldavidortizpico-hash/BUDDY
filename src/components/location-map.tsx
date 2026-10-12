/**
 * LocationMap (interfaz propia para poder cambiar de proveedor, docs/MAPAS.md). En el teléfono: react-native-maps
 * (incluido en Expo Go; Apple Maps en iOS, Google Maps en Android). En web hay otra implementación
 * (location-map.web.tsx). Solo muestra ubicaciones reales que llegan por props: nunca un punto inventado.
 */
import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

export interface LocationMapProps {
  lat: number;
  lng: number;
  accuracy: number | null;
  label: string;
  height?: number;
}

export function LocationMap({ lat, lng, accuracy, label, height = 280 }: LocationMapProps) {
  const delta = 0.01;
  return (
    <MapView
      style={[styles.map, { height }]}
      region={{ latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta }}
      accessibilityLabel={label}
      showsUserLocation={false}
      toolbarEnabled={false}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} title={label} />
      {accuracy ? <Circle center={{ latitude: lat, longitude: lng }} radius={accuracy} strokeColor="rgba(23,74,89,0.6)" fillColor="rgba(94,217,181,0.18)" /> : null}
    </MapView>
  );
}

/** Atribución del proveedor (los mapas nativos ya muestran su propio logotipo y avisos legales). */
export const MAP_ATTRIBUTION = 'Mapa: Apple Maps (iOS) o Google Maps (Android)';

const styles = StyleSheet.create({ map: { width: '100%', borderRadius: 20 } });
