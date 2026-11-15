# Spec Delta

## Purpose

Garantiza que quien cuida se entere a tiempo, en su propio teléfono y con la app cerrada, cuando una toma no se
confirma, la persona pide ayuda o BUDDY no puede verificar cómo está. Es la promesa central del producto.

## ADDED Requirements

### Requirement: Detección en el servidor con las apps cerradas
El servidor SHALL revisar al menos cada minuto las tomas vencidas, las peticiones de ayuda y la falta de señales de
vida de cada persona, sin depender de que alguien abra la app. Las horas SHALL calcularse en la zona horaria de la
persona.

#### Scenario: Toma sin confirmar
- **WHEN** pasan 30 minutos (o el margen configurado) desde la hora de una toma sin respuesta y ambas apps están cerradas
- **THEN** el titular y los cuidadores que tengan activo ese aviso reciben una notificación push

#### Scenario: Toma a medianoche
- **WHEN** la toma es a las 23:50 en la zona de la persona y el teléfono del hijo está en otra zona horaria
- **THEN** el vencimiento se calcula con la zona de la persona

### Requirement: Pedir ayuda no espera
Una petición de ayuda del adulto mayor SHALL avisar de inmediato a todos sus cuidadores con prioridad alta, también en
horario silencioso.

#### Scenario: Ayuda de noche
- **WHEN** el adulto mayor pide ayuda a las 2:00 y el titular tiene horario silencioso
- **THEN** el titular recibe el aviso de inmediato

### Requirement: Nunca falla en silencio
Si BUDDY no tiene señales del teléfono del adulto mayor durante el umbral configurado, o los avisos están apagados en
ese teléfono, el sistema SHALL avisar "No puedo verificar" en lugar de mostrar que todo está bien.

#### Scenario: Teléfono apagado
- **WHEN** el teléfono del adulto mayor no envía señales durante más horas que su umbral
- **THEN** el titular recibe "No puedo verificar a <nombre>" y el Inicio no muestra "está bien"

### Requirement: Un aviso por hecho
Cada aviso SHALL tener una clave por tipo, persona y toma o periodo. Reintentar SHALL NOT producir avisos duplicados,
y una toma confirmada antes del envío SHALL cancelar el aviso pendiente.

#### Scenario: Confirmación tardía
- **WHEN** el adulto mayor confirma la toma un segundo antes de que se envíe el aviso
- **THEN** no se envía el aviso de "sin confirmar"

#### Scenario: Reintento tras error
- **WHEN** el servicio de push falla y el envío se reintenta
- **THEN** el cuidador recibe un solo aviso

### Requirement: Entrega verificada y tokens limpios
El sistema SHALL consultar el resultado de cada envío, reintentar con espera creciente los errores pasajeros y
desactivar los tokens de teléfonos que ya no existen. El titular SHALL ver en la app si sus avisos están llegando.

#### Scenario: Teléfono reemplazado
- **WHEN** el servicio de push informa que un token ya no está registrado
- **THEN** el token se desactiva y deja de recibir envíos

### Requirement: Pocos avisos y con sentido
Lo no urgente SHALL esperar al fin del horario silencioso, y una toma sin confirmar SHALL describirse como tal, nunca
como "emergencia".

#### Scenario: Texto del aviso
- **WHEN** se envía el aviso de una toma sin confirmar
- **THEN** el texto dice que la toma no se ha confirmado y no usa la palabra "emergencia"
