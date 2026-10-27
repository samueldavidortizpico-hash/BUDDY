/**
 * Planes de BUDDY (V4.3): UN solo archivo con precios, textos y el plan recomendado. Precios mensuales en pesos
 * colombianos; cada plan incluye lo del anterior salvo lo indicado. Los precios anuales están POR DEFINIR (`null`): la
 * pantalla no inventa precios ni ahorros; cuando se fijen aquí, el ahorro se calcula solo.
 *
 * Nunca se bloquea una función de seguridad: medicamentos, recordatorios, aviso escalonado, existencias, chequeo diario
 * con la pregunta de sueño y sus alertas, pedir ayuda y alertas de seguridad son siempre gratis.
 */
import type { IconName } from '@/components/icon';
import type { Domain } from '@/theme';

export type PlanId = 'free' | 'plus' | 'health' | 'family';
export type PaidPlanId = Exclude<PlanId, 'free'>;
export type BillingPeriod = 'monthly' | 'yearly';

/** Funciones de pago (las gratuitas no se listan: nunca se bloquean). */
export type Feature =
  | 'chat'
  | 'health_history'
  | 'sleep_trends'
  | 'watch'
  | 'doctor_report'
  | 'nurse_role'
  | 'family_members'
  | 'care_shifts'
  | 'shared_notes'
  | 'family_view';

export const PLAN_ORDER: PlanId[] = ['free', 'plus', 'health', 'family'];

/** Primer plan que incluye cada función. */
export const FEATURE_PLAN: Record<Feature, PaidPlanId> = {
  chat: 'plus',
  health_history: 'plus',
  sleep_trends: 'plus',
  watch: 'plus',
  doctor_report: 'plus',
  nurse_role: 'health',
  family_members: 'family',
  care_shifts: 'family',
  shared_notes: 'family',
  family_view: 'family',
};

export interface PlanInfo {
  id: PlanId;
  name: string;
  icon: IconName;
  domain: Domain;
  /** Precio mensual en pesos (0 = gratis). */
  monthly: number;
  /** Precio anual en pesos; `null` mientras no se defina. */
  yearly: number | null;
  /** Para quién es. */
  audience: string;
  /** 4 o 5 beneficios con ejemplos reales. */
  benefits: string[];
}

export const PLANS: Record<PlanId, PlanInfo> = {
  free: {
    id: 'free',
    name: 'Gratis',
    icon: 'shield',
    domain: 'activity',
    monthly: 0,
    yearly: 0,
    audience: 'Lo esencial, siempre',
    benefits: [
      'Un cuidador y un adulto mayor',
      'Medicamentos, recordatorios y aviso escalonado',
      'Existencias y aviso cuando se están acabando',
      'Chequeo diario con la pregunta de sueño y sus alertas',
      'Pedir ayuda y alertas de seguridad',
    ],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    icon: 'sparkle',
    domain: 'mood',
    monthly: 7000,
    yearly: null,
    audience: 'Para un cuidador',
    benefits: [
      'Chat con BUDDY: "Ponle losartán a las 6"',
      'Ve cómo durmió tu mamá esta semana',
      'Salud con gráficas e historial de semanas y meses',
      'Reloj inteligente: pasos y actividad',
      'Reporte en PDF para llevar al médico',
    ],
  },
  health: {
    id: 'health',
    name: 'Salud',
    icon: 'plus',
    domain: 'water',
    monthly: 11000,
    yearly: null,
    audience: 'Si una enfermera te ayuda',
    benefits: [
      'Todo lo de Plus',
      'La enfermera recibe los avisos en su celular',
      'Confirma las tomas que le da, con su nombre',
      'Registra cada día cómo se siente',
      'Lleva las existencias de los medicamentos',
    ],
  },
  family: {
    id: 'family',
    name: 'Familiar',
    icon: 'users',
    domain: 'contact',
    monthly: 13000,
    yearly: null,
    audience: 'Para toda la familia',
    benefits: [
      'Todo lo de Salud',
      'Tus hermanos ven lo mismo que tú',
      'Cada familiar con su rol: ver o administrar',
      'Turnos de cuidado: quién acompaña cada día',
      'Notas compartidas y vista de familia',
    ],
  },
};

/** Plan destacado en la pantalla de planes (configurable). */
export const RECOMMENDED_PLAN: PaidPlanId = 'family';

/** Filas de "Compara los planes": función y desde qué plan está incluida (`free` = en todos). */
export const COMPARISON: { label: string; from: PlanId }[] = [
  { label: 'Medicamentos, recordatorios y aviso escalonado', from: 'free' },
  { label: 'Existencias y pedir ayuda', from: 'free' },
  { label: 'Chequeo diario y alertas de seguridad', from: 'free' },
  { label: 'Chat con BUDDY', from: 'plus' },
  { label: 'Gráficas, historial y sueño con tendencias', from: 'plus' },
  { label: 'Reloj inteligente', from: 'plus' },
  { label: 'Reporte para el médico', from: 'plus' },
  { label: 'Rol de enfermera', from: 'health' },
  { label: 'Varios familiares con roles', from: 'family' },
  { label: 'Turnos, notas y vista de familia', from: 'family' },
];

/** Identificadores de producto (de trabajo; se crean en App Store Connect, Play Console y RevenueCat). */
export const PRODUCT_IDS: Record<PaidPlanId, Record<BillingPeriod, string>> = {
  plus: { monthly: 'buddy_plus_monthly', yearly: 'buddy_plus_yearly' },
  health: { monthly: 'buddy_health_monthly', yearly: 'buddy_health_yearly' },
  family: { monthly: 'buddy_family_monthly', yearly: 'buddy_family_yearly' },
};

/** Entitlement de RevenueCat por plan (el mayor activo manda). */
export const ENTITLEMENT_IDS: Record<PaidPlanId, string> = { plus: 'buddy_plus', health: 'buddy_health', family: 'buddy_family' };

/** "$7.000" (sin decimales, separador de miles con punto, como en Colombia). */
export const formatCOP = (n: number) => `$${Math.round(n).toLocaleString('es-CO').replace(/,/g, '.')}`;

/** Ahorro anual frente a 12 meses, en pesos (null si el precio anual no está definido o no ahorra). */
export function yearlySavings(plan: PlanInfo): number | null {
  if (plan.yearly === null || plan.monthly === 0) return null;
  const saved = plan.monthly * 12 - plan.yearly;
  return saved > 0 ? saved : null;
}
