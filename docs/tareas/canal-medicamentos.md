# Tarea · Canal de notificación "Medicamentos" en Android

Responsable: Laura · Revisa: Samuel · Preparación de la Fase 10 (versión instalable de Android)
Skills de Claude Code que aplican: `buddy-medical-safety` (toca avisos de medicamentos) y `buddy-testing`.

## Por qué

Hoy todos los avisos (medicamentos, agua, resumen del día, prueba) salen por **un solo canal**, "Recordatorios de
BUDDY" (`src/infrastructure/notifications.ts:37`). En Android el usuario silencia canales completos: si apaga el agua
porque le molesta, también apaga los medicamentos sin saberlo. El plan pide un canal "Medicamentos" con sonido y
prioridad alta, separado de los avisos menores.

## Dónde está el código

- Canal y programación: `src/infrastructure/notifications.ts` (`ensureChannel`, `applyPlan`, `sendTestNotification`,
  `scheduleDailySummary`). Cada aviso lleva `channelId: CHANNEL`.
- Qué avisos existen y de qué tipo: `src/domain/notifications.ts` (el plan de avisos).
- Pruebas actuales del plan: `src/domain/__tests__/notifications.test.ts`.

## Qué hacer

- [ ] Dos canales: `medications` ("Medicamentos", importancia alta, con sonido y vibración) y `reminders`
      ("Otros avisos", importancia por defecto) para agua, resumen y el resto.
- [ ] Los avisos de toma, el segundo aviso y "sin confirmar" van por `medications`; todo lo demás, por `reminders`.
- [ ] El canal viejo `CHANNEL` se elimina con `deleteNotificationChannelAsync` para que no quede duplicado en Ajustes.
- [ ] Prueba automática: cada tipo de aviso del plan sale con el canal correcto (si un aviso de medicamento cae en
      `reminders`, la prueba falla).
- [ ] Los textos de los avisos no cambian; ninguno puede decir "emergencia" ni sonar a diagnóstico.

Antes de tocar la API de `expo-notifications`, revisa la documentación del SDK 58:
https://docs.expo.dev/versions/v58.0.0/sdk/notifications/

## Cierre

- [ ] `npx tsc --noEmit`, `npx expo lint` y `npx jest` en verde
- [ ] En un Android: Ajustes del sistema → BUDDY → Notificaciones muestra los dos canales; silenciar "Otros avisos" no
      silencia un aviso de medicamento a 2 minutos
