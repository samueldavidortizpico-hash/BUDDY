# Spec Delta

## Purpose

Define quién puede ver y hacer qué sobre cada persona cuidada y sus registros, con la misma regla en la app y en el
servidor, para que cada plan venda roles que de verdad existen y se respetan.

## ADDED Requirements

### Requirement: Roles de cuenta
El sistema SHALL reconocer exactamente cuatro roles: `caregiver` (titular que creó la cuenta y paga), `family`
(familiar invitado por el titular), `elder` (adulto mayor) y `nurse` (enfermera o cuidadora). Una cuenta sin rol
declarado SHALL tratarse como `caregiver`.

#### Scenario: Cuenta anterior sin rol
- **WHEN** inicia sesión una cuenta creada antes de que existiera el campo de rol
- **THEN** el sistema la trata como `caregiver` dueña de sus propios datos

#### Scenario: Rol desconocido
- **WHEN** el servidor entrega un rol que no es uno de los cuatro
- **THEN** la sesión se rechaza y no se muestra ningún dato

### Requirement: Niveles del familiar invitado
Un `family` SHALL tener nivel `viewer` o `admin`, asignado solo por el titular. `viewer` SHALL poder solo leer los
datos de las personas compartidas. `admin` SHALL poder lo mismo que el titular sobre esas personas, salvo eliminar la
cuenta, cambiar o pagar el plan e invitar o quitar familiares.

#### Scenario: Familiar que solo ve
- **WHEN** un `family` con nivel `viewer` intenta editar un medicamento
- **THEN** la acción se rechaza en la app y en el servidor, y no se guarda nada

#### Scenario: Familiar administrador
- **WHEN** un `family` con nivel `admin` cambia el horario de una toma de una persona compartida
- **THEN** el cambio se guarda y el titular lo ve en su teléfono

#### Scenario: Familiar administrador no toca la cuenta
- **WHEN** un `family` con nivel `admin` intenta eliminar la cuenta o cambiar el plan
- **THEN** la acción se rechaza

### Requirement: Alcance por persona
Una cuenta vinculada (`family`, `elder`, `nurse`) SHALL leer y escribir solo registros de las personas que el titular
le compartió. Ninguna regla SHALL confiar en que un identificador sea difícil de adivinar.

#### Scenario: Pedir un registro de otra persona por su id
- **WHEN** una enfermera pide un registro de una persona que no le compartieron, usando su id exacto
- **THEN** el servidor no devuelve el registro y responde igual que si no existiera

### Requirement: Decisiones que son solo del adulto mayor
Aceptar, rechazar o revocar el envío de su ubicación SHALL ser una acción exclusiva del `elder`. Ningún otro rol, ni
el titular, SHALL poder tomarla en su nombre.

#### Scenario: El titular intenta aceptar la ubicación por la persona
- **WHEN** el titular envía una aceptación de ubicación en nombre del adulto mayor
- **THEN** el servidor la rechaza y el consentimiento queda como estaba

### Requirement: Rol decidido por el servidor
El rol, el nivel y las personas compartidas de una sesión SHALL salir de datos que solo escribe el servidor. Los datos
que el usuario puede editar desde el cliente SHALL NOT decidir permisos.

#### Scenario: Usuario edita sus metadatos
- **WHEN** un usuario cambia sus propios metadatos para declararse `caregiver` de otra cuenta
- **THEN** su rol y su alcance no cambian

### Requirement: Matriz de permisos única y versionada
La tabla rol × acción SHALL ser una sola fuente, con número de versión, usada por la app para mostrar u ocultar
acciones y por el servidor para autorizarlas. Una acción que no esté en la tabla SHALL negarse.

#### Scenario: Acción nueva sin registrar
- **WHEN** se agrega una acción a la app sin declararla en la matriz
- **THEN** la acción queda negada para todos los roles y una prueba falla

#### Scenario: App y servidor coinciden
- **WHEN** se ejecuta la prueba de contrato de permisos
- **THEN** cada par rol × acción da el mismo resultado en la app y en las políticas del servidor
