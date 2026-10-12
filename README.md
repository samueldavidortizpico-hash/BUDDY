# BUDDY

BUDDY es una aplicación móvil Expo para ayudar a familiares y cuidadores a organizar rutinas, medicamentos y registros de bienestar de adultos mayores. La experiencia prioriza una pantalla sencilla para el adulto mayor y un panel de organización para el cuidador.

> **Estado actual:** prototipo funcional con datos locales. La autenticación local y la sincronización con Supabase no equivalen a un servicio de producción validado. No se deben usar datos reales de salud hasta completar la revisión de privacidad, seguridad y operación descrita en `docs/AUDITORIA_INTEGRAL_Y_MEJORAS.md`.

## Ejecutar la app

```bash
npm install
npx expo start
```

Abre el proyecto con Expo Go para el ciclo de desarrollo. Las pruebas web y Jest no sustituyen la validación en teléfonos iOS y Android.

## Flujo principal

- **Cuidador:** inicia sesión, completa el registro del familiar y organiza la rutina desde las pestañas Resumen, Rutina, BUDDY, Salud y Ajustes.
- **Vista del adulto:** en Resumen, pulsa **Ver pantalla de [nombre]** para abrir una vista previa de solo lectura.
- **Entregar el teléfono:** desde Rutina usa **Entregar a [nombre]**. La salida al modo familiar se protege con PIN.

## Comprobaciones locales

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npm run check:headers
npx expo-doctor
npx expo install --check
```

## Organización del código

- `src/app/`: rutas y layouts de Expo Router.
- `src/features/`: pantallas y flujos por dominio.
- `src/components/`: componentes compartidos, incluido el robot vectorial.
- `src/domain/`: reglas y modelos de negocio.
- `src/state/`: estado de sesión, datos y acciones.
- `src/infrastructure/`: persistencia local, autenticación y adaptadores de Supabase.
- `src/theme/`, `src/i18n/`: apariencia, accesibilidad visual y textos.
- `src/__tests__/`: regresiones de rutas y flujos.

Consulta `docs/ARQUITECTURA_ACTUAL.md`, `docs/PANTALLAS_CHECKLIST.md` y `docs/AUDITORIA_INTEGRAL_Y_MEJORAS.md` antes de realizar cambios de estructura o de producto.
