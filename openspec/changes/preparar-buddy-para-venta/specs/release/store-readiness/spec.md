# Spec Delta

## Purpose

Reúne lo que App Store y Google Play exigen para publicar y cobrar una app que maneja datos de salud de adultos
mayores, para que la primera revisión de tienda no la rechace.

## ADDED Requirements

### Requirement: La ficha describe un producto real
La descripción de la app y de la web SHALL describir el producto que se instala, sin presentarla como demostración o
versión con datos de ejemplo.

#### Scenario: Descripción de la tienda
- **WHEN** se genera la configuración de la compilación de tienda
- **THEN** ninguna descripción contiene "demostración" ni "datos de ejemplo"

### Requirement: Eliminar la cuenta desde la app
El titular SHALL poder eliminar su cuenta y sus datos desde la app, en modo local y en modo con servidor, y la ficha de
la tienda SHALL indicar cómo pedirlo también desde fuera de la app.

#### Scenario: Eliminar con servidor activo
- **WHEN** el titular elimina su cuenta con el servidor activo
- **THEN** la cuenta y sus datos se borran en el servidor, no solo en el teléfono

### Requirement: Cada permiso explica para qué se usa
Cada permiso que pide la app SHALL tener un texto en español que diga para qué se usa y SHALL pedirse solo en el
momento en que se necesita.

#### Scenario: Permiso de avisos
- **WHEN** la app pide permiso de notificaciones
- **THEN** lo hace al configurar los recordatorios, explicando que sirve para avisar las tomas

### Requirement: Datos de salud declarados
La política de privacidad SHALL nombrar los datos de salud que se guardan, dónde, con quién se comparten, cuánto
tiempo se conservan y cómo borrarlos, y las declaraciones de privacidad de cada tienda SHALL coincidir con ella.

#### Scenario: Revisión de privacidad
- **WHEN** se comparan la política, el formulario de seguridad de datos de Google Play y las etiquetas de privacidad de Apple
- **THEN** los tres declaran los mismos tipos de datos y el mismo uso

### Requirement: BUDDY no se presenta como dispositivo médico
Textos de la ficha y de la app SHALL presentar a BUDDY como apoyo para recordar y acompañar, y SHALL NOT afirmar que
diagnostica, receta, cambia dosis o atiende emergencias.

#### Scenario: Texto de la ficha
- **WHEN** se revisa la descripción de la tienda
- **THEN** no promete diagnóstico ni atención de emergencias, e indica consultar siempre al médico

### Requirement: Compilación de tienda sin herramientas de desarrollo
Una compilación de tienda SHALL NOT incluir la galería de componentes, el selector de plan de prueba ni datos de
ejemplo precargados.

#### Scenario: Variable de capturas encendida por error
- **WHEN** se compila para la tienda con la variable de herramientas de desarrollo encendida
- **THEN** la compilación falla antes de publicarse
