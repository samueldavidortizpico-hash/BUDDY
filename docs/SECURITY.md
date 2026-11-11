# Seguridad, privacidad y legal de BUDDY

Estado al 2026-10-12. BUDDY maneja datos de salud de adultos mayores: son datos sensibles (Ley 1581 de 2012 en Colombia). Este documento separa lo que **ya existe** de lo que **falta** antes de una beta con usuarios reales.

## Lo que existe hoy

- Datos solo en el teléfono, separados por cuenta y por adulto mayor; contraseñas con sal y hash iterado; PIN del administrador con límite de intentos.
- Ningún secreto en el cliente (`EXPO_PUBLIC_*` solo para configuración no secreta).
- **APIs externas (V2.4):** BUDDY consulta RxNorm y MedlinePlus Connect (NLM) enviando **solo nombres o códigos de medicamentos**, nunca datos de la persona o del perfil (prueba automática en `src/__tests__/v24/knowledge-chat.test.tsx`). Respuestas en caché 24 h; sin conexión se usa lo guardado o se dice que no hay información.
- Notificaciones en la pantalla de bloqueo sin el nombre del medicamento, salvo que el cuidador lo active.
- Reglas de revisión de nivel 2 apagadas en producción hasta su revisión profesional (`src/config/features.ts`).

## Lo que falta (Fase 4, antes de la beta)

- Cifrado en tránsito (TLS) en todo servicio propio; cifrado en reposo en el servidor; cifrado a nivel de campo para los datos más sensibles, con gestión y rotación de claves.
- Almacenamiento local cifrado (hoy los datos persisten sin cifrar en AsyncStorage) y fotos en el directorio privado de la app (no cifradas).
- Protección de copias de seguridad (excluir datos de salud de los respaldos del sistema).
- Auditoría de accesos, minimización y retención, borrado de cuenta y de datos verificable.
- Pruebas de penetración básicas y pruebas de RLS contra una base local (nunca producción).
- Plan de respuesta a incidentes.

## Legal (a revisar con un abogado colombiano)

- Autorización expresa del tratamiento de datos sensibles; política de tratamiento y aviso de privacidad; consentimiento y su revocación (también para ubicación e IA).
- Capacidad y apoyos del adulto mayor para consentir (Ley 1996 de 2019).
- Contratos de encargado y transferencia internacional con los proveedores (Supabase, proveedor de IA, servicios de NLM).
- Registro de bases de datos ante la SIC, si aplica.
- Términos de uso y límites del asistente: no es dispositivo médico, no diagnostica ni receta.
- Formularios de seguridad de datos de App Store y Google Play.

### Preguntas para el abogado

1. **Software médico e INVIMA:** ¿mostrar información de un registro público y de MedlinePlus, y advertir coincidencias con alergias registradas, convierte a BUDDY en software como dispositivo médico ante el INVIMA? ¿Qué cambia si en la Fase 7 se agregan interacciones?
2. **Datos de salud y APIs externas:** ¿enviar solo el nombre o el código de un medicamento a servicios de EE. UU. (NLM) es transferencia internacional de datos personales o sensibles?
3. **Licencias:** ¿la licencia CC BY-SA 4.0 del índice derivado de los datos del INVIMA impone obligaciones adicionales en una app comercial?
4. **IA (Fase 6):** ¿qué consentimiento y qué contratos se requieren para procesar texto del cuidador con un proveedor de IA fuera de Colombia?
5. **Ubicación:** ¿cómo documentar el consentimiento revocable del adulto mayor y su capacidad para darlo?
6. **Responsabilidad:** ¿qué exención de responsabilidad es suficiente en la interfaz y en los términos?

## Auditoría 2026-11-10: qué se corrigió y qué queda

Informe: `docs/AUDITORIA_FUNCIONAL_SEGURIDAD_2026-11-10.md`. Regresiones: `src/__tests__/v5/seguridad.test.tsx` (24 pruebas
con datos sintéticos que exigen el rechazo). Las reproducciones originales (`.audit-2026-11-10/`) afirman el defecto y
Jest las ignora.

**Corregido (probado con Jest, sin servidor ni teléfono):**

| Hallazgo | Corrección | Dónde |
|---|---|---|
| SEC-01, SEC-02 | Frontera de acceso en la base: cada lectura y escritura se comprueba contra la cuenta y la persona de la sesión; los metadatos (dueño, persona, autor, borrado, versión) no se cambian desde un caso de uso | `infrastructure/local/db.ts`, `domain/permissions.ts` (`canAccessRecord`), `state/data.ts` |
| SEC-03 | Los casos de uso consultan la matriz `can` con el rol efectivo (`allowed`) | `state/session.ts`, `state/care.ts`, `state/actions.ts` |
| SEC-04 | El rol sale de la sesión o de la entrega del teléfono a esa persona, nunca de un argumento; el consentimiento guarda quién decidió y por qué vía | `state/location.ts`, `actingRole` |
| SEC-05 | El plan de prueba solo existe con `FEATURES.devTools`; RevenueCat recibe la cuenta de BUDDY | `domain/entitlements.ts`, `state/entitlements.ts` |
| SEC-06 | Eliminar la cuenta elimina los accesos del adulto mayor y la enfermera; un acceso huérfano no inicia sesión | `infrastructure/local/auth.ts` |
| SEC-07 | Cerrar sesión, cambiar de cuenta dueña o eliminarla cancela los avisos programados | `state/session.ts` |
| SEC-10, FUN-04 | Rol y vínculo desde `app_metadata` (servidor); registrarse sin sesión no entra a la app | `infrastructure/supabase/auth.ts` |
| FUN-01 | La respuesta a una automatización de agua es idempotente por recordatorio y día | `state/care.ts` |
| FUN-02, FUN-03 | La sincronización no pisa ediciones hechas mientras sube, pagina, envía los borrados reales y no corre dos veces a la vez | `infrastructure/supabase/sync.ts` |

**Decisiones de diseño.** Los avisos NO se cancelan al pasar del adulto mayor a su propio administrador en el mismo
teléfono (misma cuenta dueña): apagarlos dejaría a la persona sin recordatorios. Sin permiso, un caso de uso con retorno
opcional no hace nada; los que deben devolver el registro creado lanzan un error.

**Pendiente (requiere decisión, dependencia o servidor):**

- **SEC-08 · cifrado en producción.** `FEATURES.encryptedStorage` sigue encendido solo en desarrollo. El cifrado existe
  (AES-GCM, migración con respaldo), pero nunca se probó en un teléfono; activarlo a ciegas puede dejar a alguien sin sus
  datos. Falta validar en dispositivo la migración y la recuperación.
- **FUN-05.** El estado `key_lost` / `tampered` del almacén cifrado todavía no se muestra al usuario.
- **SEC-09 · contraseñas y PIN.** Siguen con SHA-256 iterado (1.000 y 300 rondas). Una derivación estándar (Argon2id o
  PBKDF2 con coste alto) necesita una dependencia nativa: requiere autorización para instalarla y un plan de migración.
- **FUN-03 (resto).** El error de sincronización se sigue descartando al iniciar sesión; el reloj del cliente marca la
  marca de agua; las políticas RLS y los borrados en el servidor no se han probado contra un proyecto real.
- **Hallazgo nuevo.** El ChangeLog local nunca descarta entradas pendientes: sin servidor crece sin límite y el almacén
  entero se reescribe en cada cambio. Hay que decidir cuánto conservar antes de que afecte el rendimiento.
- **Sin validar en esta ronda:** Android e iOS reales, entrega de notificaciones, Supabase/RLS y tiendas.
