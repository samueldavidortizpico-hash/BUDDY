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
