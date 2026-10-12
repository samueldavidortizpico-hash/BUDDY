# Seguridad, privacidad y legal de BUDDY

Estado al 2026-10-12. BUDDY maneja datos de salud de adultos mayores: son datos sensibles (Ley 1581 de 2012 en Colombia). Este documento separa lo que **ya existe** de lo que **falta** antes de una beta con usuarios reales.

## Lo que existe hoy

- Datos solo en el teléfono, separados por cuenta y por adulto mayor; contraseñas con sal y hash iterado; PIN del administrador con límite de intentos.
- Ningún secreto en el cliente (`EXPO_PUBLIC_*` solo para configuración no secreta).
- **APIs externas (V2.4):** BUDDY consulta RxNorm y MedlinePlus Connect (NLM) enviando **solo nombres o códigos de medicamentos**, nunca datos de la persona o del perfil (prueba automática en `src/__tests__/v24/knowledge-chat.test.tsx`). Respuestas en caché 24 h; sin conexión se usa lo guardado o se dice que no hay información.
- Notificaciones en la pantalla de bloqueo sin el nombre del medicamento, salvo que el cuidador lo active.
- Reglas de revisión de nivel 2 apagadas en producción hasta su revisión profesional (`src/config/features.ts`).

## Lo que falta (Fase 4, antes de la beta)

- Cifrado en tránsito (TLS) en todo servicio propio; cifrado en reposo en el servidor; cifrado a nivel de campo para los datos más sensibles, con gestión y rotación de claves.
- Almacenamiento local cifrado (hoy los datos persisten sin cifrar en AsyncStorage) y fotos en el directorio privado de la app (no cifradas).
- Protección de copias de seguridad (excluir datos de salud de los respaldos del sistema).
- Auditoría de accesos, minimización y retención, borrado de cuenta y de datos verificable.
- Pruebas de penetración básicas y pruebas de RLS contra una base local (nunca producción).
- Plan de respuesta a incidentes.

## Legal (a revisar con un abogado colombiano)

- Autorización expresa del tratamiento de datos sensibles; política de tratamiento y aviso de privacidad; consentimiento y su revocación (también para ubicación e IA).
- Capacidad y apoyos del adulto mayor para consentir (Ley 1996 de 2019).
- Contratos de encargado y transferencia internacional con los proveedores (Supabase, proveedor de IA, servicios de NLM).
- Registro de bases de datos ante la SIC, si aplica.
- Términos de uso y límites del asistente: no es dispositivo médico, no diagnostica ni receta.
- Formularios de seguridad de datos de App Store y Google Play.

### Preguntas para el abogado

1. **Software médico e INVIMA:** ¿mostrar información de un registro público y de MedlinePlus, y advertir coincidencias con alergias registradas, convierte a BUDDY en software como dispositivo médico ante el INVIMA? ¿Qué cambia si en la Fase 7 se agregan interacciones?
2. **Datos de salud y APIs externas:** ¿enviar solo el nombre o el código de un medicamento a servicios de EE. UU. (NLM) es transferencia internacional de datos personales o sensibles?
3. **Licencias:** ¿la licencia CC BY-SA 4.0 del índice derivado de los datos del INVIMA impone obligaciones adicionales en una app comercial?
4. **IA (Fase 6):** ¿qué consentimiento y qué contratos se requieren para procesar texto del cuidador con un proveedor de IA fuera de Colombia?
5. **Ubicación:** ¿cómo documentar el consentimiento revocable del adulto mayor y su capacidad para darlo?
6. **Responsabilidad:** ¿qué exención de responsabilidad es suficiente en la interfaz y en los términos?
