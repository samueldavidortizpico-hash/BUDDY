# Spec Delta

## Purpose

Define qué se vende en cada plan y bajo qué condiciones se puede cobrar, para que nadie pague por algo que la app no
entrega y para que las funciones de seguridad nunca queden detrás de un pago.

## ADDED Requirements

### Requirement: Solo se cobra lo que se entrega
Cada beneficio de un plan SHALL declarar si está disponible en la versión instalada. Solo los disponibles SHALL
presentarse como incluidos en el precio. Un plan SHALL poder comprarse solo si tiene al menos un beneficio propio
disponible.

#### Scenario: Plan con beneficios pendientes
- **WHEN** el plan Familiar tiene beneficios que necesitan el servidor y el servidor no está activo
- **THEN** la pantalla de planes lo muestra como "Próximamente", sin precio para comprar ni botón de compra

#### Scenario: Plan con parte disponible
- **WHEN** Plus tiene disponibles el chat, el historial y las tendencias de sueño, y pendientes el reloj y el reporte PDF
- **THEN** Plus se puede comprar, su precio lista solo los tres disponibles y los otros dos aparecen aparte como "Próximamente"

### Requirement: Lo pendiente se nombra como pendiente
Un beneficio no disponible SHALL mostrarse con la marca "Próximamente" y SHALL NOT aparecer como incluido en el plan
que se compra.

#### Scenario: Reporte para el médico sin construir
- **WHEN** el reporte en PDF para el médico no existe en la app
- **THEN** no aparece entre los beneficios que se pagan con Plus; si se lista, va marcado "Próximamente"

### Requirement: Seguridad siempre gratis
Medicamentos, recordatorios, aviso escalonado, existencias, chequeo diario, pedir ayuda y alertas de seguridad SHALL
estar disponibles en el plan gratis y SHALL NOT bloquearse por falta de pago o por un pago vencido.

#### Scenario: Suscripción vencida
- **WHEN** vence la suscripción de un titular
- **THEN** sus recordatorios y avisos de toma sin confirmar siguen funcionando

### Requirement: El plan pertenece a la cuenta y lo confirma la tienda
El plan SHALL asociarse a la cuenta del titular y SHALL decidirse por la compra verificada en la tienda. Un plan de
prueba local SHALL NOT tener efecto en una compilación de tienda. Las cuentas vinculadas SHALL heredar el plan de su
titular.

#### Scenario: Dos cuentas en un teléfono
- **WHEN** en un mismo teléfono entra una segunda cuenta que no compró nada
- **THEN** esa cuenta ve el plan gratis

#### Scenario: Enfermera del titular con plan Salud
- **WHEN** la enfermera de un titular con plan Salud inicia sesión en su propio teléfono
- **THEN** tiene las funciones del plan Salud sin comprar nada

### Requirement: Compra transparente
Antes de comprar, la pantalla SHALL mostrar precio, periodo, renovación automática, cómo cancelar, restaurar compras,
términos y política de privacidad. Ningún precio o ahorro SHALL inventarse: un precio sin definir no se muestra.

#### Scenario: Precio anual sin definir
- **WHEN** el precio anual de un plan no está definido
- **THEN** la opción anual no se ofrece y no se muestra ningún porcentaje de ahorro
