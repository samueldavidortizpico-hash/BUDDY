# Sincronización entre el celular del hijo y el del adulto mayor (V4 Fase 4, solo diseño)

Hoy todo vive en un solo celular (`docs/AUDITORIA_BMAD.md`, A-01). Este documento define cómo pasar a dos celulares sin
romper las reglas del producto. **No se conectó ningún servidor en esta ronda.**

## Identidad

- **Administrador (hijo):** cuenta propia con correo y contraseña en el servidor. Es dueño de la persona que cuida.
- **Adulto mayor:** cuenta propia creada por el administrador **en el servidor** (función del servidor, nunca desde la
  app con privilegios), con un código de acceso. Hoy esas cuentas viven en el SecureStore del administrador (A-01).
- **Vinculación:** invitación de un solo uso (código de 8 caracteres ya existente en `src/domain/invites.ts`), válida 7
  días y revocable; el servidor la acepta y crea la relación `cuidador ↔ persona` con su permiso (`ver` o `administrar`).

## Modelo de datos (tablas)

`profiles` (usuario y rol) · `elders` (persona, zona horaria **propia**, A-07) · `care_links` (cuidador, persona, permiso)
· `medications`, `water_plans`, `reminders`, `appointments`, `contacts` (**rutina**) · `dose_events`, `water_logs`,
`checkins`, `locations`, `heartbeats`, `help_requests` (**eventos**) · `alerts` · `push_tokens`.

Cada fila conserva `SyncMeta` (UUID creado en el celular, dueño, persona, borrado lógico). La hora de cambio la pone **el
servidor** (`updated_at` del servidor o un número de secuencia), nunca el reloj del celular (A-06).

## Permisos por rol (igual que `can()` en `src/domain/permissions.ts`)

| Acción | Administrador | Adulto mayor |
|---|---|---|
| Crear y cambiar la rutina | Sí | No |
| Registrar respuestas (tomé, no tomé, agua, chequeo, ayuda) | Sí (con autor) | Sí |
| Aceptar, rechazar o revocar compartir ubicación | No | Sí, solo él |
| Ver datos de la persona | Solo si tiene vínculo | Solo los suyos |

En el servidor: políticas por fila que exijan el vínculo (`care_links`) y el rol; probadas con usuarios de prueba antes de
cualquier dato real (skill `buddy-testing`).

## Sincronización y conflictos

- **Rutina: manda el administrador.** Un cambio del adulto mayor sobre la rutina se rechaza en el servidor.
- **Eventos: solo se agregan.** Nunca se sobrescriben; ya es así en las tomas (`DoseEvent.history`, Fase 1). Dos
  respuestas a la misma toma quedan las dos; la vista muestra la última y el historial (R1).
- **Envío:** cola local de cambios pendientes (ya existe el registro de cambios en `db.ts`, que hoy crece sin límite,
  A-03) que se vacía al tener conexión, con reintentos e idempotencia por UUID.
- **Descarga:** por número de secuencia del servidor desde el último recibido (no por fecha del celular).
- **Un solo motor:** quitar `src/infrastructure/supabase/sync.ts` o `src/infrastructure/sync/engine.ts` y quedarse con
  uno que aplique estas reglas (A-04, A-05).
- **Errores visibles:** si no sincroniza, se dice ("No pude enviar los cambios; lo intento de nuevo"), nunca en silencio
  (S-06).

## Supabase o AWS (recomendación, no decisión)

| | Supabase | AWS (Cognito + API Gateway/Lambda + DynamoDB/Aurora + SNS) |
|---|---|---|
| Ya hay en el código | Cliente, adaptador de cuentas y plan (`docs/SUPABASE_PLAN.md`) | Nada |
| Seguridad por fila | Nativa (RLS en Postgres) | Hay que construirla en cada función |
| Tareas programadas y funciones | `pg_cron` + Edge Functions | EventBridge + Lambda |
| Esfuerzo hasta el piloto | Bajo | Alto |
| Control y escala | Suficiente para el piloto | Máximo, a cambio de más trabajo y costo de operación |
| Región y datos sensibles (Ley 1581) | Elegir región y firmar el acuerdo de tratamiento | Igual, con más opciones de región |

**Recomendación:** Supabase para el piloto (menos trabajo y RLS probada), con las reglas de arriba para no depender de
sus particularidades. **Contraparte:** si el plan comercial exige una nube corporativa o regiones específicas, AWS. La
decisión es del dueño (D-1).
