/** Contrato de autenticación. Implementaciones: LocalAuthProvider (dispositivo) y SupabaseAuthProvider (servidor). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_taken'
  | 'locked'
  | 'weak_password'
  | 'invalid_email'
  | 'not_configured'
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
  signIn(input: { email: string; password: string }): Promise<AuthUser>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onAuthStateChange(listener: (user: AuthUser | null) => void): () => void;
  /** Envía (o explica por qué no puede enviar) el enlace de recuperación. Nunca revela si el correo existe. */
  resetPassword(email: string): Promise<{ sent: boolean; message: string }>;
  updatePassword(input: { current: string; next: string }): Promise<void>;
  deleteAccount(password: string): Promise<void>;
}
