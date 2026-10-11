/**
 * DATOS FICTICIOS DE DEMOSTRACIÓN — registros manuales inventados (no provienen de ningún dispositivo).
 */
import type { VitalEntry, VitalType } from '@/types/domain';
import { addDays, atClock, toISODate } from '@/utils/dates';

const SERIES: { type: VitalType; time: string; every: number; values: [number, number | null][] }[] = [
  { type: 'bloodPressure', time: '09:00', every: 1, values: [[122, 80], [119, 78], [121, 79], [117, 76], [120, 77], [116, 75], [118, 76]] },
  { type: 'glucose', time: '07:30', every: 1, values: [[98, null], [94, null], [101, null], [97, null], [99, null], [95, null], [96, null]] },
  { type: 'pulse', time: '09:05', every: 1, values: [[70, null], [74, null], [71, null], [76, null], [72, null], [73, null], [72, null]] },
  { type: 'oxygen', time: '09:05', every: 1, values: [[97, null], [98, null], [97, null], [98, null], [98, null], [97, null], [98, null]] },
  { type: 'temperature', time: '08:00', every: 2, values: [[36.4, null], [36.6, null], [36.5, null], [36.5, null]] },
  { type: 'weight', time: '07:00', every: 3, values: [[67.8, null], [67.6, null], [67.4, null]] },
];

export function createDemoVitals(now: Date): VitalEntry[] {
  const today = toISODate(now);
  return SERIES.flatMap(({ type, time, every, values }) =>
    values.map(([value, secondary], i) => {
      const date = addDays(today, -(values.length - 1 - i) * every - 1);
      return {
        id: `demo-vital-${type}-${i}`,
        type,
        value,
        secondary,
        recordedAt: atClock(date, time).toISOString(),
        source: 'manual' as const,
        demo: true,
      };
    }),
  );
}
