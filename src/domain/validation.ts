/** Validaciones puras de formularios (correo, contraseña, teléfonos de Colombia, nombres, números). */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

/** 0 muy débil … 4 muy fuerte. Mínimo aceptado: 8 caracteres y fuerza ≥ 2. */
export function passwordStrength(pw: string): PasswordStrength {
  if (pw.length < 8) return pw.length >= 4 ? 1 : 0;
  let score = 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++;
  return Math.min(4, score) as PasswordStrength;
}

export function isAcceptablePassword(pw: string): boolean {
  return pw.length >= 8 && passwordStrength(pw) >= 2;
}

/**
 * Contraseña temporal legible para dictar por teléfono ("Kp7m-r4tw-9xh2"): sin letras o números que se confunden
 * (0/O, 1/l/I) y siempre aceptable (mayúscula, minúscula, número y guiones). Recibe 12 bytes aleatorios.
 */
export function tempPassword(bytes: Uint8Array): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = lower + digits;
  const c = Array.from(bytes.slice(0, 12), (b, i) => (i === 0 ? lower.toUpperCase()[b % lower.length] : i === 2 ? digits[b % digits.length] : all[b % all.length]));
  return `${c.slice(0, 4).join('')}-${c.slice(4, 8).join('')}-${c.slice(8, 12).join('')}`;
}

/** Deja solo dígitos y quita el indicativo +57. */
export function digitsOnly(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length === 12 && d.startsWith('57') ? d.slice(2) : d;
}

/**
 * Teléfono de Colombia: celular de 10 dígitos que empieza por 3, o fijo nacional de 10 dígitos que empieza por 60
 * (marcación desde 2021), o fijo local de 7 dígitos. Las líneas de emergencia (123) también se aceptan.
 */
export function isValidColombianPhone(phone: string): boolean {
  const d = digitsOnly(phone);
  if (d === '123' || d === '112' || d === '155') return true;
  if (d.length === 10) return d.startsWith('3') || d.startsWith('60');
  return d.length === 7;
}

/** "3001234567" → "300 123 4567" */
export function formatPhone(phone: string): string {
  const d = digitsOnly(phone);
  if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  if (d.length === 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return phone.trim();
}

export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

/** Acepta "70", "70,5", "70.5". Devuelve null si no es un número dentro del rango. */
export function parseDecimal(text: string, min: number, max: number): number | null {
  const v = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

/** Quita tildes y mayúsculas para comparar textos ("Penicilina" ≈ "penicilina"). */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
