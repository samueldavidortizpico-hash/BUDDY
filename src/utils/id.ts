let counter = 0;

/** Identificador local único (no criptográfico; suficiente para datos en el dispositivo). */
export function createId(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
