import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Vibración suave; en web no hace nada y nunca lanza errores. */
const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => undefined);
};

export const tapHaptic = () => safe(() => Haptics.selectionAsync());
/** Golpe ligero: acciones principales (Entrar, Continuar, Ya lo tomé). */
export const lightHaptic = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const successHaptic = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const warningHaptic = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
/** Vibración muy suave y repetible (caricias al robot). */
export const softHaptic = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
