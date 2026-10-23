## ADDED Requirements

### Requirement: Identidad diaria y edición segura R2 R3 R4
BUDDY MUST identificar cada ocurrencia por medicamento, día local y posición; editar horas no aumenta las pendientes ese día. El nuevo horario de posiciones registradas aplica en la siguiente ocurrencia.

#### Scenario: Edición después de confirmar
- **GIVEN** la toma de las 08:00 está tomada hoy
- **WHEN** se cambia a 09:00
- **THEN** hoy conserva una sola toma registrada a las 08:00, sin aviso a las 09:00; mañana usa 09:00

#### Scenario: Edición antes de responder
- **GIVEN** la toma de hoy está pendiente o pospuesta
- **WHEN** se cambia a una hora futura
- **THEN** se mueve la misma posición y conserva su historial sin duplicar

#### Scenario: Tres posiciones y primera registrada
- **GIVEN** tres tomas diarias y la primera registrada
- **WHEN** cambian las tres horas
- **THEN** la primera conserva su hora y solo las otras dos se reasignan

#### Scenario: Reducción o aumento de frecuencia
- **GIVEN** existen registros del día
- **WHEN** se reducen o aumentan horas
- **THEN** conserva registradas, cancela posiciones sobrantes y no crea dosis adicionales hoy

### Requirement: Historial conservado R1
BUDDY MUST conservar cada evento de confirmación, corrección, desplazamiento o cancelación con autor y hora y exponer el último estado junto con el historial completo.

#### Scenario: Datos antiguos
- **GIVEN** tomas guardadas sin slot ni history
- **WHEN** se editan o responden
- **THEN** infiere posición por orden de hora y conserva el estado antiguo como snapshot legacy; agrega el evento nuevo sin fabricar eventos anteriores

#### Scenario: Medicamento eliminado
- **GIVEN** hay tomas registradas y pendientes
- **WHEN** se elimina el medicamento
- **THEN** conserva registros e historial y cancela las pendientes de hoy y futuras sin purgar

### Requirement: Cancelación completa R5
BUDDY MUST cancelar aviso inicial, segundo aviso y alertas pendientes de una ocurrencia movida o cancelada; un medicamento eliminado no pertenece al plan.

#### Scenario: Alerta antigua y posposición
- **GIVEN** una toma pospuesta o sin confirmar tiene avisos y alerta
- **WHEN** se mueve o cancela
- **THEN** la clave antigua y su segundo aviso desaparecen y su alerta queda atendida

#### Scenario: Reprogramaciones concurrentes A-10
- **GIVEN** dos planes y una cancelación se solicitan durante una programación lenta
- **WHEN** terminan las operaciones
- **THEN** se ejecutan en exclusión, prevalece el último plan y un error no bloquea reintentos

### Requirement: Inventario por eventos R6
BUDDY MUST aplicar solo el delta real entre estados de una toma y registrar los movimientos sin duplicarlos.

#### Scenario: Correcciones repetidas
- **GIVEN** 30 unidades y dosis declarada de una unidad
- **WHEN** se registra Tomé → No tomé ? Tomé → No tomé
- **THEN** queda 30 y repetir No tomé no suma unidades

#### Scenario: Existencias menores que la dosis
- **GIVEN** 0.25 unidades y dosis declarada de una unidad
- **WHEN** se confirma y corrige
- **THEN** devuelve exactamente 0.25 y no fabrica existencias

### Requirement: Calendario local R7
BUDDY MUST usar el calendario local de la hora programada y convertir createdAt a fecha local antes de compararlo con fechas de calendario.

#### Scenario: Medianoche en Colombia
- **GIVEN** tomas 23:50 y 00:10 en días locales consecutivos UTC-5
- **WHEN** se confirma o consulta el estado y el feed
- **THEN** cada toma pertenece al día programado aunque el ISO UTC tenga otra fecha; since y alertas usan el mismo calendario local

### Requirement: Incertidumbre explícita R8
BUDDY MUST exponer una función pura de ambigüedad y el texto ?Confirma con [nombre] antes de darle otra dosis?; una pendiente ambigua no solicita otra dosis.

#### Scenario: Corrección de respuesta o edición tras registro
- **GIVEN** hubo corrección de respuesta o edición después de registrar una toma
- **WHEN** se consulta doseAmbiguity
- **THEN** informa la ambigüedad; una toma devuelta a pendiente queda retenida y sin recordatorios hasta una respuesta explícita
