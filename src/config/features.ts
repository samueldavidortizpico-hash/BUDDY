/**
 * Interruptores de funciones. Las reglas de NIVEL 2 (coincidencias por clase farmacológica ATC) no tienen todavía
 * revisión de un profesional de salud: activas en desarrollo y en Expo Go para que el dueño las pruebe; en una build
 * de producción quedan APAGADAS salvo EXPO_PUBLIC_LEVEL2_REVIEW=on (buddy-medical-safety: "feature flag desactivado por
 * defecto"). Interacciones y contraindicaciones por condición (nivel 3) no existen hasta la Fase 7.
 */
export const FEATURES = {
  level2Review: __DEV__ || process.env.EXPO_PUBLIC_LEVEL2_REVIEW === 'on',
};
