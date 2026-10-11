import { useEffect, useState } from 'react';

/** Hora actual que se actualiza cada `intervalMs` (por defecto 30 s) para recalcular estados de tomas. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
