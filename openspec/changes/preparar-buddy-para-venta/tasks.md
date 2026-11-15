# Tasks

## 1. Oferta honesta (Fase A, sin servidor)

- [ ] 1.1 Agregar `requires` a cada beneficio de `PLANS` en `src/config/plans.ts` (`server`, `watch`, `doctorReport` o ninguno) y `FEATURES.doctorReport = false`. Verificar: prueba unitaria que lista qué beneficios quedan disponibles con capacidades locales (Plus: chat, historial, sueño; Salud y Familiar: ninguno propio).
- [ ] 1.2 Implementar `benefitAvailable` y `planPurchasable` como funciones puras en `src/domain/entitlements.ts`. Verificar: pruebas de los escenarios "Plan con beneficios pendientes" y "Plan con parte disponible".
- [ ] 1.3 Pantalla de planes (`src/app/(caregiver)/plus.tsx`): separar "Incluido" de "Próximamente", ocultar precio y botón de compra en planes no comprables y no ofrecer la opción anual mientras `yearly` sea `null`. Verificar: prueba con React Native Testing Library que Familiar no tiene botón de compra y que no aparece ningún porcentaje de ahorro.
- [ ] 1.4 Revisar que las funciones de seguridad no dependan del plan ni de su vencimiento. Verificar: prueba que con plan `free` y suscripción vencida siguen activos recordatorios, aviso escalonado, existencias, chequeo diario y pedir ayuda.

## 2. Roles y permisos como datos

- [ ] 2.1 Crear `src/domain/permissions-matrix.json` con `version: 1` y cada acción actual con sus roles; migrar `can()` a leerla sin cambiar resultados. Verificar: prueba que compara el `can()` anterior y el nuevo en todos los pares rol × acción.
- [ ] 2.2 Agregar el rol `family` con nivel `viewer | admin` a `Role`, `AuthUser` y la matriz (admin = titular salvo `delete_account`, `manage_plan` y `manage_members`). Verificar: pruebas de los escenarios "Familiar que solo ve", "Familiar administrador" y "Familiar administrador no toca la cuenta".
- [ ] 2.3 Extender `canAccessRecord` a `family` (alcance por persona compartida) y rechazar roles desconocidos al leer la sesión. Verificar: pruebas "Pedir un registro de otra persona por su id" y "Rol desconocido".
- [ ] 2.4 Prueba que falla si una acción usada por la app no está en la matriz. Verificar: la prueba falla al agregar una acción ficticia y pasa al quitarla.

## 3. Publicación en tiendas (Fase A)

- [ ] 3.1 Quitar "Versión de demostración con datos de ejemplo" de `expo.description` y `expo.web.description` en `app.json` y revisar que la ficha no prometa diagnóstico ni emergencias. Verificar: `grep -i "demostraci" app.json` sin resultados.
- [ ] 3.2 Crear `scripts/check-release.mjs` (D8) y engancharlo como `eas-build-pre-install` solo en el perfil `production`. Verificar: el script falla con `EXPO_PUBLIC_DEV_TOOLS=1` y pasa sin ella.
- [ ] 3.3 Completar la política de privacidad (`strings.legal.privacy`) con tipos de datos de salud, dónde se guardan, con quién se comparten, retención y cómo borrarlos, y escribir `docs/DECLARACIONES_TIENDAS.md` con el borrador de Data safety (Google) y etiquetas de privacidad (Apple) coherentes con ella. Verificar: revisión cruzada de los tres textos en la misma tabla.
- [ ] 3.4 Revisar que el permiso de notificaciones se pida al configurar los recordatorios y con su explicación. Verificar: prueba de la pantalla de permisos.

## 4. Contrato de integración (Fase B)

- [ ] 4.1 Crear `supabase/functions/_shared/contract.ts` (versión, entradas, salidas y errores de `manage-linked-account`, `delete-account`, `dispatch-alerts` y `entitlements-webhook`) y reexportarlo en `src/domain/contracts.ts`. Verificar: `npx tsc --noEmit` y una prueba de tipos de cada respuesta.
- [ ] 4.2 Migración `supabase/migrations/0001_schema.sql`: tablas de `TABLES` (`src/infrastructure/supabase/sync.ts`) con `owner_id`, `elder_id`, `updated_at`, borrado lógico y RLS activado, más `care_members`, `permission_matrix`, `push_tokens`, `heartbeats`, `alert_outbox` y `entitlements`. Verificar: `supabase db reset` sin errores.
- [ ] 4.3 Migración `0002_policies.sql` con `is_member(elder_id, min_level)` (`security definer`, `search_path` fijo) y políticas por tabla generadas desde la matriz. Verificar: pruebas pgTAP de "Lectura de otra cuenta", "Tabla nueva sin política" y "El titular intenta aceptar la ubicación por la persona".
- [ ] 4.4 Prueba de contrato de permisos: cada par rol × acción da el mismo resultado en `can()` y en `permission_matrix`. Verificar: prueba "App y servidor coinciden".
- [ ] 4.5 Edge Function `manage-linked-account` (crear, restablecer, revocar y cambiar correo de `elder`, `nurse` y `family`; escribe `care_members` y `app_metadata`). Verificar: pruebas "El titular crea el acceso de su mamá" y "Otra cuenta intenta crear el acceso".
- [ ] 4.6 Edge Function `delete-account` (borra cuentas vinculadas primero y luego al titular, con reintento seguro). Verificar: pruebas "Borrado completo" y "Falla a mitad".
- [ ] 4.7 Conectar `src/infrastructure/supabase/auth.ts` a las dos funciones en lugar de lanzar `not_configured`, mapeando la lista cerrada de errores. Verificar: pruebas del proveedor con un cliente simulado.
- [ ] 4.8 Rechazo por versión de contrato: la app envía su versión y muestra "Actualiza BUDDY" sin borrar datos locales. Verificar: prueba "App desactualizada".

## 5. Avisos remotos (Fase B)

- [ ] 5.1 Registrar el `ExpoPushToken` de cada cuidador en `push_tokens` y enviar señales de vida del adulto mayor a `heartbeats` (apertura, respuesta y estado de permisos). Verificar: prueba de que se envía una señal al confirmar una toma.
- [ ] 5.2 Copiar las reglas de vencimiento de `src/domain/status.ts` a `_shared` y escribir la prueba de equivalencia. Verificar: los mismos casos (incluida la medianoche en la zona de la persona) dan el mismo resultado en ambos lados.
- [ ] 5.3 Edge Function `dispatch-alerts` con `alert_outbox` (clave única por hecho), horario silencioso y textos sin "emergencia", programada con `pg_cron` cada minuto. Verificar: pruebas "Toma sin confirmar", "Confirmación tardía", "Ayuda de noche" y "Texto del aviso".
- [ ] 5.4 Pasada de recibos: desactivar tokens `DeviceNotRegistered` y reintentar a 1, 5 y 15 minutos. Verificar: pruebas "Teléfono reemplazado" y "Reintento tras error".
- [ ] 5.5 Aviso "No puedo verificar" por silencio o avisos apagados, y estado de entrega visible en Ajustes. Verificar: prueba "Teléfono apagado" y que el Inicio no muestra "está bien".

## 6. Cobro con servidor (Fase B)

- [ ] 6.1 Edge Function `entitlements-webhook` que verifica la firma de RevenueCat y escribe `entitlements`. Verificar: una firma inválida responde `unauthorized` y no escribe nada.
- [ ] 6.2 Con servidor activo, leer el plan del titular desde `entitlements` para todas sus cuentas vinculadas. Verificar: pruebas "Enfermera del titular con plan Salud" y "Dos cuentas en un teléfono".
- [ ] 6.3 Volver comprables Salud y Familiar solo cuando `server` esté disponible. Verificar: prueba de `planPurchasable` con y sin servidor.

## 7. Verificación y aprobación

- [ ] 7.1 Correr `npx tsc --noEmit`, `npx expo lint` y `npx jest`. Verificar: los tres sin errores.
- [ ] 7.2 Revisar los cambios de las secciones 2, 4, 5 y 6 con `buddy-medical-safety` y `buddy-testing` antes de aprobar la fase. Verificar: lista de chequeo de ambas skills completa en el PR.
- [ ] 7.3 Prueba en dos teléfonos reales (titular y adulto mayor) del recorrido "toma sin confirmar → aviso con la app cerrada", según `docs/PRUEBAS_EN_DISPOSITIVO.md`. Verificar: registro con hora de la toma, hora del aviso y capturas.

## Workflow follow-up

- Tras aplicar y verificar, archivar el change con `/opsx:archive` para crear las primeras especificaciones en `openspec/specs/`.
- La Fase B requiere que el dueño cree un proyecto Supabase y las cuentas de App Store Connect, Play Console y RevenueCat.
