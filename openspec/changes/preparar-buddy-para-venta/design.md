# Design

## Context

Ver proposal.md (Why). Estado observado en el código el 2026-11-13:

- `AUTH_PROVIDER` y `DATA_SOURCE` valen `local` por defecto (`src/infrastructure/index.ts`); no hay `.env` en el repo.
- `src/infrastructure/supabase/{auth,sync}.ts` dicen "implementado pero no probado". `createManagedAccount`,
  `resetManagedPassword`, `revokeManagedAccount` y `changeManagedEmail` lanzan `not_configured` en Supabase.
- El código y `docs/SUPABASE_PLAN.md` citan `supabase/migrations`, pero la carpeta `supabase/` no existe.
- `Role = 'caregiver' | 'elder' | 'nurse'`; no hay familiar invitado, aunque el plan Familiar lo vende.
- `can()` en `src/domain/permissions.ts` es código, no datos; RLS "replicará" la regla, pero no hay RLS.
- `PLANS` lista beneficios sin código: reporte PDF (sin implementación), reloj (`FEATURES.watch = false`), avisos
  en el celular de la enfermera y hermanos que ven lo mismo (requieren servidor).
- Los avisos al titular se calculan al abrir el Inicio en el mismo teléfono (`docs/NOTIFICACIONES_REMOTAS.md`).
- `app.json` describe la app como "Versión de demostración con datos de ejemplo".
- `FEATURES.devTools` se enciende en una compilación de tienda si `EXPO_PUBLIC_DEV_TOOLS=1`.

Restricciones: no instalar dependencias en la app sin autorización; Expo SDK 58; reglas de `buddy-medical-safety`
(nunca receta ni diagnostica; nunca "emergencia" para una toma sin confirmar).

## Goals / Non-Goals

**Goals:**
- Fase A (sin servidor, se puede hacer ya): la app deja de vender lo que no entrega y queda lista para la ficha de
  tienda del plan gratis; la matriz de permisos se vuelve datos versionados con el rol `family`.
- Fase B (con proyecto Supabase): esquema, RLS, Edge Functions y avisos remotos, con pruebas contra Postgres local.

**Non-Goals:**
- Desplegar a un proyecto Supabase real o crear productos en las tiendas (requieren cuentas y costos del dueño).
- IA generativa, reloj, reporte PDF, cifrado local en producción.

## Decisions

### D1. Dos fases, y la Fase A no depende de la B
La Fase A se publica sola: plan gratis completo y planes de pago en "Próximamente". Así BUDDY puede salir a la tienda
y validar uso sin cobrar por lo que falta. *Alternativa descartada:* esperar al servidor para publicar todo junto; es
lo que hoy impide vender nada.

### D2. Disponibilidad de beneficios calculada, no escrita a mano
Cada beneficio de `PLANS` lleva un `requires` (`server`, `watch`, `doctorReport` o ninguno). Una función pura
`benefitAvailable(requires, caps)` decide con las capacidades de la compilación (`server` = `AUTH_PROVIDER` y
`DATA_SOURCE` en supabase, `FEATURES.watch`, `FEATURES.doctorReport`). La pantalla separa "Incluido" de
"Próximamente", y `planPurchasable(plan)` es verdadero si al menos un beneficio propio del plan está disponible. *Alternativa:* un booleano `available` por beneficio a mano;
se descarta porque se desincroniza al encender el servidor.

### D3. Matriz de permisos como datos, una sola fuente
`src/domain/permissions-matrix.json` contiene `version` y, por cada acción, los roles (y nivel de `family`) que la
pueden hacer. La app la importa; un script la convierte en la migración `permission_matrix` que leen las políticas.
Una prueba de contrato recorre todos los pares rol × acción en los dos lados. `can()` conserva su firma y suma un
parámetro opcional `level`. *Alternativa:* duplicar la regla en SQL a mano; es justo lo que hoy no existe y se desvía.

### D4. Membresías en tabla, no en metadatos
`care_members(owner_id, elder_id, user_id, role, level)` es la fuente del vínculo. `app_metadata` solo guarda una
copia que escribe la Edge Function para que el cliente pinte la interfaz; la RLS consulta la tabla mediante
`is_member(elder_id, min_level)` (`security definer`, `search_path` fijo). Cumple "rol decidido por el servidor".

### D5. Contrato tipado compartido sin dependencias
`supabase/functions/_shared/contract.ts` define versión, entradas, salidas y la lista cerrada de errores de las
cuatro funciones, en TypeScript puro sin imports. La app lo reexporta desde `src/domain/contracts.ts`. Las funciones
validan la entrada a mano (sin librería nueva) y responden `{ ok: true, data } | { ok: false, error }`.

### D6. Avisos remotos con bandeja de salida
`pg_cron` llama cada minuto a `dispatch-alerts`. La función calcula vencimientos con las mismas reglas puras de
`src/domain/status.ts` (copiadas a `_shared`, con prueba de equivalencia), inserta en `alert_outbox` con clave única
`tipo:persona:toma|periodo` (el `on conflict do nothing` evita duplicados), envía por Expo Push y otra pasada lee
los recibos: `DeviceNotRegistered` desactiva el token y los errores pasajeros se reintentan a 1, 5 y 15 minutos. Las
señales de vida van a `heartbeats`.

### D7. Plan en el servidor para cuentas vinculadas
`entitlements-webhook` recibe los eventos de RevenueCat (firma verificada con secreto del servidor) y escribe
`entitlements(owner_id, plan, expires_at)`. Con servidor activo, la app lee el plan del titular desde ahí, y así la
enfermera y los familiares lo heredan sin comprar. Sin servidor sigue el SDK de RevenueCat.

### D8. Compuerta de compilación de tienda
`scripts/check-release.mjs` falla si `EXPO_PUBLIC_DEV_TOOLS=1`, si una descripción contiene "demostración" o "datos
de ejemplo", o si hay un plan comprable con beneficios no disponibles. Corre como `eas-build-pre-install` solo cuando
el perfil es `production`.

## Risks / Trade-offs

- [Con la Fase A solo Plus genera ingresos] → Plus se vende con chat (reglas), historial y tendencias de sueño, que
  sí existen; Salud y Familiar esperan al servidor. Se acepta: es mejor que cobrar por avisos que no llegan.
- [Las pruebas de RLS necesitan Docker y la CLI de Supabase] → si no están, las pruebas de la Fase B se marcan como
  pendientes de ejecutar y no se dan por aprobadas.
- [Reglas de estado copiadas al servidor pueden desviarse] → prueba de equivalencia con los mismos casos en ambos lados.
- [El rol `family` cambia el tipo `Role`] → valor nuevo, sin cambiar los existentes; las cuentas guardadas siguen
  igual y las pruebas de roles cubren el cuarto rol.
- [Importar `_shared` desde la app sale de `src/`] → si Metro o TypeScript no lo aceptan, la fuente pasa a
  `src/domain/contracts.ts` y un script la copia a `_shared` con verificación en CI.

## Migration Plan

1. Fase A en la app, sin interruptores: se publica con el plan gratis. Reversión: revertir el commit.
2. Fase B: aplicar migraciones en un proyecto de pruebas, correr `supabase test db`, desplegar funciones, encender
   `EXPO_PUBLIC_AUTH_PROVIDER=supabase` y `EXPO_PUBLIC_DATA_SOURCE=supabase` solo en el perfil `preview`.
3. Cuando las pruebas en dos teléfonos reales pasen (`docs/PRUEBAS_EN_DISPOSITIVO.md`), encender en `production` y
   marcar Salud y Familiar como comprables. Reversión: volver las variables a `local`; los datos locales no se borran.

## Open Questions

- Precio anual de cada plan (`yearly: null`): no cambia specs; mientras sea `null` la opción anual no se ofrece.
- Región del proyecto Supabase y retención de ubicaciones: se fijan al crear el proyecto.
