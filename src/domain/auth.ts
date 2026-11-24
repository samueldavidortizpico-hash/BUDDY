/** Contrato de autenticación. Implementaciones: LocalAuthProvider (dispositivo) y SupabaseAuthProvider (servidor). */
import { FAMILY_LEVELS, ROLES, type FamilyLevel, type Role } from './types';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  /** Administrador (familiar o cuidador) o adulto mayor. Sin valor = administrador (cuentas anteriores a v2.2). */
  role?: Role;
  /** Solo para `family`: `viewer` (solo ve) o `admin`. Lo asigna el titular; nunca el propio usuario. */
  level?: FamilyLevel;
  /** Cuenta vinculada (adulto mayor, enfermera o familiar): titular que la creó y persona a la que pertenece. */
  ownerId?: string | null;
  elderId?: string | null;
}

/** Cuentas que actúan sobre los datos de su titular, solo los de la persona compartida. */
export const LINKED_ROLES: readonly Role[] = ['elder', 'nurse', 'family'];

/** Cuenta dueña de los datos: el administrador, también cuando entra una cuenta vinculada con su acceso. */
export function dataOwnerId(user: AuthUser): string {
  return user.role && LINKED_ROLES.includes(user.role) && user.ownerId ? user.ownerId : user.id;
}

export const roleOf = (user: AuthUser | null | undefined): Role => user?.role ?? 'caregiver';

/**
 * ¿La sesión trae un rol que la app conoce? (spec: "Rol desconocido: la sesión se rechaza y no se muestra ningún
 * dato"). Sin rol = cuenta anterior al campo: titular. `family` exige un nivel válido; nunca se adivina el nivel.
 */
export function isValidSessionUser(user: AuthUser): boolean {
  if (user.role === undefined) return true;
  if (!ROLES.includes(user.role)) return false;
  if (user.role === 'family') return !!user.level && FAMILY_LEVELS.includes(user.level);
  return true;
}

/** Cuentas que crea el administrador: la del adulto mayor y la de su enfermera. */
export type ManagedRole = 'elder' | 'nurse';

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'locked'
  | 'weak_password'
  | 'invalid_email'
  | 'not_configured'
  | 'wrong_role'
  | 'revoked'
  | 'forbidden'
  /** La cuenta se creó pero el servidor exige confirmar el correo: todavía no hay sesión. */
  | 'confirm_email'
  | 'network'
  | 'unknown';

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    /** Para `locked`: milisegundos hasta poder intentar de nuevo. */
    public retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthService {
  readonly kind: 'local' | 'supabase';
  signUp(input: { name: string; email: string; password: string }): Promise<AuthUser>;
  /** Con `role`, rechaza la cuenta si es del otro tipo (selector "Soy administrador / Soy adulto mayor"). */
  signIn(input: { email: string; password: string; role?: Role }): Promise<AuthUser>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onAuthStateChange(listener: (user: AuthUser | null) => void): () => void;
  /** Envía (o explica por qué no puede enviar) el enlace de recuperación. Nunca revela si el correo existe. */
  resetPassword(email: string): Promise<{ sent: boolean; message: string }>;
  updatePassword(input: { current: string; next: string }): Promise<void>;
  /**
   * Elimina la cuenta del administrador. `linked.elderIds`: sus personas, para eliminar también los accesos (adulto
   * mayor y enfermera) que creó para ellas; ninguna credencial vinculada debe sobrevivir a su administrador.
   */
  deleteAccount(password: string, linked?: { elderIds: string[] }): Promise<void>;
  /**
   * Cuentas del adulto mayor creadas por su administrador. Local: en este teléfono. Supabase: exige una Edge Function con
   * la clave de servicio (docs/SUPABASE_PLAN.md); la app nunca crea usuarios para otra persona directamente.
   */
  /** `role`: 'elder' (por defecto) o 'nurse' (V4.3, enfermera de esa persona). */
  createManagedAccount(input: { ownerId: string; elderId: string; name: string; email: string; password: string; role?: ManagedRole }): Promise<AuthUser>;
  resetManagedPassword(input: { ownerId: string; elderId: string; password: string; role?: ManagedRole }): Promise<void>;
  revokeManagedAccount(input: { ownerId: string; elderId: string; role?: ManagedRole }): Promise<void>;
  changeManagedEmail(input: { ownerId: string; elderId: string; email: string; role?: ManagedRole }): Promise<void>;
  managedAccount(input: { ownerId: string; elderId: string; role?: ManagedRole }): Promise<{ email: string; revoked: boolean } | null>;
  /** Local today; remote implementation must verify ownership server-side before changing session. */
  switchToManaged?(elderId: string, password: string): Promise<AuthUser>;
  returnToOwner?(password: string, email?: string): Promise<AuthUser>;
  regenerateRecoveryCode?(password: string): Promise<string>;
  recoverWithCode?(input: { email: string; code: string; next: string }): Promise<void>;
}
