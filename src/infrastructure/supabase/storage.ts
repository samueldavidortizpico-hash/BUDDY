/** Web: la sesión de Supabase se guarda en el localStorage del navegador. */
export const sessionStorage = typeof window !== 'undefined' ? window.localStorage : undefined;
