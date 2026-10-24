/**
 * Interruptores de funciones (V3.0, docs/PRODUCTO.md). Encendido: el Núcleo y el Valor añadido ya construido. Apagado y
 * fuera de la navegación principal: lo de Futuro. El código apagado se conserva (no se borra) para retomarlo.
 *
 * - `level2Review`: reglas de NIVEL 2 (coincidencias por clase farmacológica ATC) sin revisión de un profesional de
 *   salud. Es la "revisión farmacológica avanzada" (Futuro): APAGADA por defecto también en desarrollo; se enciende con
 *   EXPO_PUBLIC_LEVEL2_REVIEW=on (buddy-medical-safety: "feature flag desactivado por defecto"). Interacciones y
 *   contraindicaciones por condición (nivel 3) no existen hasta la Fase 7.
 * - `foodAnalysis`: evaluador de etiquetas nutricionales (nutrición, Futuro).
 * - `watch`: reloj y datos de salud del reloj (Futuro).
 * - `encryptedStorage` (V4 Fase 3): base local cifrada con AES-GCM y la clave en el SecureStore. Encendida solo en
 *   desarrollo hasta probarla en dispositivo (docs/ALMACENAMIENTO_SEGURO.md); apagada en producción y en Jest.
 * Zonas seguras e IA conversacional real no tienen código todavía.
 */
export const FEATURES = {
  level2Review: process.env.EXPO_PUBLIC_LEVEL2_REVIEW === 'on',
  foodAnalysis: false,
  watch: false,
  encryptedStorage: __DEV__ && process.env.NODE_ENV !== 'test',
};
