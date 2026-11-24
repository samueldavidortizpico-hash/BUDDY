# BUDDY: auditoría técnica y arquitectónica

Auditoría de solo lectura: no se modificó código, ramas, configuración ni dependencias, y no se ejecutaron pruebas. Se revisó `package.json`, `app.json`, `src/` (215 archivos), `docs/` y el historial de git. Los precios de AWS y los tamaños de equipo salen de conocimiento general, no del repo, y están marcados para verificar. El repo estaba en la rama `chore/arquitectura-buddy`.

## 1. Arquitectura actual (AS-IS)

**BUDDY hoy es una sola app Expo que guarda todo en el teléfono y no tiene backend.**

| Aspecto | Evidencia |
|---|---|
| Stack | Expo `^58`, RN `0.88`, React `19.3`, TS `~6.0`, Expo Router, Zustand, AsyncStorage, `expo-sqlite`, `expo-secure-store`, `react-native-purchases`, `@supabase/supabase-js` (`package.json`) |
| Capas | `app → features/components → state → domain → infrastructure` (`docs/ARQUITECTURA_ACTUAL.md`) |
| Tamaño | `domain` 4.376 líneas, `state` 1.924, `features` 4.245, `components` 2.974, `app` 6.477; 53 archivos de prueba |
| Datos | Un JSON (`buddy.db`) en AsyncStorage con 18 colecciones. Cada registro lleva `SyncMeta`: id, dueño, persona, versión, borrado lógico y `syncStatus` (`local/db.ts`, `domain/types.ts`) |
| Autenticación | Local por defecto: hash SHA-256 iterado en JS dentro del teléfono. Las cuentas del adulto mayor viven en el SecureStore del administrador (`local/auth.ts`, `SUPABASE_PLAN.md`) |
| Sincronización | Dos motores: `supabase/sync.ts` y `sync/engine.ts`. El primero dice "no probado contra un proyecto real"; el segundo tiene `SYNC_ENABLED = false` |
| Notificaciones | Solo locales con `expo-notifications` (`infrastructure/notifications.ts`). No hay push remoto |
| Pagos | Contrato `EntitlementProvider` y adaptador RevenueCat. No hay claves ni productos (`PAGOS.md`) |
| IA | Motor local de reglas. No hay IA generativa (`IA_BUDDY.md`) |
| Web | Expo web con `output: single`. Es una demostración, no un sitio |

### Estado de las 12 funcionalidades

| # | Función | Estado | Falta |
|---|---|---|---|
| 1 | Usuarios, familiares y personas | Incompleta | Cuentas en servidor. La invitación responde `needs_backend` (`domain/invites.ts`) |
| 2 | Medicamentos | Completa en local | `domain/schedule.ts`, `dose-safety.ts` y `stock.ts` |
| 3 | Recordatorios y alarmas | Completa solo en local | Aviso remoto. Solo notificaciones locales; Doze en Android sin resolver (F-03) |
| 4 | Chequeos diarios | Completa | — |
| 5 | Registro de salud | Parcial | Hay ánimo, sueño y agua. Sin signos vitales (`HealthProvider` no disponible) |
| 6 | Existencias | Completa | — |
| 7 | Ubicación compartida | Parcial | Solo en primer plano, con consentimiento del adulto mayor (`app.json` desactiva el segundo plano) |
| 8 | Chat y comunicación | Parcial | Es chat administrador–BUDDY. Los mensajes de familia no tienen entrega remota (`ROADMAP.md`) |
| 9 | Avisos a familiares | No funciona entre celulares | Los avisos se calculan solo al abrir Inicio |
| 10 | Suscripciones | Contratos listos | Productos, claves, validación en servidor |
| 11 | Apple Health / Health Connect | Solo contrato | `FEATURES.watch = false`. Solo hay podómetro |
| 12 | Roles y permisos | Completa en cliente | `can()` (`domain/permissions.ts`) incluye `nurse`. No hay forzado en servidor |

**Duplicados e incompletos:**
- Dos motores de sync.
- Dos proveedores de autenticación (local y Supabase).
- `Role` es `caregiver|elder|nurse`, pero `InviteRole` es `viewer|admin`.
- Los turnos y notas de familia viven solo como borradores locales (`domain/family.ts`).
- `src/data/cum-index.json` pesa 1,3 MB y va empaquetado en la app.

## 2. Acoplamiento

- **`domain` casi puro, con una excepción.** Solo `domain/entitlements.ts` importa `react-native` (`Platform`) y carga RevenueCat. Eso impide ejecutar el dominio en Lambda o Next.js. `schedule`, `status`, `verification`, `permissions` y `dose-safety` ya son reutilizables en el servidor.
- **20 archivos de `app/`, `features/` y `components/` importan `@/infrastructure` directamente**, saltándose `state`.
- **`state/` importa `db` en 15 archivos**, y `state/handoff.ts` importa `hashSecret` desde `infrastructure/local/auth`. No hay una capa de repositorios, solo `db.*` global.
- **La UI usa Reanimated, `expo-glass-effect` y SVG nativo** (2.974 líneas en `components/`). No se puede compartir con Next.js.

## 3. ¿Monorepo?

**Sí, un monorepo con npm workspaces.** Hay `package-lock.json` y no hay `bun.lock`, así que no hace falta cambiar de gestor de paquetes.

El valor compartido es el dominio, que es TS puro y lo deben ejecutar la app, Lambda y la web. Sin monorepo hay que copiar `schedule.ts` o publicar un paquete, y esas reglas cambian a menudo (las rondas V4.x tocaron horarios).

**Qué no se comparte:** la UI. App y web comparten dominio y contratos, no componentes.

## 4. Estructura recomendada (TO-BE)

```
buddy/
├─ apps/
│  ├─ mobile/          # el Expo actual (src/app, features, components, state, infrastructure)
│  └─ web/             # Next.js: sitio público, legales, panel del familiar
├─ services/
│  └─ api/             # handlers Lambda (HTTP API), workers SQS, sweeper
├─ packages/
│  ├─ domain/          # hoy src/domain (sin react-native)
│  ├─ contracts/       # esquemas Zod + OpenAPI generado, tipos de las 18 colecciones
│  └─ config/          # tsconfig, eslint compartidos
├─ infra/              # CDK (TypeScript) o SAM
├─ docs/
└─ package.json        # workspaces
```

**CDK sobre SAM:** CDK porque el repo es todo TypeScript y puede importar `contracts`. SAM es más simple si solo hay Lambdas, pero aquí habrá Cognito, SQS, DLQ, Scheduler, S3 y la base de datos.

## 5. Arquitectura propuesta y diagramas

### Componentes

```
 ┌────────────── Cliente ──────────────┐        ┌────────────── AWS ──────────────────────────────┐
 │ apps/mobile (Expo)                   │        │ Cognito (user pool: caregiver / elder / nurse)  │
 │  · base local + cola de cambios      │  JWT   │        │                                        │
 │  · notificaciones locales            ├───────▶│ API Gateway HTTP API ─▶ Lambda (api)            │
 │  · RevenueCat SDK                    │        │                          │ authorize(can(), care_links)
 │ apps/web (Next.js)                   ├───────▶│                          ▼                       │
 └──────────────────────────────────────┘        │               PostgreSQL (RDS/Aurora)           │
                                                 │                          ▲                       │
 packages/domain ── compartido por api y apps ───│  EventBridge (rate 1 min) ─▶ Lambda sweeper      │
 packages/contracts ─ Zod/OpenAPI ───────────────│                          │ alerta idempotente    │
                                                 │                          ▼                       │
 RevenueCat ──webhook──▶ API (entitlements)      │  SQS push ─▶ Lambda sender ─▶ Expo Push API      │
                                                 │      │ falla ─▶ DLQ     └─▶ Lambda recibos (+15 min)
                                                 │  S3 (fotos, URL prefirmada)                      │
                                                 └──────────────────────────────────────────────────┘
```

### Comunicación: toma sin confirmar

```
Adulto mayor     Lambda sweeper (cada 1 min)     SQS push     Lambda sender    Expo Push    Celular del hijo
     │  [no responde]        │                       │             │               │              │
     │                 ¿hora+margen < ahora (en la zona de la     │               │              │
     │                  persona) y sin evento? ──sí──▶ INSERT alerta (clave única tipo+persona+toma)
     │                       │──mensaje──────────────▶│            │               │              │
     │                       │                        │──consume──▶│──envío───────▶│─────────────▶│
     │                       │                        │            │◀─ticket       │              │
     │                       │          (+15 min) Lambda de recibos: DeviceNotRegistered ⇒ desactiva token
     │                       │                        │ falla ×N ─▶ DLQ + alarma
```

Sigue `docs/NOTIFICACIONES_REMOTAS.md` y reutiliza `domain/status.ts` y `domain/verification`.

**Decisión sobre EventBridge Scheduler:** una regla cada minuto, no un schedule por toma. Cada edición de horario obligaría a crear, borrar y reconciliar schedules, y el sweeper ya es idempotente. La alternativa solo vale si el volumen sube mucho.

**Alarma local:** las notificaciones locales siguen siendo la vía principal para el adulto mayor, porque funcionan sin red. El servidor es el respaldo que avisa al hijo.

## 6. Comparación tecnológica

### Base de datos

| | PostgreSQL (RDS/Aurora) | DynamoDB On-Demand |
|---|---|---|
| Ajuste al modelo | **Alto.** 18 colecciones relacionales, `care_links` y roles por fila (`SINCRONIZACION.md`) | Medio. Exige diseño de acceso y GSI por caso |
| Barrido "toma sin evento" | Un anti-join | Hay que mantener un índice de tomas esperadas |
| Reporte médico e historial por rango | Natural | Costoso de modelar |
| Permisos por fila | RLS opcional como segunda barrera | Todo en código de Lambda |
| Costo fijo | Sí (Aurora v2, RDS) | Casi nulo |
| Red | Lambda en VPC o Data API | Sin VPC |

**Recomendación: PostgreSQL.** El criterio decisivo es el barrido de tomas sin confirmar y la autorización por vínculo. El costo fijo es aceptable.

### Backend: AWS frente a Supabase

`SINCRONIZACION.md` ya comparó ambos y recomendó Supabase para el piloto por el esfuerzo (AWS: "Alto"). La decisión (D-1) era del dueño. Si se elige AWS, el costo real es:
- Reescribir la autorización que Supabase daba con RLS.
- Reemplazar el adaptador `supabase/auth.ts`.
- Operar la infraestructura.

### Cognito

Cubre correo, contraseña y grupos. La cuenta del adulto mayor creada por el administrador se hace con `AdminCreateUser`, en el papel de la Edge Function `manage-elder-account` de `SUPABASE_PLAN.md`. Elimina el hash propio de `local/auth.ts` y las cuentas en SecureStore.

## 7. Evaluación de costos

Órdenes de magnitud por mes para un piloto de unos cientos de familias. **Verificar en la calculadora de AWS.**

| Componente | Estimado | Nota |
|---|---|---|
| Lambda + API Gateway HTTP + SQS + EventBridge | ~US$0–10 | El barrido son ~43.200 invocaciones al mes. Cubierto por capa gratuita o centavos |
| Cognito | US$0 en el piloto | Verificar el modelo de precios vigente |
| S3 | ~US$1 | Fotos de envases |
| Base PostgreSQL | **~US$15–50 (el costo dominante)** | RDS pequeño o Aurora Serverless v2 con mínimo bajo |
| NAT Gateway | **~US$30+ si Lambda va en VPC** | Evitar con Data API o VPC endpoints |
| CloudWatch Logs | Variable | Sin registrar datos de salud |
| Expo Push | US$0 | — |
| DynamoDB (alternativa) | ~US$0–5 | Sin costo fijo |

**Trampa de costo:** Lambda en VPC más NAT Gateway puede costar más que todo lo demás junto. Hay que decidir el patrón de acceso a la base antes de construir.

## 8. Seguridad y datos de salud

- **Cifrado local apagado en producción.** `FEATURES.encryptedStorage = __DEV__ && NODE_ENV !== 'test'`. Un build de tienda guarda salud en claro en AsyncStorage. `ALMACENAMIENTO_SEGURO.md` confirma que está sin probar en dispositivo.
- **Respaldo del SO.** `app.json` no fija `android.allowBackup: false`. El documento dice que no se cambió a propósito.
- **Una cuenta por dueño.** `sync.ts` hace pull con `eq('owner_user_id', userId)`. Ni el adulto mayor ni un segundo familiar (`viewer`/`admin`) leerían nada. Contradice `SUPABASE_PLAN.md`, que prevé lectura por `elder_id`.
- **Reloj del cliente.** El conflicto se resuelve con `updatedAt` del celular (`sync.ts`, `engine.ts`). `SINCRONIZACION.md` pide secuencia u hora del servidor (A-06).
- **Autorización.** Debe vivir en un único `authorize(usuario, elderId, acción)` en Lambda, que use `can()` y la tabla `care_links`. Con Postgres, activar RLS con una variable de sesión como segunda barrera.
- **Región y transferencia internacional.** Es la pregunta 2 del abogado en `SECURITY.md` (Ley 1581). La región AWS (por ejemplo `sa-east-1` frente a `us-east-1`) afecta costo y cumplimiento.
- **Datos hacia terceros.** Hoy solo se envían nombres o códigos de medicamentos a RxNorm y MedlinePlus (`SECURITY.md`). Con push, el texto de la pantalla de bloqueo no debe llevar el medicamento (ya definido en `NOTIFICACIONES_REMOTAS.md`).
- **Salud del dispositivo.** Apple Health y Health Connect requieren módulos nativos y build instalable. Sincronizar solo agregados diarios al servidor, con consentimiento propio.

## 9. Hallazgos

### P0: bloquean un piloto con usuarios reales

1. **No hay backend.** La promesa "te enteras a tiempo" (`PRODUCTO.md`) depende de avisos remotos que no existen (`ROADMAP.md`, `NOTIFICACIONES_REMOTAS.md`).
2. **Datos de salud sin cifrar en producción.** `config/features.ts`.
3. **No existe `supabase/migrations`**, aunque `sync.ts` y los docs lo citan. No hay esquema, RLS ni pruebas de RLS en el repo.

### P1: resolver antes o durante la migración

4. **Dos motores de sync** (`supabase/sync.ts` y `sync/engine.ts`), con reglas de conflicto distintas. Dejar uno solo.
5. **Sin zona horaria por persona.** `Elder` no tiene el campo (`domain/types.ts`) y no hay manejo de zona en `domain/time.ts` ni `utils/dates.ts`. El barrido del servidor lo necesita (A-07 en `SINCRONIZACION.md`).
6. **Modelo de roles sin unificar:** `Role` frente a `InviteRole`, y `nurse` ausente de los planes de servidor.
7. **Cambios sin confirmar en el árbol de trabajo:** `package.json`, `package-lock.json`, `app.json`, `.claude/skills/...` y los `*.respaldo`. Consolidarlos antes de mover carpetas.
8. **Entitlements sin identidad estable entre dispositivos.** `PAGOS.md` lo lista como requisito 5. Necesita webhook de RevenueCat hacia la API.

### P2: deuda estructural

9. `domain/entitlements.ts` importa `react-native`. Separar la parte pura.
10. 20 archivos de UI importan `infrastructure` directo; `state` usa `db` global. Introducir repositorios por contrato.
11. El registro de cambios local crece sin límite para lo pendiente, y los sincronizados se podan a 500 (`db.ts`, A-03).
12. Los esquemas de las 18 colecciones están solo como tipos TS; faltan esquemas Zod para validar en la API.

### P3: orden y publicación

13. **Documentación desactualizada:** `ARQUITECTURA_ACTUAL.md` y `PAGOS.md` dicen SDK 57 / RN 0.86; `package.json` tiene Expo 58 / RN 0.88.
14. Carpetas `dist-*`, `package.json.respaldo`, `package-lock.respaldo-sdk57.json` y `.playwright-mcp` en la raíz (las `dist-*` están ignoradas).
15. `app.json` describe la app como "Versión de demostración con datos de ejemplo". Cambiar antes de publicar en tiendas.
16. `eas.json` no tiene canales de actualización ni variables por entorno.

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Perder funcionalidad al reubicar la app | Mover con `git mv`, congelar una etiqueta y exigir `jest`, `tsc` y `lint` en verde antes y después |
| Metro, `@/` y Expo Router rompen en workspaces | Primer paso solo mueve carpetas, sin cambiar lógica; probar en dispositivo |
| Migrar de datos locales a servidor sin pérdida | Mantener el modelo "local primero"; la cola de cambios ya existe. Migración con respaldo, como hizo `encrypted-storage.ts` |
| Alertas duplicadas o perdidas | Clave de idempotencia `tipo+persona+toma`, DLQ y alarma sobre la DLQ |
| Android con ahorro de batería retrasa avisos (F-03) | Dos vías (local y remota); probar en Samsung y Xiaomi reales |
| Falso "todo bien" si cae el servidor | Mantener el principio "nunca falla en silencio": mostrar "No puedo verificar" |
| Costos por VPC/NAT | Definir el patrón de acceso a la base antes de la IaC |
| Cumplimiento (Ley 1581, SIC, tiendas) | Revisión legal antes del piloto; formularios de seguridad de datos |

## 11. Decisiones pendientes

1. **D-1: AWS o Supabase.** Si AWS, aceptar el trabajo extra de autorización y operación.
2. **PostgreSQL o DynamoDB** (recomendado: PostgreSQL) y cómo se accede (Data API, VPC endpoints o RDS Proxy).
3. **CDK o SAM** (recomendado: CDK).
4. **Región de AWS** y cumplimiento de transferencia internacional.
5. **Qué rol puede ver qué:** unificar `viewer/admin` con `caregiver/nurse`.
6. **Qué hace la web** en la primera versión: sitio y legales, o también panel del familiar.
7. **Precios y productos** de BUDDY Plus (sin definir en `PAGOS.md`).
8. **Estrategia de salud del dispositivo:** qué métricas y con qué consentimiento.
9. **Retención y borrado** de ubicación, fotos y mensajes.

## 12. Plan de migración gradual

Cada fase termina con `jest`, `tsc --noEmit`, `lint` y una prueba en dispositivo.

| Fase | Contenido | Resultado |
|---|---|---|
| 0 | Consolidar el árbol de trabajo (P1-7), etiquetar y fijar una línea base verde | Punto de retorno |
| 1 | Monorepo: mover la app a `apps/mobile`, workspaces, sin cambios de lógica | App igual que hoy |
| 2 | Extraer `packages/domain` (corregir P2-9) y crear `packages/contracts` con Zod | Dominio compartible |
| 3 | `infra` + Cognito + una rebanada vertical (registro, persona, vínculo, medicamentos) con pruebas de autorización, en un entorno de desarrollo | Primer extremo a extremo |
| 4 | Un solo motor de sync contra la API, hora del servidor, zona horaria por persona | Dos celulares reflejados |
| 5 | Barrido, SQS, DLQ, Expo Push, recibos; probar con iPhone y Android reales | Avisos remotos |
| 6 | Invitaciones, turnos y notas de familia, rol enfermera | Funciones familiares |
| 7 | Webhook de RevenueCat y productos | Cobro real |
| 8 | `apps/web` con Next.js: sitio y legales, luego panel | Presencia web |
| 9 | HealthKit y Health Connect en build de desarrollo; solo agregados | Datos de reloj |
| 10 | Endurecer: cifrado local encendido, `allowBackup`, pruebas de penetración, revisión legal | Beta cerrada |

**Orden clave:** las fases 3 a 5 cumplen la promesa del producto. Antes de gastar en la web (fase 8), conviene tenerlas cerradas.

## Qué no se verificó

- No se ejecutó la suite de pruebas, `tsc` ni `lint`. El resultado actual del repo no está confirmado.
- No se abrió cada pantalla ni se leyó `state/care.ts`, `assistant.ts` o `features/` línea por línea. El acoplamiento se midió por importaciones, no por lectura completa.
- Los precios de AWS, Cognito y Aurora son de memoria.
- No se revisó `openspec/` ni los documentos de auditoría anteriores (`AUDITORIA_V4*.md`) más allá de los identificadores que citan los otros docs (A-01 a A-07, S-01).
