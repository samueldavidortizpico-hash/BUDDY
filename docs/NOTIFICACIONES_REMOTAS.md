# Avisos remotos al hijo (V4 Fase 5, solo diseño)

Hoy el aviso al administrador se calcula **solo cuando abre el Inicio** (`docs/AUDITORIA_BMAD.md`, A-09) y en el mismo
celular. Para cumplir "si algo no está bien, te enteras a tiempo" el servidor debe detectarlo con las dos apps cerradas.

## Qué detecta el servidor

| Situación | Cómo se detecta | Cuándo avisa |
|---|---|---|
| **Sin confirmar** | Tarea programada cada minuto: tomas cuya hora + margen "sin confirmar" (30 min por defecto, ajustable) ya pasó y no tienen evento de respuesta. Se usa el día de la toma en la zona horaria **de la persona**, también a medianoche (lo que ya hace `dueForReview`, Fase 2). | Una vez por toma (idempotente por id de toma) |
| **No puedo verificar** | Sin señal de vida (`heartbeats`: apertura, respuesta, permisos) durante el umbral de silencio de la persona (`silenceHours`), o permiso de avisos negado en su celular. | Una vez por periodo de silencio |
| **Pidió ayuda** | Evento `help_request` recibido | De inmediato, prioridad alta |
| **Cambió un permiso** | Evento de permiso (ya se registra en el celular, V4) | Novedad sin sonido |

Las reglas de estado son las de `src/domain/status.ts` y `src/domain/verification`: se pueden ejecutar igual en el
servidor (son puras y reciben `now`).

## Envío con Expo Push

- Cada celular del administrador registra su `ExpoPushToken` en `push_tokens` (con dispositivo y fecha).
- El servidor envía por la API de Expo Push con un `id` de aviso propio para no duplicar.
- **Recibos:** se consultan los recibos ~15 minutos después. `DeviceNotRegistered` → se desactiva el token. Otros errores
  → reintento con espera creciente (1, 5, 15 minutos) y máximo de intentos.
- **Idempotencia:** clave `tipo + persona + toma o periodo`. Reintentar nunca produce dos avisos iguales.
- **Horario silencioso** del administrador: lo no urgente espera; "Pidió ayuda" y "Sin confirmar" no esperan
  (configurable).
- **Texto en la pantalla de bloqueo** sin nombre del medicamento por defecto (privacidad, `buddy-medical-safety`).

## Controles de entrega

- Registro por aviso: creado, enviado, recibido por Expo, error. El Inicio del administrador muestra "Último aviso
  entregado hace X" o "No pudimos entregarte avisos desde X" si fallan.
- Prueba diaria silenciosa opcional para detectar tokens vencidos.

## Qué NO se puede garantizar (se dice en la app)

- Que el aviso llegue si el celular del hijo está apagado, sin conexión, en modo avión o con las notificaciones de BUDDY
  desactivadas.
- La hora exacta en Android con ahorro de batería agresivo (Doze, Samsung, Xiaomi), F-03.
- Que "sin confirmar" signifique "no la tomó": puede que la haya tomado y no lo marcó. Nunca se llama emergencia.
- Que el celular del adulto mayor reciba sus recordatorios si lo tiene apagado o sin permiso; por eso existe "No puedo
  verificar".

## Requisitos

Backend elegido (docs/SINCRONIZACION.md), build instalable (las notificaciones remotas no se prueban en Expo Go con todas
sus garantías), credenciales de APNs y FCM en EAS, y pruebas en dispositivos reales (iPhone y al menos un Samsung o
Xiaomi).
