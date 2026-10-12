/** Enlaces a la app de mapas del teléfono (Apple Maps en iOS, la app de mapas en Android, Google Maps en web). */
import { Platform } from 'react-native';

export function directionsUrl(address: string): string {
  const q = encodeURIComponent(address);
  if (Platform.OS === 'ios') return `http://maps.apple.com/?daddr=${q}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${q}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

export function pointUrl(lat: number, lng: number, label = 'Ubicación'): string {
  const q = encodeURIComponent(label);
  if (Platform.OS === 'ios') return `http://maps.apple.com/?ll=${lat},${lng}&q=${q}`;
  if (Platform.OS === 'android') return `geo:${lat},${lng}?q=${lat},${lng}(${q})`;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}
