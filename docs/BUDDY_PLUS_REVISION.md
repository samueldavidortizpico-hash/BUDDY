# Revisión de BUDDY Plus (V4 Fase 10, solo documento)

**No se cambió el modelo de suscripción en esta ronda.**

## Qué incluye hoy (código: `src/domain/entitlements.ts`)

- **Gratis:** medicamentos, recordatorios, aviso escalonado, existencias, preguntas programadas básicas, pedir ayuda,
  alertas de seguridad y un administrador.
- **Plus:** cuidadores adicionales (`extra_caregivers`) y reloj y datos de salud (`watch_health`).
- Precios y prueba: "Por definir". Compras vía RevenueCat (`react-native-purchases`) sin claves configuradas; en
  desarrollo, un interruptor de prueba local en Ajustes > Avanzado.

## Qué propone la auditoría BMAD (`docs/AUDITORIA_BMAD.md`, sección 6 y D-4)

- Cobrar por **cuidadores adicionales** contradice el principio 9 ("invitación familiar como crecimiento"): la invitación
  debería ser gratis porque es el motor de crecimiento.
- El **reloj** es "Futuro" (interruptor `watch` apagado) y no tiene backend: vender algo que no funciona del todo daña la
  confianza.
- Proponer como Plus la **capa remota**: avisos al celular del hijo con la app cerrada, historial en la nube, varios
  dispositivos y el reporte para el médico. Es lo que el hijo valora ("te enteras a tiempo") y lo que cuesta operar.
- La competencia ya cobra por el aviso remoto (Medisafe, unos USD 5 al mes según reseñas) y Snug lo da gratis en su
  versión básica: el precio debe validarse.

## Preguntas para validar con cuidadores antes de cambiar el modelo

1. ¿Qué te haría pagar: recibir el aviso en tu celular aunque no abras BUDDY, o invitar a tus hermanos?
2. ¿Cuánto pagarías al mes por enterarte a tiempo si tu mamá no confirma su medicamento? ¿Y al año?
3. ¿Quién paga en tu familia? ¿Se dividirían el pago entre hermanos?
4. ¿Te importa el historial para llevarle al médico? ¿Lo imprimirías o lo enviarías?
5. ¿Usarías el reloj o los pasos, o es algo que no miras?
6. Si la invitación a la familia fuera gratis, ¿a cuántas personas invitarías?
7. ¿Qué te haría cancelar? (falsas alarmas, avisos tarde, complejidad para tu mamá)
8. ¿Prefieres una prueba gratis de 7, 14 o 30 días?

## Recomendación

Mantener el modelo actual hasta tener el backend (sin backend, la capa remota no existe). Al lanzarlo, probar con el
piloto: invitación familiar gratis y Plus = capa remota. Decisión del dueño (D-4).
