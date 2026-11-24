/**
 * Capacidades de ESTA compilación (V5.3, auditoría de venta V-03). Deciden qué beneficios de un plan existen de verdad
 * y, por tanto, qué se puede cobrar (`benefitAvailable` y `planPurchasable` en domain/entitlements.ts).
 *
 * - `server`: hay servidor (Supabase) para la autenticación Y los datos. Sin él no hay avisos en otro teléfono, ni
 *   enfermera o familiares en su propio celular. Lee las mismas variables que `src/infrastructure/index.ts`, sin
 *   importarlo (cargaría el cliente de Supabase en la configuración).
 * - `watch`: reloj inteligente (`FEATURES.watch`).
 * - `doctorReport`: reporte en PDF para el médico (`FEATURES.doctorReport`).
 */
import { FEATURES } from './features';

export type Capability = 'server' | 'watch' | 'doctorReport';
export type Capabilities = Record<Capability, boolean>;

export const CAPABILITIES: Capabilities = {
  server: process.env.EXPO_PUBLIC_AUTH_PROVIDER === 'supabase' && process.env.EXPO_PUBLIC_DATA_SOURCE === 'supabase',
  watch: FEATURES.watch,
  doctorReport: FEATURES.doctorReport,
};
