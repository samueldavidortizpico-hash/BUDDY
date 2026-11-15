# Auditoría de preparación para la venta — BUDDY

**Fecha:** 2026-11-13 · **Rama:** `develop` (`a00c447`) · **Método:** revisión de preparación de BMAD (producto → oferta →
arquitectura → publicación), con evidencia en el código. El plan de corrección está en el change de OpenSpec
`openspec/changes/preparar-buddy-para-venta/` (proposal, 5 specs, design y 30 tareas).

## Dictamen

**BUDDY no está lista para cobrar hoy.** La app es sólida en el teléfono: 916 pruebas pasando, buena accesibilidad,
seguridad gratis para siempre y aislamiento de datos corregido. Pero la promesa que se vende ("aunque no estés a su lado,
te enteras a tiempo") necesita dos teléfonos conectados, y **no existe el servidor** que los conecte. Además, los planes
de pago listan beneficios que no tienen código.

**Ruta corta para salir a la tienda:** la Fase A del change (secciones 1–3, sin servidor) permite publicar el plan gratis y
vender Plus solo con lo que sí existe. Salud y Familiar quedan en "Próximamente" hasta la Fase B (servidor).

## Hallazgos que bloquean la venta

| Id | Gravedad | Qué falla | Evidencia | Se resuelve en |
|---|---|---|---|---|
| V-01 | Crítica | El aviso al hijo solo se calcula cuando él abre el Inicio, en el mismo teléfono. Con dos teléfonos no llega nada. | `docs/NOTIFICACIONES_REMOTAS.md` ("hoy el aviso … solo cuando abre el Inicio y en el mismo celular"); `notifications.ts` solo programa avisos locales. | Tareas 5.1–5.5 |
| V-02 | Crítica | No hay servidor: falta la carpeta `supabase/` (sin migraciones, RLS ni Edge Functions), aunque el código y la documentación la citan. Auth y sync de Supabase dicen "implementado pero no probado". | `src/infrastructure/supabase/sync.ts` (cita `supabase/migrations`); `ls supabase` → no existe; `AUTH_PROVIDER` y `DATA_SOURCE` = `local` por defecto. | Tareas 4.1–4.8 |
| V-03 | Alta | Los planes de pago venden lo que no existe: reporte PDF para el médico (sin código), reloj inteligente (`FEATURES.watch = false`), "la enfermera recibe los avisos en su celular" y "tus hermanos ven lo mismo" (requieren servidor). Riesgo de rechazo en tienda y de reclamo por publicidad engañosa (Estatuto del Consumidor, Ley 1480 de 2011). | `src/config/plans.ts`; búsqueda de `doctor_report`/`pdf` en `src/` → solo aparece en `plans.ts`. | Tareas 1.1–1.3 |
| V-04 | Alta | El plan Familiar vende "cada familiar con su rol: ver o administrar", pero ese rol no existe. | `src/domain/types.ts:30` → `Role = 'caregiver' \| 'elder' \| 'nurse'`. | Tareas 2.2–2.3 |
| V-05 | Alta | La ficha se presenta como "Versión de demostración con datos de ejemplo". Las tiendas rechazan apps de demostración. | `app.json` → `expo.description` y `expo.web.description`. | Tarea 3.1 |
| V-06 | Media | En modo servidor, crear, restablecer, revocar o cambiar el acceso del adulto mayor y de la enfermera lanza `not_configured`: la enfermera no puede tener cuenta en su propio teléfono. | `src/infrastructure/supabase/auth.ts:127-135`. | Tareas 4.5, 4.7 |
| V-07 | Media | Eliminar la cuenta en el servidor depende de una Edge Function que no existe. Ambas tiendas exigen poder borrar la cuenta desde la app. | `supabase/auth.ts` (encabezado); `docs/SUPABASE_PLAN.md`. | Tarea 4.6 |
| V-08 | Media | Las herramientas de desarrollo (galería y selector de plan de prueba) se encienden en una compilación de tienda si `EXPO_PUBLIC_DEV_TOOLS=1`; nada lo impide. | `src/config/features.ts`. | Tarea 3.2 |
| V-09 | Media | No se puede cobrar: precios anuales `null`, sin productos en App Store Connect ni Play Console, sin claves de RevenueCat y sin servidor que comparta el plan con las cuentas vinculadas. | `src/config/plans.ts`; `docs/PAGOS.md` ("Requisitos antes de cobrar"). | Tareas 6.1–6.3 + decisión comercial |
| V-10 | Media | Datos de salud sin cifrado propio en producción (SEC-08, heredado), y la política de privacidad no detalla tipos de datos, retención ni con quién se comparten. En Colombia son datos sensibles (Ley 1581 de 2012) y requieren autorización explícita e informada. | `src/config/features.ts` (`encryptedStorage` solo en desarrollo); `strings.legal.privacy`. | Tarea 3.3; cifrado en un change aparte |
| V-11 | Baja | "BUDDY" es un nombre genérico y `co.buddy.app` no se ha verificado como propio; conviene revisar la marca antes de invertir en la ficha. | `app.json` (`bundleIdentifier`, `package`). | Fuera del código: búsqueda de marca (SIC) |
| V-12 | Baja | El chat responde con reglas, no con IA generativa. La publicidad no debe llamarlo "IA". | `docs/IA_BUDDY.md` ("no hay IA generativa en BUDDY"). | Texto de la ficha (tarea 3.1) |

## Roles y permisos: contrato propuesto

Hoy (`src/domain/permissions.ts`) hay tres roles en código, sin RLS. El change convierte la matriz en datos
versionados que comparten la app y el servidor, y agrega `family`.

| Acción | Titular (`caregiver`) | Familiar `admin` | Familiar `viewer` | Adulto mayor (`elder`) | Enfermera (`nurse`) |
|---|---|---|---|---|---|
| Ver el día, la salud y las novedades | Sí | Sí | Sí | Solo su pantalla | Sí |
| Crear o editar medicamentos y horarios | Sí | Sí | No | No | No |
| Confirmar una toma | Sí | Sí | No | Sí | Sí |
| Llevar existencias (compras y correcciones) | Sí | Sí | No | No | Sí |
| Atender o posponer novedades | Sí | Sí | No | No | Sí |
| Pedir ayuda y llamar a contactos | Sí | Sí | No | Sí | Sí |
| Aceptar, rechazar o revocar su ubicación | **No** | **No** | **No** | **Solo él** | **No** |
| Pedir la ubicación | Sí | Sí | No | — | No |
| Usar el chat de BUDDY (Plus) | Sí | Sí | No | No | No |
| Crear o revocar accesos y familiares | Sí | No | No | No | No |
| Cambiar o pagar el plan | Sí | No | No | No | No |
| Eliminar la cuenta | Sí | No | No | No | No |

Reglas del contrato (spec `access/roles-permissions`): el rol, el nivel y las personas compartidas los decide el
servidor (nunca `user_metadata`); una cuenta vinculada solo ve a sus personas; lo que no está en la matriz se niega.

## Contratos de integración propuestos

Respuesta común: `{ ok: true, data } | { ok: false, error }`, con `error` de una lista cerrada (`unauthorized`,
`forbidden`, `invalid_input`, `not_found`, `conflict`, `rate_limited`, `internal`) y versión de contrato en cada llamada.

| Función del servidor | Entrada | Salida | Regla clave |
|---|---|---|---|
| `manage-linked-account` | `op` (`create`, `reset`, `revoke`, `change_email`), `elderId`, `role` (`elder`, `nurse`, `family`), `level?`, `email?`, `password?` | `{ email, revoked }` | Solo el titular de esa persona; escribe `care_members` y `app_metadata`. Nunca devuelve contraseñas. |
| `delete-account` | `password` | `{ deleted: true }` | Borra primero las cuentas vinculadas y luego al titular; se puede reintentar sin dejar accesos vivos. |
| `dispatch-alerts` | (programada cada minuto con `pg_cron`) | Filas en `alert_outbox` | Una clave por hecho, zona horaria de la persona, ayuda sin esperar y "No puedo verificar" ante el silencio. |
| `entitlements-webhook` | Evento firmado de RevenueCat | Fila en `entitlements` | Firma verificada; las cuentas vinculadas heredan el plan del titular. |

Tablas nuevas además de las 18 de sincronización: `care_members`, `permission_matrix`, `push_tokens`, `heartbeats`,
`alert_outbox` y `entitlements`, todas con RLS y negación por defecto.

## Lo que ya juega a favor de la venta

- Las funciones de seguridad son gratis para siempre y no se bloquean por pago (`src/config/plans.ts`).
- El aislamiento entre cuentas (SEC-01/02), la eliminación de accesos vinculados (SEC-06), las contraseñas con scrypt y
  la comparación en tiempo constante de secretos y PIN ya están corregidos y tienen pruebas.
- El consentimiento de ubicación es del adulto mayor, con permiso solo mientras la app está abierta (`app.json`).
- 916 pruebas en verde, typecheck y lint limpios; accesibilidad con letra grande, alto contraste y "reducir movimiento".
- La presentación de 6 pasos cuenta el ciclo completo con el robot animado.

## Orden recomendado

1. **Fase A (sin costos):** tareas 1–3. Permite publicar el plan gratis y vender Plus honestamente.
2. **Decisiones del dueño:** crear el proyecto Supabase, definir los precios anuales y abrir las cuentas de las tiendas y
   de RevenueCat.
3. **Fase B:** tareas 4–6 (servidor, avisos remotos, cobro compartido) y la 7.3 (prueba en dos teléfonos reales). Solo
   entonces se encienden Salud y Familiar.

## Límites de esta auditoría

- No se probó nada contra un proyecto Supabase real ni contra las tiendas: no existen en este repositorio.
- Las referencias legales (Leyes 1480 y 1581, reglas de App Store y Google Play) son orientativas; la revisión final la
  debe hacer un abogado antes de publicar.
- No se midió el rendimiento en teléfonos de gama baja.
