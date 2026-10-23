# Propuesta: edición segura del horario de tomas

## Why
Editar un horario después de confirmar una toma puede pedir una segunda dosis el mismo día (F-01). La reproducción previa en `src/state/__tests__/dose-safety-v4.test.ts` falló en 6 de 6 pruebas: duplicación (2 en vez de 1), inventario (29 en vez de 30), tres casos de alertas/posposición y una alerta que entraba por fecha UTC.

## What Changes
- Identidad por medicamento, fecha local y posición diaria; reasignación de pendientes sin recrear registradas.
- Historial de eventos de solo agregar, cancelación conservando datos y compatibilidad con tomas antiguas.
- Compensación exacta del inventario, cierre de alertas obsoletas y exclusión de ejecuciones del adaptador de notificaciones.
- Función pura de ambigüedad y un bloque `doseSafety` de textos para que Claude conecte la interfaz.

## Capabilities
### New Capabilities
- `seguridad-tomas`: identidad, trazabilidad, corrección de respuestas, inventario y cancelación segura de recordatorios de tomas.
### Modified Capabilities
Ninguna: `openspec list --specs` no encontró capacidades existentes.

## Impact
Dominio: types, schedule, dose-safety, notifications, status y recommendations/engine. Estado: care y feed. Adaptador: infrastructure/notifications. Texto: solo bloque nuevo doseSafety. Pruebas nuevas en domain/state/infrastructure __tests__. Documentación: este cambio, DECISIONS (solo agregado) e informe V4_FASE1_CODEX.
Sin dependencias, backend, cambios de arquitectura, pantallas ni migración destructiva. No se modifica el índice ni se crean commits.
