# Spec Delta

## Purpose

Fija el contrato entre la app y el servidor (tablas, reglas de acceso por fila y funciones del servidor), para que los
datos de una persona lleguen a todos los teléfonos de quienes la cuidan sin que nadie vea lo que no le corresponde.

## ADDED Requirements

### Requirement: Toda tabla con datos de una persona tiene acceso por fila
Cada tabla que guarde datos de cuidado SHALL tener activado el control de acceso por fila y SHALL incluir el dueño de
los datos y la persona a la que pertenecen. Sin política explícita, el acceso SHALL negarse.

#### Scenario: Tabla nueva sin política
- **WHEN** se crea una tabla de datos de cuidado sin políticas de acceso
- **THEN** ningún usuario autenticado puede leerla ni escribirla y la prueba de contrato falla

#### Scenario: Lectura de otra cuenta
- **WHEN** un titular consulta medicamentos sin filtrar por dueño
- **THEN** el servidor devuelve solo los de su cuenta

### Requirement: Cuentas vinculadas solo las crea el servidor
Crear, restablecer, revocar o cambiar el correo de una cuenta `elder`, `nurse` o `family` SHALL hacerse solo mediante
una función del servidor que verifique que quien lo pide es el titular de esa persona. La app SHALL NOT crear usuarios
para otra persona ni tener la clave de servicio.

#### Scenario: El titular crea el acceso de su mamá
- **WHEN** el titular pide crear el acceso del adulto mayor de una persona suya
- **THEN** el servidor crea la cuenta con rol `elder` vinculada a esa persona y devuelve su correo, nunca la contraseña guardada

#### Scenario: Otra cuenta intenta crear el acceso
- **WHEN** una cuenta que no es titular de esa persona pide crear su acceso
- **THEN** el servidor responde `forbidden` y no crea nada

### Requirement: Eliminar la cuenta borra todo en el servidor
Eliminar la cuenta del titular SHALL borrar en el servidor sus datos, sus personas y todas las cuentas vinculadas que
creó, y SHALL invalidar sus sesiones. Si algo falla a mitad, SHALL poder reintentarse sin dejar accesos vinculados vivos.

#### Scenario: Borrado completo
- **WHEN** el titular confirma con su contraseña la eliminación de su cuenta
- **THEN** ninguna de sus cuentas vinculadas puede volver a iniciar sesión y sus datos dejan de existir en el servidor

#### Scenario: Falla a mitad
- **WHEN** el borrado falla después de eliminar las cuentas vinculadas y antes de eliminar al titular
- **THEN** el titular sigue pudiendo entrar y reintentar, y no queda ninguna cuenta vinculada válida

### Requirement: Sincronización sin pérdidas ni duplicados
La sincronización SHALL subir solo cambios pendientes, traer cambios por páginas completas y nunca pisar un cambio
local que no se haya subido. Un borrado SHALL viajar al servidor y a los demás teléfonos.

#### Scenario: Dos teléfonos editan lo mismo
- **WHEN** el titular y un familiar administrador editan el mismo medicamento sin conexión y luego sincronizan
- **THEN** queda la edición más reciente y la otra se registra, sin perder la toma confirmada por el adulto mayor

#### Scenario: Ubicación revocada
- **WHEN** el adulto mayor revoca su ubicación
- **THEN** sus ubicaciones guardadas se borran del servidor y no vuelven a descargarse en ningún teléfono

### Requirement: Errores del contrato son explícitos
Cada función del servidor SHALL responder con un código de error de una lista cerrada (`unauthorized`, `forbidden`,
`invalid_input`, `not_found`, `conflict`, `rate_limited`, `internal`). La app SHALL mostrar un mensaje claro y nunca
dar por guardado algo que el servidor rechazó.

#### Scenario: Sin conexión al guardar
- **WHEN** la app no puede llegar al servidor al confirmar una toma
- **THEN** la toma queda guardada en el teléfono como pendiente de enviar y la app lo indica

### Requirement: Contrato versionado
El contrato SHALL tener versión. La app SHALL enviar la versión que entiende y el servidor SHALL rechazar con un
mensaje de actualización a una app demasiado vieja para el esquema vigente.

#### Scenario: App desactualizada
- **WHEN** una app con versión de contrato anterior a la mínima intenta sincronizar
- **THEN** el servidor rechaza la operación y la app pide actualizarse sin borrar datos locales
