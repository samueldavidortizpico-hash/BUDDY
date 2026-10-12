# Notificaciones de BUDDY

Estado al 2026-10-12 (Expo SDK 57, `expo-notifications ~57.0.22`).

## Qué hay hoy
- **Planificador puro** `src/domain/notifications.ts` (`planNotifications`): con los datos del perfil decide qué avisos programar. Probado en `src/domain/__tests__/notifications.test.ts`.
  - Medicamentos: diarios, o semanales si tienen días concretos. Si el tratamiento tiene fecha de fin o aún no empieza, se programan **por fecha** dentro de una ventana de 14 días: nunca antes del inicio ni después del fin. La ventana se recalcula cada vez que se abre la pantalla del adulto mayor; si no se abre en 14 días, esos avisos se agotan (límite conocido).
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
