# Proposal

## Why

BUDDY promete "aunque no estés a su lado, sabes que está bien; y si algo no lo está, te enteras a tiempo", y lo cobra
en tres planes de pago. Pero hoy todo vive en UN teléfono: el aviso al hijo se calcula solo cuando él abre el Inicio en
ese mismo celular (`docs/NOTIFICACIONES_REMOTAS.md`), el modo Supabase está "implementado pero no probado" y no existen
las migraciones, las políticas RLS ni las Edge Functions que el código cita. Varios beneficios que se venden (avisos en
el celular de la enfermera, hermanos que ven lo mismo, reloj inteligente, reporte PDF para el médico) no tienen código
que los entregue. Vender así es incumplir la promesa y arriesga el rechazo en las tiendas y reclamos de consumidores.

Este cambio define los contratos que hacen la promesa verdadera (roles, permisos, integración con el servidor, avisos
remotos, cobro) y corrige ya, en la app, todo lo que hoy se ofrece sin poder entregarse.

## What Changes

- **Oferta honesta**: cada beneficio de un plan declara si está disponible; lo no disponible se muestra como
  "Próximamente", no se puede comprar y no cuenta como motivo de pago. Los planes Salud y Familiar no se venden hasta
  que exista el servidor. El reporte PDF y el reloj salen de la lista de beneficios mientras no existan.
- **Roles y permisos**: la matriz de permisos pasa a ser un contrato versionado con un cuarto rol, `family` (familiar
  invitado), con dos niveles: `viewer` (solo ve) y `admin` (administra como el titular, sin borrar la cuenta ni
  cambiar el plan). La misma tabla alimenta la app y las políticas RLS.
- **Contratos de integración** (servidor): esquema de tablas con RLS por dueño y por persona, y cuatro Edge Functions
  con entrada y salida tipadas: `manage-linked-account`, `delete-account`, `dispatch-alerts` y `entitlements-webhook`.
  Se agregan en `supabase/` como borradores probados contra Postgres local, sin desplegar.
- **Avisos remotos**: el servidor detecta "sin confirmar", "pidió ayuda" y "no puedo verificar" con las apps cerradas
  y avisa por Expo Push, sin duplicados y con reintentos. La app registra su token y muestra el estado de verificación.
- **Publicación en tiendas**: se quita "Versión de demostración con datos de ejemplo" de la descripción, se completan
  textos de permisos, la eliminación de cuenta funciona también en remoto y los textos legales cubren datos de salud.
- **BREAKING (datos locales)**: `Role` agrega `family`; las cuentas existentes siguen siendo `caregiver` (sin migración
  destructiva).

## Capabilities

### New Capabilities
- `access/roles-permissions`: quién puede hacer qué sobre cada persona y registro (titular, familiar invitado con
  nivel, adulto mayor, enfermera), en la app y en el servidor.
- `integration/backend-contract`: tablas, RLS, Edge Functions y su contrato tipado entre la app y Supabase.
- `alerts/remote-delivery`: detección en el servidor y entrega por push al celular de cada cuidador.
- `commerce/plan-offering`: qué se ofrece en cada plan, cómo se muestra lo no disponible y cuándo se puede cobrar.
- `release/store-readiness`: requisitos para publicar en App Store y Google Play (descripción, permisos, eliminación
  de cuenta, textos legales).

### Modified Capabilities
<!-- Ninguna: openspec/specs/ está vacío; estas son las primeras especificaciones del proyecto. -->

## Impact

- **App**: `src/config/plans.ts`, `src/domain/entitlements.ts`, `src/domain/permissions.ts`, `src/domain/types.ts`,
  `src/domain/auth.ts`, `src/infrastructure/supabase/*`, `src/infrastructure/notifications.ts`, pantalla de planes
  (`src/app/(caregiver)/plus.tsx`), invitación familiar, `app.json`, textos en `src/i18n/es-CO.ts`.
- **Nuevo**: `supabase/migrations/*.sql`, `supabase/functions/*` (Deno), pruebas de RLS.
- **Dependencias**: ninguna nueva en la app. El servidor requiere un proyecto Supabase (decisión y costo del dueño) y,
  para cobrar, cuentas en App Store Connect, Play Console y RevenueCat.
- **Fuera de alcance**: IA generativa (sigue el motor de reglas), integración con relojes, reporte PDF, cifrado local
  en producción (SEC-08, cambio aparte).
