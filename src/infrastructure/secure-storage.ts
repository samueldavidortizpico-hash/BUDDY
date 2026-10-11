/**
 * Almacenamiento seguro clave → texto. En Android/iOS usa expo-secure-store (Keystore/Keychain).
 * En web (solo para desarrollo y pruebas) expo-secure-store no existe: se usa AsyncStorage, que NO es seguro.
 * Claves: alfanuméricas, ".", "-" y "_".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const web = Platform.OS === 'web';

export const secureStorage = {
  get: (key: string): Promise<string | null> => (web ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key)),
  set: (key: string, value: string): Promise<void> => (web ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value)),
  remove: (key: string): Promise<void> => (web ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key)),
};
