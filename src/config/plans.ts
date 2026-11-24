/**
 * Planes de BUDDY (V4.3): UN solo archivo con precios, textos y el plan recomendado. Precios mensuales en pesos
 * colombianos; cada plan incluye lo del anterior salvo lo indicado. Los precios anuales están POR DEFINIR (`null`): la
 * pantalla no inventa precios ni ahorros; cuando se fijen aquí, el ahorro se calcula solo.
 *
 * Nunca se bloquea una función de seguridad: medicamentos, recordatorios, aviso escalonado, existencias, chequeo diario
 * con la pregunta de sueño y sus alertas, pedir ayuda y alertas de seguridad son siempre gratis.
 *
 * Solo se cobra lo que se entrega (V5.3, auditoría de venta V-03): cada beneficio declara en `requires` la capacidad
 * que necesita (`server`, `watch` o `doctorReport`). Si la compilación no la tiene, el beneficio sale como
 * "Próximamente" y no cuenta en el precio; un plan sin beneficios propios disponibles no se puede comprar
 * (`planPurchasable` en domain/entitlements.ts).
 */
import type { IconName } from '@/components/icon';
import type { Capability } from '@/config/capabilities';
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
  benefits: Benefit[];
}

export interface Benefit {
  text: string;
  /** Capacidad que necesita para existir en la app instalada. Sin valor: ya existe. */
  requires?: Capability;
  /** "Todo lo de …": no es un beneficio propio del plan (no decide si se puede comprar). */
  inherited?: boolean;
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
      { text: 'Un cuidador y un adulto mayor' },
      { text: 'Medicamentos, recordatorios y aviso escalonado' },
      { text: 'Existencias y aviso cuando se están acabando' },
      { text: 'Chequeo diario con la pregunta de sueño y sus alertas' },
      { text: 'Pedir ayuda y alertas de seguridad' },
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
      { text: 'Chat con BUDDY: "Ponle losartán a las 6"' },
      { text: 'Ve cómo durmió tu mamá esta semana' },
      { text: 'Salud con gráficas e historial de semanas y meses' },
      { text: 'Reloj inteligente: pasos y actividad', requires: 'watch' },
      { text: 'Reporte en PDF para llevar al médico', requires: 'doctorReport' },
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
      { text: 'Todo lo de Plus', inherited: true },
      { text: 'La enfermera recibe los avisos en su celular', requires: 'server' },
      { text: 'Confirma las tomas que le da, con su nombre', requires: 'server' },
      { text: 'Registra cada día cómo se siente', requires: 'server' },
      { text: 'Lleva las existencias de los medicamentos', requires: 'server' },
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
      { text: 'Todo lo de Salud', inherited: true },
      { text: 'Tus hermanos ven lo mismo que tú', requires: 'server' },
      { text: 'Cada familiar con su rol: ver o administrar', requires: 'server' },
      { text: 'Turnos de cuidado: quién acompaña cada día', requires: 'server' },
      { text: 'Notas compartidas y vista de familia', requires: 'server' },
    ],
  },
};

/** Plan destacado en la pantalla de planes (configurable). Si no se puede comprar, se destaca el primero que sí. */
export const RECOMMENDED_PLAN: PaidPlanId = 'family';

/** Filas de "Compara los planes": función, desde qué plan está incluida (`free` = en todos) y qué necesita para existir. */
export const COMPARISON: { label: string; from: PlanId; requires?: Capability }[] = [
  { label: 'Medicamentos, recordatorios y aviso escalonado', from: 'free' },
  { label: 'Existencias y pedir ayuda', from: 'free' },
  { label: 'Chequeo diario y alertas de seguridad', from: 'free' },
  { label: 'Chat con BUDDY', from: 'plus' },
  { label: 'Gráficas, historial y sueño con tendencias', from: 'plus' },
  { label: 'Reloj inteligente', from: 'plus', requires: 'watch' },
  { label: 'Reporte para el médico', from: 'plus', requires: 'doctorReport' },
  { label: 'Rol de enfermera en su celular', from: 'health', requires: 'server' },
  { label: 'Varios familiares con roles', from: 'family', requires: 'server' },
  { label: 'Turnos, notas y vista de familia', from: 'family', requires: 'server' },
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
