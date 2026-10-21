# Notificaciones de BUDDY

Estado al 2026-10-20 (Expo SDK 57, `expo-notifications ~57.0.23`). V3.0 agrega el **aviso escalonado**.

## Qué hay hoy
- **Planificador puro** `src/domain/notifications.ts` (`planNotifications`): con los datos del perfil decide qué avisos programar. Probado en `src/domain/__tests__/notifications.test.ts`.
  - Medicamentos (V3.0, aviso escalonado): **por toma y por fecha**, dos avisos: a la hora T ("Hora de tu medicamento") y a T+10 si no respondió ("¿Ya tomaste tu medicamento?"). Margen configurable en Ajustes > Mis avisos. Ventana de 8 días (cubre siempre el mismo día de la semana siguiente), hasta 44 avisos de medicamentos; el primer día nunca queda sin avisos. Nunca antes del inicio ni después del fin del tratamiento. Al final de lo programado queda un aviso "Abre BUDDY" para no dejar de avisar en silencio si nadie abre la app.
  - Cancelación: cualquier respuesta (tomé, no tomé, pospuse) saca esa toma del plan y, al reprogramar, se cancelan sus avisos pendientes; una toma pospuesta se avisa a su nueva hora y a los 10 min.
  - "Sin confirmar" a T+30 (configurable): la toma pasa a ese estado y el administrador ve una alerta de seguimiento con "Llamar a [nombre]" y "Ya lo confirmé por teléfono". Nunca se llama emergencia. Una tarjeta y un aviso guardado por toma (sin duplicados).
  - Estados separados en el modelo y en la pantalla del administrador (Inicio > Tomas de hoy): programada, aviso entregado al celular (lo que aceptó el sistema; no significa que lo vio), segundo aviso, sin confirmar y respondida (tomó, no tomó, pospuso; quién lo marcó). Si el celular del adulto mayor no tiene permiso, se dice.
  - Citas: el día anterior a la hora que defina el cuidador (18:00 por defecto) y dos horas antes, con la dirección.
  - Agua, comidas y chequeo: diarios. Existencias bajas: un aviso a la mañana siguiente.
  - Privacidad: la pantalla de bloqueo no muestra el nombre del medicamento salvo que el cuidador lo active.
  - Prioridad ante el límite: medicamentos, citas, chequeo, existencias, agua y comidas; como máximo 60. iOS conserva solo los 64 avisos locales más próximos (documentación de Apple de `UNUserNotificationCenter`).
- **Adaptador** `src/infrastructure/notifications.ts`: entrega el plan a `expo-notifications` y solo reprograma si cambió. Pide permiso en contexto (Ajustes > Notificaciones > "Enviar notificación de prueba"); nunca al abrir la app. En web no hace nada.
- Textos sin alarmismo y honestos: sin servidor no hay entrega al celular del familiar, así que el aviso de existencias dice "Cuéntale a tu familiar para comprar más" y no "ya le avisé".

## Qué funciona en Expo Go (según la documentación oficial)
Según https://docs.expo.dev/versions/v57.0.0/sdk/notifications/: "Local notifications (in-app notifications) remain available in Expo Go"; las push son "unavailable in Expo Go on Android from SDK 53" y "A development build is required to use push notifications".

| Caso | Expo Go | Build instalable |
|---|---|---|
| Avisos locales programados en el celular del adulto mayor | Sí (pendiente de comprobar en dispositivo) | Sí |
| Notificación de prueba desde Ajustes | Sí (pendiente de comprobar en dispositivo) | Sí |
| Aviso en el celular del cuidador cuando el adulto mayor no responde | No: requiere servidor y push (Fases 2 y 3) | Con backend |
| Push remotas | No en Android; requiere development build | Con backend |

## Qué debe comprobar una persona
Ver `docs/PRUEBAS_EN_DISPOSITIVO.md`: permiso, prueba de envío, aviso de medicamento a la hora, aviso de cita el día anterior, comportamiento con la app cerrada y con el modo No molestar.

## Qué se comprobó (V3.0, sin dispositivo)

- Jest con reloj simulado (`src/__tests__/v30/escalation.test.ts`, `src/domain/__tests__/notifications.test.ts`), en `TZ=America/Bogota`, `Europe/Madrid` y `UTC`: secuencia T → T+10 → T+30, márgenes del administrador, respuestas que detienen la escalada, toma pospuesta que vuelve a escalar desde su nueva hora, cancelación de los dos avisos al confirmar (también a mitad de camino), alerta solo desde T+30 con sus dos acciones y sin "emergencia", sin duplicados tras evaluar 5 veces, medianoche y cambio de mes, días concretos, inicio y fin del tratamiento, límite del sistema.
- En web no hay notificaciones: el estado queda en "Programada" y nunca en "aviso entregado".

## Qué hay que comprobar en celulares reales

| Marca | Qué mirar | Por qué |
|---|---|---|
| Samsung (One UI) | Aviso a la hora y a los 10 min con la app cerrada y con "Ahorro de energía"; que "Suspender apps sin uso" no la incluya | Samsung pone a dormir apps y puede retrasar alarmas inexactas |
| Xiaomi (HyperOS/MIUI) | Igual, más "Inicio automático" y "Sin restricciones" de batería para Expo Go o la build | Xiaomi cancela avisos de apps cerradas si no tienen inicio automático |
| iPhone | Aviso con la app cerrada, con "No molestar" y con "Resumen programado"; que el segundo aviso llegue aunque el primero siga en la pantalla de bloqueo | iOS agrupa o retrasa según el modo de concentración |
| Todos | Al tocar "Ya lo tomé" a las 8:05, que NO llegue el aviso de las 8:10 | Cancelación real en el sistema (`cancelAllScheduledNotificationsAsync` + reprogramar) |

Pasos en `docs/PRUEBAS_EN_DISPOSITIVO.md` (sección V3.0).

## Qué requiere backend

- Que la alerta "sin confirmar" llegue **al celular del hijo** con la app del adulto mayor cerrada: el celular del adulto mayor no puede avisar a otro sin un servidor (push remota y una tarea programada en el servidor que detecte T+30). Hoy la alerta se ve en el celular donde están los datos (mismo celular con "Probar como").
- Saber en el servidor que el aviso se entregó (hoy `notifyLog` guarda localmente lo que aceptó el sistema).
