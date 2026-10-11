# BUDDY — Arquitectura

> Documento vivo. Última actualización: 2026-10-10 · Fase 1 completa (interfaz con datos ficticios locales).
> Ver también: DECISIONS.md, DESIGN_SYSTEM.md, PANTALLAS_CHECKLIST.md y ACCESSIBILITY_AUDIT.md.

## Stack
Expo SDK 57 · React Native 0.86 · React 19.2 (React Compiler) · TypeScript 6 (`strict`) · Expo Router (`src/app`, typed routes) · Reanimated 4 · Zustand 5 + AsyncStorage · expo-linear-gradient · react-native-svg · expo-haptics · Manrope (`@expo-google-fonts/manrope`) · Jest 29 + jest-expo + RNTL 13.

## Capas
```
Pantalla (src/app)  →  hook (src/features/*/hooks.ts)  →  caso de uso (use-cases.ts / schedule.ts, lógica pura)
                                                        →  contrato (src/repositories/contracts.ts)
                                                        →  implementación local (src/repositories/in-memory.ts)
                                                        →  store persistido (src/store, AsyncStorage "buddy-store-v1")
```
- Las pantallas y los componentes **no** importan store, repositorios ni casos de uso (verificado con grep y graphify, sin ciclos).
- Los hooks leen con `useSyncExternalStore` (`useRepositoryValue`) y ejecutan acciones con casos de uso que reciben el repositorio.
- Los datos ficticios viven en `src/features/*/demo-data.ts` (`demo: true`); `src/store/demo-state.ts` arma el estado inicial.
- En la Fase 2 se sustituye `in-memory.ts` por una implementación con Supabase, sin cambiar pantallas ni casos de uso.

```
src/
  app/                      rutas (Expo Router)
    (auth)/                 index (bienvenida), onboarding, profile-choice
    (patient)/(tabs)/       home, medications, chat, wellness
    (patient)/              health, sleep, mood, symptoms, reports, safety, settings/{index,[section]}, medication/[id]
    (caregiver)/(tabs)/     summary, tracking, alerts, account
    modals/                 add-medication, reminder, emergency, add-vital
    dev/gallery             solo __DEV__
  components/               UI compartida
  features/<dominio>/       medications, wellbeing, sleep, vitals, chat, caregiver, profile, reports
  repositories/             contratos + implementación local
  store/                    Zustand persistido + estado de demostración
  hooks/                    useRepositoryValue, useNow
  theme/                    tokens
  types/domain.ts           modelo de dominio
  utils/                    fechas es-CO, ids, haptics
```

## Modelo de dominio (resumen)
- **Medication:** concentración (`strengthValue` + `strengthUnit`) separada de la dosis (`doseAmount` + `form`); frecuencia `daily | alternate | as_needed`; horas `HH:mm`; inicio y fin.
- **DoseEvent:** `pending | taken | snoozed | skipped` + `confirmedByUser`, `respondedAt` y `snoozedTo`. "Sin confirmar" se calcula (60 min sin respuesta) y no se guarda.
- **MoodEntry, SymptomEntry, SleepEntry, VitalEntry** (`source: 'manual'`), agua y hábitos por fecha, **ChatMessage**, **FollowUpAlert** (seguimiento, no clínico), **Settings** (rol, tamaño de texto, notificaciones, ubicación compartida).

## Navegación
Stack raíz con fuentes y espera de hidratación. Grupos `(auth)`, `(patient)` y `(caregiver)`, cada uno con su Stack; dentro de los dos últimos, `Tabs` de `expo-router/js-tabs` con `BottomTabBar` propia. Los modales usan `presentation`. La bienvenida redirige según el rol guardado. Cerrar sesión borra el rol y vuelve a `/`.

## Pruebas
`npm test`. Incluye:
- Unitarias: horarios (fin de mes, 29 de febrero, cambio de año, días alternos), estados, validación, etiquetas, chat y contraste.
- Integración con `renderRouter` sobre las rutas reales: navegación, registro de medicamento, confirmación, bienestar, chat, ajustes y cuidador.
- Humo de todas las rutas.

## Riesgos abiertos
- Robot, logo e iconos son provisionales: el PNG del Figma dice "BUDY". Falta el arte final.
- Notificaciones (Fase 3): no hay puntualidad garantizada en Android ni en iOS; requieren development build.
- Fuentes farmacológicas sin definir (bloquea la revisión de seguridad).
- Regulación en Colombia (Ley 1581/2012; posible software como dispositivo médico).
- Prueba manual en dispositivo (TalkBack, VoiceOver y texto al 200 %) pendiente.
