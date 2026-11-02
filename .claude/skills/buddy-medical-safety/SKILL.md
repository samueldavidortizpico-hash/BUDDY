---

name: buddy-medical-safety
description: Reglas de seguridad clínica, privacidad y trazabilidad para BUDDY. Usar SIEMPRE que se trabaje en funciones de medicamentos (registro, dosis, interacciones, advertencias), funciones de IA (extracción desde fotos de recetas/cajas, resúmenes, chat), monitoreo de salud o signos vitales, alertas al paciente o cuidador, manejo de datos de salud, consentimiento, claves/API o Supabase con datos sensibles, y antes de habilitar cualquier evaluación médica para usuarios reales.
---

# BUDDY — Seguridad médica

BUDDY es una herramienta de **apoyo y recordatorio**, no un dispositivo de diagnóstico ni un sustituto del médico o farmacéutico. Ante cualquier duda, la respuesta segura es: no afirmar, mostrar la incertidumbre y derivar a un profesional.

## Reglas absolutas

Aplican al código, a los prompts de IA, a los datos de prueba y a las respuestas que Claude dé durante el desarrollo.

1. **Nunca inventar interacciones farmacológicas**, dosis, contraindicaciones, efectos adversos ni equivalencias entre medicamentos. Si no hay fuente verificada, la advertencia no existe.
2. **La salida de un modelo de IA no es evidencia clínica.** Nunca se muestra como hecho, nunca dispara por sí sola una alerta clínica y nunca sobrescribe datos confirmados.
3. **No diagnosticar.** Ningún texto de la app ni del código concluye qué enfermedad tiene el usuario.
4. **No recomendar suspender, iniciar, saltar, duplicar ni modificar** un tratamiento de forma autónoma. Lo máximo: "Consulta con tu médico o farmacéutico".
5. **No generar datos clínicos inventados** que puedan confundirse con reales. Los datos de prueba son ficticios, marcados como tales (`[PRUEBA]`, nombres claramente falsos) y nunca se siembran en producción.

## Fuentes farmacológicas

- Solo fuentes verificadas y con licencia de uso adecuada. Candidatas (confirmar acceso, licencia y cobertura para el país objetivo antes de integrarlas):
  - Registros sanitarios oficiales: INVIMA (Colombia), AEMPS/CIMA (España), FDA (openFDA, DailyMed), EMA.
  - Terminologías: RxNorm (NLM), ATC/OMS.
  - Bases de interacciones con licencia comercial: requieren contrato; no hacer scraping.
- Cada advertencia almacena: `fuente`, `identificador_en_fuente`, `version_o_fecha_consulta`, `severidad_segun_fuente`, `texto_original`. Sin estos campos la advertencia no se muestra.
- No reformular ni reclasificar la severidad con IA; se usa la clasificación de la fuente.
- Si la fuente no cubre un medicamento → mostrar "No hay información verificada disponible", no un silencio que parezca "sin riesgos".

## IA y extracción desde fotografías

- Todo dato extraído de una foto (nombre, concentración, dosis, frecuencia, lote, caducidad) entra como **borrador no confirmado** con estado explícito (`pendiente_verificacion`).
- El usuario o cuidador confirma **campo por campo** antes de guardar o programar alarmas. Nada se programa a partir de un borrador.
- Mostrar la imagen original junto a los campos extraídos para comparar.
- Campos ilegibles, ambiguos o de baja confianza se marcan visualmente y quedan vacíos, no adivinados.
- Normalizar contra la fuente farmacológica; si no hay coincidencia exacta → advertir, no autocorregir al "más parecido".
- Prompts de IA: instruir a no inferir datos ausentes, devolver `null` para lo desconocido y no dar consejo médico. Validar la salida con un esquema tipado (p. ej. Zod) y descartar lo que no cumpla.
- Registrar modelo, versión y fecha de cada extracción.

## Incertidumbre y datos faltantes

- Distinguir siempre: **confirmado por el usuario**, **verificado contra fuente**, **sugerido por IA**, **desconocido**. La UI lo muestra.
- Nunca rellenar valores clínicos por defecto (dosis, frecuencia) sin acción del usuario.
- Si faltan datos para evaluar algo (p. ej. interacción sin la lista completa de medicamentos), decirlo: "La revisión puede estar incompleta porque…".

## Niveles de alerta

| Nivel | Ejemplos | Comportamiento |
|---|---|---|
| Informativa | Recordatorio de toma, dosis registrada, stock bajo | Notificación normal, sin lenguaje alarmista |
| Atención | Dosis olvidada, posible duplicado, interacción documentada en fuente verificada | Mensaje claro + fuente + "consulta con tu médico o farmacéutico" |
| Requiere evaluación profesional | Interacción de severidad alta según la fuente; valores de monitoreo fuera de umbrales definidos por un profesional | Mensaje de derivación; aviso al cuidador solo con consentimiento; **nunca** instrucciones de tratamiento |
| Emergencia | Síntomas o valores que un protocolo clínico revisado defina como emergencia | Indicar contactar servicios de emergencia locales. Solo se implementa con protocolo revisado por un profesional |

Los umbrales de monitoreo (presión, glucosa, frecuencia cardiaca, etc.) **no los define Claude ni la IA**: los configura un profesional por paciente o provienen de una guía clínica citada.

## Privacidad y consentimiento

- Los datos de salud son sensibles (Ley 1581 de 2012 en Colombia, RGPD en la UE, HIPAA si aplica en EE. UU.). Confirmar con el usuario el marco legal del país objetivo.
- Consentimiento explícito, granular y revocable para: uso de IA sobre fotos/datos, compartir con cuidadores, notificaciones con contenido sensible.
- Minimización: no enviar a servicios de IA más datos de los necesarios; quitar identificadores cuando sea posible.
- Notificaciones en pantalla de bloqueo sin nombre del medicamento por defecto (configurable).
- Supabase: RLS activado en **todas** las tablas con datos de salud y políticas probadas (ver `buddy-testing`). Acceso cuidador–paciente solo mediante vínculo aceptado.
- Derecho a exportar y eliminar los datos.

## Claves y datos sensibles

- Nunca claves secretas en el cliente. En la app solo la `anon key` de Supabase (protegida por RLS). `service_role` y claves de IA o de bases farmacológicas solo en Edge Functions o backend.
- Las variables `EXPO_PUBLIC_*` se incrustan en el bundle: nunca secretos ahí.
- Tokens de sesión en `expo-secure-store`.
- No registrar (logs, Sentry, analítica) nombres de medicamentos, diagnósticos, imágenes ni datos identificables.
- No pegar datos reales de pacientes en prompts, issues, commits ni conversaciones con Claude.

## Trazabilidad

Cada advertencia o alerta mostrada guarda un registro inmutable con: id, paciente, tipo y nivel, fuente y versión, entradas que la produjeron, si intervino IA (modelo/versión), marca de tiempo UTC y acción del usuario (vista, descartada, consultada). Debe poder reconstruirse por qué se mostró.

## Antes de habilitar evaluación médica para usuarios reales

Ninguna función que evalúe riesgos, interacciones o valores de salud se activa en producción sin:

- [ ] Fuente farmacológica/clínica identificada, con licencia y versión registrada.
- [ ] Pruebas automatizadas con casos positivos, negativos, desconocidos y con datos faltantes (ver `buddy-testing`).
- [ ] Revisión documentada por un profesional de salud cualificado (médico/farmacéutico) de reglas, umbrales y textos.
- [ ] Textos revisados: sin diagnóstico, sin instrucciones de modificar tratamiento, con derivación clara.
- [ ] Feature flag desactivado por defecto; activación gradual y reversible.
- [ ] Revisión de privacidad, consentimiento y RLS completada.
- [ ] Evaluado si la función cae bajo regulación de software como dispositivo médico en el país objetivo; si es así, detenerse y consultar con el usuario.
- [ ] Aprobación explícita del responsable del proyecto.

## Checklist rápido para cualquier cambio en medicamentos, IA o salud

- [ ] ¿Algún dato clínico mostrado proviene de IA sin confirmar o sin fuente? → Bloquear.
- [ ] ¿Algún texto sugiere diagnóstico o cambio de tratamiento? → Reescribir.
- [ ] ¿Se muestra la incertidumbre y lo que falta?
- [ ] ¿Cada advertencia tiene fuente y registro de trazabilidad?
- [ ] ¿Hay secretos en el cliente o datos de salud en logs?
- [ ] ¿RLS y consentimiento cubren el nuevo acceso a datos?
- [ ] ¿Se añadieron pruebas según `buddy-testing`?

Si una solicitud contradice estas reglas, señalarlo antes de implementar y proponer la alternativa segura.
