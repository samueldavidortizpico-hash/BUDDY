# BUDDY — auditoría funcional, de código y seguridad

Fecha: 10 de noviembre de 2026. Checkout: `C:\PROYECTS\BUDDY`, HEAD `ce5174d`. Sin correcciones de aplicación, cambios de dependencias, commits ni operaciones contra cuentas reales.

## Dictamen

**No recomiendo aprobar el uso con datos reales hasta resolver el aislamiento entre cuentas y la autorización de las operaciones.** Hay nueve reproducciones locales con datos ficticios que confirman defectos funcionales y de seguridad. La suite existente pasa, pero no cubría esas condiciones adversas.

El alcance comprende autenticación local y remota, cuentas y roles, entrega del teléfono, repositorio local, dosis y existencias, automatizaciones, ubicación, notificaciones, sincronización, planes, asistente y dependencias. Se revisaron rutas y consumidores relevantes por muestreo dirigido; no se afirma una lectura exhaustiva ni una prueba completa de cada funcionalidad. Android/iOS, entrega real de notificaciones, Supabase/RLS, tiendas y permisos nativos siguen sin validación real en esta ejecución.

## Evidencia

| Comprobación | Resultado |
|---|---|
| Suite existente: `npm.cmd test -- --runInBand` | PASS: 53 suites, 925 pruebas |
| Reproducciones adicionales, `.audit-2026-11-10/functional-probes.test.tsx` | 9/9 reproducen los defectos descritos |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS, repetido después de añadir las nueve reproducciones |
| `npm.cmd audit --omit=dev --json`, primera consulta | 25 entradas afectadas: 24 moderadas, 1 baja, 0 altas/críticas |
| Segunda consulta resumida a npm audit | Falló por DNS `ENOTFOUND registry.npmjs.org`; no reemplaza el primer resultado válido |
| Supabase, RLS, Edge Functions y compras reales | NOT RUN |
| Dispositivo físico/emulador, segundo plano, bloqueo y reinstalación | NOT RUN |

Las reproducciones utilizan mocks de almacenamiento, criptografía, notificaciones y, en la prueba de carrera, transporte remoto simulado. PASS en estos nueve casos significa **defecto reproducido**, no control de seguridad aprobado.

Comando reproducible:

```powershell
npm.cmd test -- --runInBand --runTestsByPath .audit-2026-11-10/functional-probes.test.tsx
```

## Hallazgos confirmados mediante reproducción

### SEC-01 — Alta — Lectura de medicamentos de otra cuenta por ID

`src/state/data.ts:63` devuelve el registro sin comprobar `ownerUserId` ni la persona vinculada. `src/app/(caregiver)/medication/[id].tsx:40` consume ese hook y muestra el detalle. El guard de navegación exige sesión y rol de cuidador, pero no valida el dueño del medicamento solicitado.

**Reproducción:** crear medicamento sintético bajo A, cambiar la sesión a cuidador B, consultar `useRecord` con el ID de A. Devuelve nombre y propietario de A.

**Impacto:** exposición de información de salud de otra cuenta que permanezca en el mismo almacenamiento local. Requiere conocer o alcanzar el ID y datos previamente presentes en ese dispositivo; no se demostró acceso remoto entre instalaciones.

**Qué exigir:** autorización de lectura por dueño, rol y persona, también en acceso directo por ID. No basar la protección en IDs difíciles de adivinar ni únicamente en ocultar rutas.

### SEC-02 — Alta — Escritura cruzada entre cuentas

`src/infrastructure/local/db.ts:212`, `src/state/care.ts` (`setStock`, `update`, `remove`) y `src/state/actions.ts` aceptan IDs sin verificar pertenencia. `db.update` admite además un `Partial` del registro completo, incluyendo metadatos de seguridad.

**Reproducción:** con sesión B, ejecutar `medicationActions.setStock` sobre un medicamento de A. Cambia de 30 a 99 conservando el dueño A.

**Impacto:** integridad de medicamentos, existencias y otros registros locales. Las pantallas que usan estas acciones heredan la falta de control; no se ha probado cada una individualmente.

**Qué exigir:** controles en los casos de uso y repositorio autorizado; excluir cambios libres de dueño, ID, autor y metadatos. El acceso interno de sincronización debe tener un contrato separado.

### SEC-03 — Alta — La matriz de roles no protege todos los casos de uso

`src/domain/permissions.ts` restringe al adulto mayor a responder, pero `medicationActions.update` no consulta el rol. El asistente sí aplica `can()`; las acciones compartidas no lo hacen sistemáticamente.

**Reproducción:** sesión `elder` vinculada a A; llamar a actualización de medicamento. Cambia el nombre de la rutina.

**Impacto:** las restricciones dependen de que la interfaz no exponga la llamada. Es un defecto en la frontera de autorización interna; no implica que exista un botón visible para hacerlo. Una navegación correcta no soluciona esa frontera.

**Qué exigir:** pruebas negativas por operación para cuidador, adulto mayor y enfermera; limitar también la persona accesible dentro de la misma cuenta.

### SEC-04 — Alta — El consentimiento de ubicación confía en el rol declarado por el llamador

`src/state/location.ts:25-47`: `decide`, `revoke` y `record` aceptan `by: Role` y consultan ese parámetro; no vinculan por sí mismos la operación a la identidad/persona autorizada.

**Reproducción:** sesión cuidador; llamar `locationActions.decide(id, true, 'elder')`. El consentimiento queda `granted`.

**Impacto:** el caso de uso permite atribuir al adulto mayor una decisión que tomó otro rol. Debe contemplarse que la app tiene entrega del mismo teléfono al mayor: un rol efectivo necesita derivarse de una entrega válida y de la persona correcta, no de un argumento libre.

**Qué exigir:** autorización central por sesión/entrega válida/persona y trazabilidad de consentimiento. No se realizó captura de GPS ni rastreo real.

### SEC-05 — Media — Plan de prueba aceptado sin límite de entorno en el servicio

`src/domain/entitlements.ts:94-96` devuelve cualquier `localOverride` válido antes de consultar la tienda. `src/state/entitlements.ts` lo obtiene de borradores persistidos. Ocultar el selector con `FEATURES.devTools` no invalida el override en producción.

**Reproducción:** `EntitlementService.getPlan(userId, 'family')` devuelve `family` sin validar compra.

**Impacto:** bypass de funcionalidades de pago si un override persiste o se manipula el estado local. No se obtuvo dinero ni se probó fraude contra tiendas. RevenueCat también se configura sin asociar explícitamente el usuario BUDDY y su `getPlan` ignora `userId`; la separación de suscripciones entre cuentas del mismo dispositivo requiere prueba adicional.

**Qué exigir:** política de overrides limitada a compilaciones autorizadas y vinculación explícita de identidad/entitlements para producción.

### FUN-01 — Media — Responder dos veces una automatización de agua duplica el registro

`src/state/care.ts`, `elderAnswers.automationResponse`: guarda una respuesta por recordatorio en el chequeo diario, pero cada respuesta afirmativa ejecuta `addWater` de nuevo.

**Reproducción:** responder «Sí» dos veces al mismo recordatorio el mismo día. Resultado: dos registros de agua y un solo chequeo.

**Impacto:** cuenta de agua e indicadores diarios inflados al repetir la respuesta. El problema no es permitir dos vasos voluntarios; es que repetir una misma confirmación de automatización produce un efecto adicional.

**Qué exigir:** definir identidad de ocurrencia y efecto idempotente, incluyendo cambio de respuesta y deshacer.

### SEC-06 — Alta — Cuentas vinculadas sobreviven al borrado de su administrador

`src/infrastructure/local/auth.ts:233-248`: eliminar cuenta borra la credencial actual y su entrada del índice, sin recorrer/revocar credenciales de mayor/enfermera vinculadas ni sus índices. `sessionActions.deleteAccount` purga los datos del dueño, pero no completa ese ciclo de autenticación.

**Reproducción:** registrar administrador ficticio, crear acceso de mayor, eliminar al administrador mediante el proveedor, iniciar sesión con el acceso del mayor. Se autentica con el `ownerId` eliminado.

**Impacto:** accesos huérfanos válidos e inconsistencia de eliminación. Esta prueba demuestra supervivencia de credenciales; no afirma que sobrevivan todos los datos purgados por la fachada.

**Qué exigir:** política de borrado y revocación de todo el conjunto de identidades vinculadas, índices, sesión y datos; recuperación ante eliminación parcial.

### SEC-07 — Alta — Cerrar sesión deja recordatorios del usuario anterior programados

`src/state/session.ts:109-114`; `src/infrastructure/notifications.ts:101`. `clearScheduled` existe pero no tiene consumidores en `src`. El cierre de sesión no cancela avisos ni resumen diario.

**Reproducción:** programar un recordatorio sintético y cerrar sesión. El mock de notificaciones conserva el aviso pendiente.

**Impacto:** avisos de otra persona después del cierre o cambio de cuenta en el mismo dispositivo, con posible exposición de nombres o información de salud según el contenido configurado. La entrega real en pantalla bloqueada sigue pendiente.

**Qué exigir:** aislamiento y limpieza del plan por sesión/persona, con pruebas de logout, cambio de cuenta, borrado y salida de entrega.

### FUN-02 — Alta — Sincronizar puede perder una edición local reciente

`src/infrastructure/supabase/sync.ts:60-67` obtiene una instantánea `pending`, espera el `upsert` y después vuelve a insertar esa instantánea marcada como sincronizada.

**Reproducción con transporte simulado:** mientras sube el medicamento, editarlo localmente. Al finalizar, la instantánea anterior sobrescribe la edición y queda `synced`.

**Impacto:** pérdida silenciosa de cambios y falso estado de sincronización. Es un defecto del algoritmo cliente confirmado sin servidor real.

**Qué exigir:** confirmar por versión lo efectivamente enviado, conservar ediciones posteriores y serializar/coordinar ejecuciones concurrentes.

## Hallazgos de inspección y riesgos pendientes de reproducción

### SEC-08 — Alta — Datos de salud sin cifrado propio en producción

`src/config/features.ts:24`, `src/infrastructure/local/db.ts:151`: el cifrado solo se activa en desarrollo fuera de Jest. En producción `buddy.db` se persiste mediante AsyncStorage. Incluye perfiles, rutina, eventos, mensajes, ubicación y datos del PIN.

El sandbox del sistema operativo aporta protección; esto no significa que cualquier otra app pueda leerlos. El riesgo aumenta ante extracción de almacenamiento, copias de seguridad o compromiso del dispositivo. El adaptador `secure-storage.ts` usa AsyncStorage en web; ese fallback no ofrece protección equivalente al Keychain/Keystore nativo.

**Acción propuesta:** diseñar y validar cifrado/migración/recuperación antes de habilitarlo. No basta con cambiar una bandera.

### SEC-09 — Media — Derivación de contraseña y PIN personalizada y de bajo coste

`local/auth.ts:22,46`: 1.000 SHA-256 iterados; `state/handoff.ts:11`: PIN de cuatro cifras con 300 rondas, guardado con el estado local. No es una KDF estándar para contraseñas. El bloqueo de intentos no impide intentos fuera de la app sobre una copia del hash.

La recomendación actual de OWASP utiliza algoritmos de derivación de contraseñas como Argon2id o alternativas apropiadas, con coste ajustado y migración. No se midió tiempo de cracking ni se intentó adivinar credenciales reales.

### SEC-10 — Alta condicional — Identidad remota basada en metadatos editables

`supabase/auth.ts:16-25` toma `role`, `owner_id` y `elder_id` de `user_metadata`, y `dataOwnerId` los usa para seleccionar datos. Supabase advierte que esos metadatos son editables por el usuario y no deben sostener autorización.

**Condición:** proveedor Supabase habilitado. No se probó explotación remota ni se observaron políticas desplegadas. Debe derivarse membresía y rol de una fuente controlada por servidor, respaldada con RLS y pruebas negativas. Las claves públicas del cliente no son por sí mismas un secreto.

### FUN-03 — Alta condicional — Sincronización incompleta y errores ocultos

- `state/session.ts:48` solo dispara `syncIfRemote` al fijar usuario y descarta el error. La búsqueda en `src` no encontró sincronización periódica ni por cambios que complete ese camino.
- El motor con reglas de conflictos (`infrastructure/sync/engine.ts`) tiene `SYNC_ENABLED=false`; el sincronizador Supabase es otro camino y no usa esas reglas.
- Pull sin paginación en `supabase/sync.ts:70`: si se alcanza un límite de respuesta, el watermark puede avanzar sin haber recibido todas las filas.
- Watermark basado en reloj cliente y comparación de timestamps: desfases y escrituras concurrentes requieren validación.
- `db.purge` registra un delete en el changelog y retira físicamente la fila, pero `syncAccount` solo envía filas pendientes de las tablas; no consume esos deletes. Una ubicación revocada puede permanecer remota y/o volver a descargarse. Riesgo inferido, pendiente de prueba de servidor.

**Acción propuesta:** unificar contratos de sync, borrado y conflictos, con error visible/reintentos y pruebas de dos dispositivos. No presentar `SYNC_ENABLED=false` como garantía de ausencia de red: el otro sincronizador se activa mediante `EXPO_PUBLIC_DATA_SOURCE`.

### FUN-04 — Alta condicional — Registro Supabase puede tratar como iniciada una sesión no confirmada

`supabase/auth.ts`, `signUp`, devuelve `data.user` sin exigir `data.session`; `sessionActions.signUp` llama `setUser`. Cuando el proyecto exige confirmar correo, puede haber usuario creado sin sesión activa. El cliente puede mostrar sesión iniciada aunque las operaciones autenticadas remotas fallen.

**Acción propuesta:** estados diferenciados «cuenta creada», «confirmación pendiente» y «sesión autenticada». No verificado contra un proyecto real.

### FUN-05 — Media — Fallos de persistencia cifrada no se comunican al producto

`local/encrypted-storage.ts`: en `key_lost`/`tampered`, `setItem` retorna sin escribir ni lanzar error. Su método `health()` solo tiene consumidores en pruebas; el adaptador creado en `db.ts` no se conserva para mostrar su estado. Una sesión puede seguir operando en memoria sin persistir cambios; el arranque también necesita diagnóstico de errores de hidratación.

Aplica al camino cifrado de desarrollo o futura activación. No se probó pérdida real de clave en móvil. Exigir estado bloqueado visible, recuperación y ausencia de falsa confirmación de guardado.

## Estado real de funcionalidades

| Área | Evidencia actual | Qué falta |
|---|---|---|
| Registro/login locales, recuperación y PIN | Implementados; pruebas existentes pasan | KDF, límites adversariales, revocación y ciclo de borrado |
| Medicamentos, dosis, stock | Lógica y pruebas locales; historial y controles de seguridad presentes | Autorización uniforme, persistencia ante interrupciones y ejecución móvil |
| Agua, comidas, actividades y chequeos | Implementados localmente | Idempotencia de automatizaciones y entradas inválidas en la frontera de casos de uso |
| Asistente | Intérprete local con executor que aplica `can()`; consultas sobre datos | No equivale a IA conversacional externa; controles deben existir también fuera del executor |
| Catálogo/información farmacológica | Índice local y adaptador RxNav/MedlinePlus con timeout, caché y codificación de parámetros | Servicio remoto no ejercitado en esta ejecución; no certifica revisión clínica |
| Escaneo automático de envases | `medicationScanService.extract` devuelve indisponible | OCR/extracción real |
| Revisión avanzada/interacciones | Flags y contratos; nivel 2 apagado por defecto | Validación profesional e implementación correspondiente; no activar para simular cobertura |
| Ubicación | Consentimiento y fix de primer plano implementados | Identidad efectiva, revocación remota, permisos y GPS nativos; no hay seguimiento en segundo plano ni zonas seguras |
| Notificaciones | Plan local con presupuesto y horizonte; privacidad del nombre configurable | Limpieza de sesión, entrega real, límites de plataforma y renovación del horizonte sin abrir app |
| Avisos al teléfono de familiares | No demostrados | Backend, push y prueba de dos dispositivos |
| Invitaciones | Crea/valida localmente; `accept` responde `needs_backend` para código válido | Aceptación remota real |
| Accesos remotos de mayor/enfermera | Proveedor Supabase lanza `not_configured` en gestión de accesos | Backend y autorización desplegados |
| Planes y pagos | Adaptador RevenueCat implementado | Quitar override de producción, identidad por cuenta, pruebas sandbox/tienda |
| Reloj/HealthKit/Health Connect | Flag apagado y proveedores esqueleto | Integración instalable real; no confundir podómetro con todos los datos de salud |

## Código, dependencias y controles que sí ayudan

Hay separación entre dominio, estado e infraestructura, tipos estrictos, catálogo local, historial de dosis, corrección de stock, guard de rutas por rol y una cola para reemplazar/cancelar el plan de notificaciones. Son bases útiles; no sustituyen autorización por objeto.

La persistencia es un store global serializado, con todas las cuentas y colecciones. No se midió rendimiento; revisar crecimiento, escrituras frecuentes, recuperación de error y operaciones que modifican varias entidades sin transacción persistente.

`npm audit` informó 25 entradas afectadas en la consulta válida. Incluye cadenas de herramientas Expo/Jest arrastradas en el árbol de producción; no equivale a 25 vulnerabilidades explotables en el binario móvil. No se realizaron actualizaciones. Algunas sugerencias automáticas implicaban cambiar de versión mayor o bajar Expo: no aplicarlas sin análisis de compatibilidad y ruta de exposición. El segundo intento falló por DNS, por lo que no se obtuvo el desglose resumido adicional.

No se encontró `.env` versionado mediante comprobación exacta de Git; no había archivo `.env` local que inspeccionar. No se hizo un escaneo completo de secretos de todo el historial, por lo que no se certifica su ausencia histórica. No se imprimieron credenciales.

## Orden de corrección propuesto para una fase posterior

1. Frontera única de autorización por cuenta/persona/rol para lecturas, escrituras y consentimiento.
2. Borrado/revocación de identidades vinculadas y cancelación de avisos al salir/cambiar cuenta.
3. Persistencia segura y errores de almacenamiento visibles; diseño de migración y recuperación.
4. Eliminar pérdida de cambios, implementar deletes y hacer observable la sincronización antes de conectar datos reales.
5. Identidad remota confiable, RLS y pruebas negativas de dos cuentas/dos dispositivos.
6. Idempotencia de automatizaciones, planes reales y estados de confirmación de correo.
7. Validación móvil: permisos, notificaciones, segundo plano, reloj del sistema, reinstalación, logout y recuperación tras interrupción.

Se requiere evidencia negativa: B no puede leer ni cambiar A; mayor/enfermera no pueden configurar rutina o suplantar consentimiento; borrar dueño revoca vinculados; repetir respuesta no duplica efectos; salir limpia avisos; editar durante sync no pierde datos. Mantener las pruebas reproducibles actuales como evidencia del estado defectuoso y convertirlas después en regresiones que exijan rechazo o conservación correcta.

## Fuentes técnicas consultadas

- [Supabase: RLS y límites de user_metadata para autorización](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [OWASP: almacenamiento de contraseñas y KDF](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- [Expo SDK 58: SecureStore y límites de almacenamiento seguro](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).

La auditoría histórica se usó para orientar búsquedas; los hallazgos actuales se contrastaron con el checkout y las reproducciones de esta ejecución. No se heredan resultados de otros repositorios ni validaciones remotas antiguas.
