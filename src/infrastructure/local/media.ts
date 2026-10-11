/**
 * Fotos (envases, comidas): se copian a la carpeta de la app para que no dependan de la caché de la cámara.
 * En web no hay sistema de archivos: se conserva la URI que entrega el navegador.
 */
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

export async function savePhoto(uri: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'buddy-photos');
    dir.create({ idempotent: true, intermediates: true });
    const dest = new File(dir, `${Crypto.randomUUID()}.jpg`);
    await new File(uri).copy(dest);
    return dest.uri;
  } catch {
    // Si la copia falla, se usa la original (sigue funcionando mientras exista).
    return uri;
  }
}

export function deletePhoto(uri: string | null) {
  if (!uri || Platform.OS === 'web') return;
  try {
    const f = new File(uri);
    if (f.exists && f.uri.includes('buddy-photos')) f.delete();
  } catch {
    // Archivo ya inexistente: nada que hacer.
  }
}
