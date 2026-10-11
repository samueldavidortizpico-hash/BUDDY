/** DATOS FICTICIOS DE DEMOSTRACIÓN — siete noches inventadas. */
import type { SleepEntry, SleepQuality } from '@/types/domain';
import { addDays, toISODate } from '@/utils/dates';

const NIGHTS: [string, string, SleepQuality][] = [
  ['22:50', '05:50', 'light'],
  ['22:30', '06:10', 'good'],
  ['23:15', '05:40', 'light'],
  ['22:20', '06:30', 'deep'],
  ['22:45', '06:00', 'good'],
  ['22:10', '06:20', 'deep'],
  ['22:40', '06:00', 'good'],
];

export function createDemoSleep(now: Date): SleepEntry[] {
  const today = toISODate(now);
  return NIGHTS.map(([bedtime, wakeTime, quality], i) => ({
    id: `demo-sleep-${i}`,
    date: addDays(today, i - 6),
    bedtime,
    wakeTime,
    quality,
    napMinutes: 0,
    demo: true,
  }));
}
