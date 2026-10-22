/** Contrato de autenticación. Implementaciones: LocalAuthProvider (dispositivo) y SupabaseAuthProvider (servidor). */
import type { Role } from './types';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  /** Administrador (familiar o cuidador) o adulto mayor. Sin valor = administrador (cuentas anteriores a v2.2). */
  role?: Role;
  /** Cuenta del adulto mayor: administrador que la creó y persona a la que pertenece. */
  ownerId?: string | null;
  elderId?: string | null;
}

/** Cuenta dueña de los datos: el administrador, también cuando entra el adulto mayor con su acceso. */
export function dataOwnerId(user: AuthUser): string {
  return user.role === 'elder' && user.ownerId ? user.ownerId : user.id;
}

export const roleOf = (user: AuthUser | null | undefined): Role => user?.role ?? 'caregiver';

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
  deleteAccount(password: string): Promise<void>;
  /**
   * Cuentas del adulto mayor creadas por su administrador. Local: en este teléfono. Supabase: exige una Edge Function con
   * la clave de servicio (docs/SUPABASE_PLAN.md); la app nunca crea usuarios para otra persona directamente.
   */
  createManagedAccount(input: { ownerId: string; elderId: string; name: string; email: string; password: string }): Promise<AuthUser>;
  resetManagedPassword(input: { ownerId: string; elderId: string; password: string }): Promise<void>;
  revokeManagedAccount(input: { ownerId: string; elderId: string }): Promise<void>;
  changeManagedEmail(input: { ownerId: string; elderId: string; email: string }): Promise<void>;
  managedAccount(input: { ownerId: string; elderId: string }): Promise<{ email: string; revoked: boolean } | null>;
  /** Local today; remote implementation must verify ownership server-side before changing session. */
  switchToManaged?(elderId: string, password: string): Promise<AuthUser>;
  returnToOwner?(password: string, email?: string): Promise<AuthUser>;
  regenerateRecoveryCode?(password: string): Promise<string>;
  recoverWithCode?(input: { email: string; code: string; next: string }): Promise<void>;
}
