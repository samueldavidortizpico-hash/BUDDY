# BUDDY — Arquitectura

> Documento vivo. Se divide en archivos (DATA_MODEL, SECURITY, AI_SAFETY…) cuando una sección crezca.
> Última actualización: 2026-10-10 · Fase 1A + esqueleto 1B.

## Stack verificado
Expo SDK 57 · React Native 0.86 · React 19.2 · TypeScript 6 (`strict`) · Expo Router (rutas en `src/app/`) · Reanimated 4 · Jest 29 + jest-expo + RNTL 13.

## Capas (monolito modular)
Pantalla (`src/app/`) → hook de feature → función de dominio / caso de uso → interfaz `Repository` → implementación (mock en 1C, Supabase en Fase 2).

```
src/
  app/                 SOLO rutas
  components/          UI compartida
  theme.ts             única fuente de tokens
  features/<dominio>/  desde 1C: types.ts, lógica pura + .test.ts, repository.ts, mock, hooks
  lib/                 desde Fase 2: cliente Supabase (solo anon key, protegida por RLS)
supabase/              desde Fase 2: migrations/, functions/ (secretos solo aquí)
```
Zustand y TanStack Query entran en Fase 2, cuando existan datos remotos. No se crean carpetas vacías.

## Contratos de dominio (se codifican en 1C)
- **Medication**: nombre comercial; principio activo con origen `verified | user_entered | unknown`; **concentración ≠ dosis**; presentación; fechas; indicaciones.
- **MedicationSchedule** → función pura `(schedule, now, timeZone) => Date[]`. Instantes en UTC en la BD, hora local en pantalla.
- **DoseEvent.status**: `scheduled | delivered | confirmed_by_user | snoozed | skipped_by_user | no_response`.
  "Confirmado" es una declaración del usuario, nunca una ingestión comprobada. `no_response` no es omisión ni emergencia.
  La entrega de la notificación (`delivered`) es distinta de la respuesta del usuario.
- **CaregiverPermission**: por categoría, revocable, con registro. Sin permiso explícito el cuidador no ve nada.
- **Alertas de seguimiento** y **advertencias farmacológicas** son tipos separados (niveles en la Skill `buddy-medical-safety`).

## Navegación
```
src/app/
  _layout.tsx              Stack raíz; carga Inter; oculta splash
  index.tsx                Bienvenida "/"
  perfil-tipo.tsx          Selección de perfil (push, con botón Atrás visible)
  (patient)/_layout.tsx    NativeTabs: inicio · medicamentos · buddy · bienestar · perfil
  (caregiver)/_layout.tsx  NativeTabs: resumen · seguimiento · alertas · cuenta
```
- Al elegir perfil: `router.dismissAll()` + `router.replace()`. "Atrás" no regresa al onboarding (cubierto por `src/navigation.test.tsx`).
- Sin sesión ni persistencia del rol hasta Fase 2; cada arranque muestra la bienvenida.
- Iconos con SF Symbols (iOS) y Material Symbols (Android), sin PNG.

## Sistema de diseño (`src/theme.ts`)
- Paleta oficial + roles semánticos. Texto sobre menta, coral o amarillo en **petróleo** (blanco no pasa AA). El color nunca es la única señal.
- Tipografía Inter local (`assets/fonts`, OFL): display 32 · h1 28 · h2 22 · h3 20 · body 18 · secondary 16 · caption 14. `allowFontScaling` siempre activo.
- Espaciado 4–40, radios (botón 20, tarjeta 24, modal 28), sombras `boxShadow`, área táctil mínima 56.
- Componentes: `Text`, `Button`, `Card`, `Screen`, `BuddyAvatar`, `PlaceholderScreen`.
- Movimiento: solo en momentos destacados (robot en la portada) y desactivado con "reducir movimiento". Las pestañas no se animan.

## Decisiones
| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-10 | Robot provisional con Views en `BuddyAvatar` | No hay arte oficial; se reemplaza ese archivo al recibirlo |
| 2026-10-10 | Inter local con `expo-font` | Identidad de marca sin dependencias npm nuevas |
| 2026-10-10 | Solo modo claro en 1A | Validar la paleta en dispositivo antes de diseñar el oscuro |
| 2026-10-10 | Gradientes con `experimental_backgroundImage` + color sólido de respaldo | Evita `expo-linear-gradient`; react-native-web no los soporta |
| 2026-10-10 | Jest 29 + RNTL 13 (`react-test-renderer` 19.2.3) | `jest-expo@57` usa Jest 29; RNTL 14 requiere otro renderer |
| 2026-10-10 | Mock de Reanimated en `jest.setup.ts` + resolver de worklets | Reanimated 4 necesita módulos nativos en pruebas |

## Roadmap
1A+1B (hecho) → 1C medicamentos ficticios con horarios puros + chequeo diario local → 1D chat, sueño, salud y panel cuidador ficticios → 2 Supabase (auth, perfiles, RLS, `expo-secure-store`) → 3 medicamentos persistentes + notificaciones (development build) → 4 bienestar real → 5 vínculo cuidador y alertas → 6 IA vía Edge Functions → 7 captura por foto (borrador no confirmado) → 8 análisis farmacológico (bloqueado hasta el checklist de `buddy-medical-safety`) → 9 ubicación → 10 calidad y lanzamiento.

## Riesgos abiertos
- Arte oficial del robot, icono de app y splash pendientes (hoy son los de Expo).
- Web: NativeTabs dibuja una tira superior que tapa el título de las pestañas. La web no es prioritaria; si se necesita, añadir `(patient)/_layout.web.tsx` con `expo-router/ui`.
- ESLint no está instalado (`expo lint` falla); requiere autorización para añadir `eslint` + `eslint-config-expo`.
- Notificaciones: puntualidad no garantizada (optimización de batería en Android, límite de ~64 pendientes en iOS). Probar en dispositivos reales en la Fase 3.
- Fuentes farmacológicas: la API de interacciones de RxNav fue retirada; cobertura de INVIMA sin verificar.
- Regulación en Colombia (Ley 1581/2012; posible software como dispositivo médico): asesoría antes de la Fase 8.
