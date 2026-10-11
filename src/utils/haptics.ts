import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Vibración suave; en web no hace nada y nunca lanza errores. */
const safe = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => undefined);
};

export const tapHaptic = () => safe(() => Haptics.selectionAsync());
export const successHaptic = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const warningHaptic = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
