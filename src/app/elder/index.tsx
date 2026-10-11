import { ElderScreen } from '@/features/elder/screen';
import { useDb } from '@/infrastructure/local/db';

/** Pantalla del adulto mayor mientras el teléfono está entregado (sin pestañas, sin ajustes, sin chat). */
export default function ElderHome() {
  const elderId = useDb((x) => x.handoff?.elderId ?? null);
  return elderId ? <ElderScreen elderId={elderId} /> : null;
}
