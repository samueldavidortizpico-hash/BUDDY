/**
 * Existencias de medicamentos. Todo es ESTIMADO y corregible por el cuidador:
 *  consumo diario = dosis por toma × tomas por día (promediando los días de la semana si no son todos)
 *  días restantes = existencias / consumo diario
 *  fecha de agotamiento = hoy + días restantes (redondeado hacia abajo)
 * Sin existencias registradas (`unitsOnHand === null`) no se calcula ni se avisa nada.
 */
import { addDays } from '@/utils/dates';

import { dosesPerDay } from './schedule';
import type { ISODate, Medication } from './types';

export type StockLevel = 'none' | 'ok' | 'low' | 'out';

export interface StockEstimate {
  level: StockLevel;
  dailyUse: number;
  /** Días completos que alcanzan (null si no hay consumo programado). */
  daysLeft: number | null;
  runOutDate: ISODate | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function dailyUse(med: Pick<Medication, 'doseAmount' | 'schedule'>): number {
  return round2(med.doseAmount * dosesPerDay(med));
}

export function estimateStock(med: Pick<Medication, 'doseAmount' | 'schedule' | 'unitsOnHand' | 'refillAlertDays' | 'paused'>, today: ISODate): StockEstimate {
  if (med.unitsOnHand === null) return { level: 'none', dailyUse: 0, daysLeft: null, runOutDate: null };
  const use = dailyUse(med);
  if (med.unitsOnHand <= 0) return { level: 'out', dailyUse: use, daysLeft: 0, runOutDate: today };
  if (use <= 0 || med.paused) return { level: 'ok', dailyUse: use, daysLeft: null, runOutDate: null };
  const daysLeft = Math.floor(med.unitsOnHand / use + 1e-9);
  return {
    level: daysLeft <= med.refillAlertDays ? 'low' : 'ok',
    dailyUse: use,
    daysLeft,
    runOutDate: addDays(today, daysLeft),
  };
}

/** Existencias tras confirmar una toma (nunca negativas). */
export function afterDose(unitsOnHand: number | null, doseAmount: number): number | null {
  return unitsOnHand === null ? null : Math.max(0, round2(unitsOnHand - doseAmount));
}

/** Existencias tras registrar una compra de `packages` cajas o `units` unidades sueltas. */
export function afterPurchase(unitsOnHand: number | null, input: { packages?: number; units?: number; unitsPerPackage: number | null }): number {
  const added = (input.packages ?? 0) * (input.unitsPerPackage ?? 0) + (input.units ?? 0);
  return round2((unitsOnHand ?? 0) + added);
}
