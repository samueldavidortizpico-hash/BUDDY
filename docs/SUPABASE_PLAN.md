# Plan de conexión con Supabase (Fase 2)

**Estado (11-10-2026): nada de esto está conectado.** La app funciona en modo local (`EXPO_PUBLIC_AUTH_PROVIDER=local`,
`EXPO_PUBLIC_DATA_SOURCE=local`). Los adaptadores de `src/infrastructure/supabase` existen pero **no se han probado
contra un proyecto real**. Este documento es el contrato para conectarlos sin cambiar las pantallas.

## 1. Cuentas y roles

| Rol | Quién | Cómo se crea | Qué puede hacer |
|---|---|---|---|
| `caregiver` (administrador) | Familiar o cuidador | Se registra solo (`auth.signUp`) | Todo: perfil, rutina, asistente, accesos, ubicación (solicitar), ajustes |
| `elder` (adulto mayor) | La persona cuidada | **La crea su administrador** | Responder, pedir ayuda, llamar, aceptar/rechazar/revocar su ubicación |

La matriz de permisos vive en `src/domain/permissions.ts` (`can(rol, acción)`) y tiene pruebas unitarias. Las
políticas RLS deben replicarla en el servidor; la app nunca es la única barrera.

### Cuentas del adulto mayor creadas por su administrador

Crear una cuenta **para otra persona** exige la clave `service_role` (o la API de administración de Auth). Esa clave
salta RLS y **nunca** puede estar en la app (las variables `EXPO_PUBLIC_*` se incrustan en el binario). Por eso:

1. La app llama a la Edge Function `manage-elder-account` con el JWT del administrador:
   `POST { action: 'create' | 'reset' | 'revoke', elder_id, email?, password? }`.
2. La función verifica con el JWT que quien llama es `caregiver` y dueño del `elder_id` (consulta `elders.owner_user_id`).
3. Con la clave de servicio (secreto de la función) hace `auth.admin.createUser({ email, password, email_confirm: true,
   user_metadata: { role: 'elder', owner_id, elder_id, name } })`, `updateUserById` (restablecer) o
   `updateUserById({ ban_duration })` (revocar). Registra la acción en `access_audit`.
4. Responde sin devolver la contraseña. La app muestra el estado (activo/desactivado) con `managedAccount`.

Hoy, en local, `LocalAuthProvider.createManagedAccount` hace lo mismo en el almacenamiento seguro del teléfono
(`buddy.managed.<elderId>` → correo; la cuenta guarda `role: 'elder'`, `ownerId`, `elderId`, `revoked`). En
`SupabaseAuthProvider` esos métodos lanzan `not_configured` hasta que exista la función.

### Rol en la sesión

`AuthUser.role`, `ownerId` y `elderId` salen de `user_metadata` (Supabase) o de la cuenta local. `dataOwnerId(user)`
devuelve la cuenta dueña de los datos: el administrador, también cuando entra el adulto mayor. Cada escritura guarda
`ownerUserId` (dueño) y `createdBy` (autor real).

## 2. Reflejo entre dos celulares (administrador ⇄ adulto mayor)

**Hoy no funciona entre dos celulares** (no hay servidor). Sí funcionan, en el mismo teléfono: la vista previa en vivo,
"Probar como [nombre]" y la entrega del teléfono con PIN. La app lo dice en "Entregar a [nombre]" y en la pantalla del
adulto mayor cuando su celular aún no tiene datos.

Lo que ya está preparado en el código:

| Pieza | Dónde | Estado |
|---|---|---|
| Casos de uso únicos para escribir (Rutina, BUDDY y formularios usan los mismos) | `src/state/actions.ts`, `care.ts`, `assistant.ts` | Hecho |
| ChangeLog local: cada escritura deja `{ id, entity, entityId, op, author, ownerUserId, updatedAt, version, syncStatus }` | `src/infrastructure/local/db.ts` | Hecho y probado |
| `version` por registro (sube en cada cambio) y `syncStatus: 'pending'` | `SyncMeta` | Hecho |
| `db.subscribe(colección, fn)`: las pantallas y el motor reaccionan al instante | `db.ts` | Hecho y probado |
| SyncEngine con reglas de conflicto | `src/infrastructure/sync/engine.ts` | **Desactivado** (`SYNC_ENABLED = false`), probado con transporte simulado |

### Reglas de conflicto

1. El administrador manda sobre la **rutina** (perfil, medicamentos, horarios, agua, comidas, actividades, contactos,
   citas, recordatorios). Un cambio del adulto mayor en esas tablas se rechaza (RLS: `with check (auth_role() = 'caregiver')`).
2. El adulto mayor solo **agrega eventos** (tomas confirmadas, agua, comidas, actividades, chequeo, pedir ayuda,
   ubicación). Cada evento tiene su id; si el mismo id llega de ambos lados gana la versión más alta y, a igual versión,
   el `updated_at` más reciente.
3. Un borrado lógico del administrador en la rutina gana siempre.

### Cómo funcionará con Supabase

1. **Celular del administrador**: cada caso de uso escribe local, deja la entrada en el ChangeLog y el SyncEngine sube
   las pendientes (`upsert` por tabla). Un fallo nunca se descarta en silencio: queda en la cola visible (ronda v2.3).
2. **Celular del adulto mayor**: al iniciar sesión con su acceso descarga **solo su perfil** (RLS:
   `elder_id = auth_elder_id()`), lo guarda local y **programa sus notificaciones locales** con el
   `NotificationScheduler` a partir de esos datos. Cada vez que llega un cambio, se reprograma.
3. **Respuestas del adulto mayor**: se escriben local (funcionan sin red) y se suben como eventos.
4. **Realtime**: ambos celulares se suscriben a `postgres_changes` filtrado por `elder_id`. Al llegar un cambio, el
   SyncEngine lo aplica con las reglas de arriba y `db.subscribe` actualiza las pantallas al instante. Realtime es solo
   el aviso: la fuente de verdad sigue siendo la tabla (si se pierde un aviso, el siguiente `pull` lo recupera).
5. **Avisos con la app cerrada en el otro celular** (p. ej. "Elis pidió ayuda" en el teléfono del administrador)
   requieren notificaciones remotas (Expo Push + build instalable): Fase 3.

### Tablas y RLS (borrador)

Cada tabla lleva `owner_user_id`, `elder_id`, `created_by`, `version`, `updated_at`, `deleted_at`. Políticas:

- Administrador: `owner_user_id = auth.uid()` para leer y escribir.
- Adulto mayor: lectura `elder_id = (auth.jwt() -> 'user_metadata' ->> 'elder_id')::uuid`; escritura solo en tablas de
  eventos y solo con `created_by = auth.uid()`.
- `access_audit`: inserción por Edge Functions; lectura solo del administrador dueño.
- Pruebas de RLS obligatorias antes de activar (Fase 4): un adulto mayor no puede leer a otro; un administrador no ve
  personas de otro administrador.
