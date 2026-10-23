---
title: Edición segura de tomas V4 Fase 1
type: bugfix
created: 2026-10-23
status: in-progress
baseline_commit: c3d5a5f0803772af6148a5629a2a9323e27f5cb6
---
# Diseño

## Comportamiento actual y esperado
Antes se deduplicaba por hora. La edición eliminaba pendientes pero conservaba tomadas y pospuestas; el nuevo horario creaba otra toma. `skip` no compensaba el descuento; las alertas de registros desplazados seguían pendientes. `createdAt.slice(0,10)` usaba un día UTC frente al calendario local.
Después se conserva la identidad medicamento + día local + posición (base cero internamente; 1.ª, 2.ª en interfaz). Las horas registradas permanecen; solo se reasignan pendientes, incluyendo pospuestas. El siguiente día toma el nuevo horario completo. Un límite diario evita que aumentar el número de horas agregue dosis el día de la edición.

## Reglas e invariantes aprobados
R1. Cada confirmación, corrección o cambio agrega un evento con autor y hora. No se purgan tomas. El estado actual es una proyección del último evento; el historial completo queda disponible.
R2. Pendientes <= programadas del día menos registradas. Editar no añade dosis ese día.
R3. Registrada: nuevo horario desde siguiente ocurrencia; pendiente: nueva hora hoy.
R4. Las posiciones son estables dentro del día; solo se reasignan pendientes.
R5. Mover/cancelar cancela aviso inicial, segundo y alerta; eliminar medicamento cancela todas sus ocurrencias pendientes presentes/futuras y alertas referidas.
R6. El inventario cambia por delta real de eventos. Tomé → No tomé devuelve una vez; repetir/corregir no duplica unidades.
R7. El día de la toma es su fecha/hora programada local; instantes y eventos se guardan en ISO UTC.
R8. Ante ambigüedad no se pide otra dosis. Función pura `doseAmbiguity` para el aviso ?Confirma con [nombre] antes de darle otra dosis?.

## Modelo y compatibilidad
Campos opcionales en DoseEvent: slot, dayLimit, history, cancelledAt, safetyHold. Ausencia no invalida el JSON existente. Los slots antiguos se infieren ordenando por hora dentro de medicamento/día y respetando slots explícitos. La primera modificación conserva un snapshot legacy con los metadatos conocidos; no reconstruye eventos históricos que nunca fueron guardados. Los eventos nuevos sí conservan before/after, autor real de sesión, rol declarado y hora UTC.
Cancelación es un marcador, no borrado. Ocupa su posición para impedir que sync la recree. Lecturas del día, recomendaciones, estado y plan excluyen canceladas; una proyección pendiente retenida por seguridad no pide una toma nueva. Reiniciar una respuesta devuelve inventario pero marca safetyHold; una respuesta explícita posterior cierra esa retención.

## Notificaciones, alertas e inventario
Plan por posición, con hora persistida de las pendientes y ambas notificaciones omitidas para registradas, canceladas o retenidas. Cola única de aplicar/cancelar/limpiar; una operación rechazada no bloquea la cola y un fallo parcial invalida la firma. Las cancelaciones se encolan incluso sin pantalla montada; las fallas quedan señaladas localmente para revisión por la interfaz.
`stockApplied` guarda lo efectivamente descontado, incluso con existencias menores que la dosis, evitando fabricar existencias al devolver. Cada delta deja un asiento; la repetición del mismo estado no genera otro movimiento. No se interpreta la cantidad como consejo de tratamiento.

## Code Map y preservación
`src/state/care.ts`: reconciliación, historial, inventario y cierre de alertas. `src/domain/schedule.ts`: tiempos, deduplicación y vista diaria. `src/domain/dose-safety.ts`: slots y ambigüedad puros. `src/domain/notifications.ts`: plan futuro. `src/infrastructure/notifications.ts`: cola y cancelación real. `src/domain/status.ts` y `src/state/feed.ts`: conversión de instantes a día local. `src/domain/recommendations/engine.ts`: no ofrecer tomas canceladas/retenidas. No se cambia local/db, assistant, navegación ni componentes.

## Riesgos y excepciones
Reducción de frecuencia con más registradas que horas nuevas: se conserva todo el historial y no se añaden pendientes. Slots duplicados heredados son ambiguos y no autorizan otra dosis. Cambiar a una hora ya pasada queda retenido por seguridad. Borrado de medicamento no borra registros pasados ni revierte consumos ya declarados. Restaurar el medicamento no reactiva posiciones canceladas hoy; mañana sigue el horario vigente. Configurar día de semana/inicio/fin inactivo cancela pendientes afectadas. Se documentan estas decisiones en DECISIONS sin alterar R1–R8.
A-07 (zona del paciente frente a viaje/dispositivos remotos), alarmas exactas Android y F-02 siguen fuera de esta app local: las pruebas no acreditan entrega física de notificaciones.

## Verificación y aceptación
Reproducción roja antes de editar; pruebas de integración por R1–R8; pruebas del adaptador con promesas controladas para A-10; medianoche 23:50/00:10 y tres TZ de proceso. `npx jest <rutas>`, `npx tsc --noEmit`, lint y una ejecución final de `npx jest`. `openspec validate corregir-edicion-horario-tomas`. Cualquier fallo externo se informa sin editar archivos de Claude.
