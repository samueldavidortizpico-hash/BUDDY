# Arquitectura actual de BUDDY

**Revisado:** 11 de octubre de 2026. Esta guía describe el código presente; no es una promesa de que todos los adaptadores estén validados en producción.

## Cómo se mueve una pantalla

```text
src/app (ruta Expo Router)
   ↓ compone
src/features + src/components
   ↓ consulta y ejecuta
src/state + src/domain
   ↓ adapta
src/infrastructure/local o src/infrastructure/supabase
```

Las reglas compartidas y puras van en `src/domain`. Las rutas y layouts viven en `src/app`. Evita poner lógica de negocio nueva directamente en una pantalla si puede expresarse como regla o acción del dominio.

## Carpetas

| Carpeta | Responsabilidad actual |
|---|---|
| `src/app/(auth)` | Bienvenida, onboarding, registro, inicio y recuperación. |
| `src/app/(caregiver)/(tabs)` | Resumen, Rutina, BUDDY, Salud y Ajustes del cuidador. |
| `src/app/(caregiver)` | Registro del familiar, medicación, vista previa, alertas y páginas secundarias. |
| `src/app/elder` | Modo de pantalla del adulto mayor y retorno protegido por PIN. No es un segundo conjunto completo de pestañas. |
| `src/features` | Flujos reutilizables principales: experiencia del adulto, registro, resumen y métricas. |
| `src/domain` | Tipos, horarios, fechas, validaciones, estado “Ahora”, asistente local, existencias y revisión limitada de medicamentos. |
| `src/state` | Stores y acciones para sesión, datos, cuidado, navegación, demostración y entrega del teléfono. |
| `src/infrastructure/local` | Base Zustand/AsyncStorage y autenticación local. |
| `src/infrastructure/supabase` | Cliente, autenticación y sincronización opcionales; el código indica que falta validación con un proyecto Supabase real. |
| `src/components` | Controles, superficies, feedback, navegación y robot SVG/animado compartidos. |
| `src/theme`, `src/i18n` | Tokens/proveedor de tema y textos en español de Colombia. |
| `src/__tests__`, `src/**/__tests__`, `src/testing` | Regresiones, comprobaciones unitarias y fixtures deterministas. |

## Dos modos que conviene no confundir

1. **Vista previa:** el cuidador ve desde `/preview` la experiencia del adulto en modo de solo lectura. El acceso ahora aparece también en Resumen.
2. **Entrega del teléfono:** desde Rutina, el cuidador pasa el teléfono al adulto. El layout `/elder` muestra una sola pantalla simplificada hasta que el cuidador salga con PIN.

La previa no debe guardar respuestas, sincronizar dosis, llamar contactos ni cambiar ajustes. El modo entregado sí permite registrar respuestas del adulto. La navegación real se prueba con `renderRouter`, pero aún falta comprobarla en Expo Go.

## Estado y almacenamiento

- `src/infrastructure/local/db.ts` contiene el store persistido Zustand, esquema `buddy.db`, registros tipados y borrado lógico.
- La base usa `@react-native-async-storage/async-storage`: no asumir cifrado de salud en reposo.
- `src/infrastructure/secure-storage.ts` usa SecureStore nativo para credenciales/sesión locales; eso no convierte la base de salud en cifrada.
- `src/infrastructure/index.ts` selecciona autenticación y fuente de datos por `EXPO_PUBLIC_AUTH_PROVIDER` y `EXPO_PUBLIC_DATA_SOURCE`; por defecto ambas son locales.
- La sincronización en `src/infrastructure/supabase/sync.ts` implementa un flujo local-primero, pero su encabezado dice que no se ha probado contra un proyecto real. Confirmar esquema, RLS, conflictos, borrado y fallos antes de activarla para usuarios.
- No registrar contraseñas, PIN, tokens, datos de salud ni contenido de mensajes. Los errores de sincronización deben ser visibles y reintentables, no descartados en silencio.
- `app.json` configura cámara y galería con descripciones en español para builds nativas y deshabilita grabación de micrófono/audio, que el flujo actual de fotos no usa. Expo Go usa los permisos del binario Expo Go y no confirma estas descripciones del binario propio.

## Stack verificado en `package.json`

Expo SDK 58, React Native 0.88, React 19, TypeScript 6, Expo Router, Reanimated 4, Zustand 5, AsyncStorage, SecureStore, React Native SVG y Jest con `jest-expo`/RNTL. Consultar el manifest antes de cambiar APIs Expo o nativas, ya que se actualiza con los SDK.

## Validación esperada por cambio

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npm run check:headers
npx expo-doctor
npx expo install --check
```

Jest y la web no reemplazan una sesión de Expo Go. Para cambios en rutas, voz, PIN, animación, accesibilidad, almacenamiento, cámara o permisos, hacer además revisión manual en iOS y Android. No actualizar dependencias nativas mayores sin un motivo y una build de desarrollo apropiada.
