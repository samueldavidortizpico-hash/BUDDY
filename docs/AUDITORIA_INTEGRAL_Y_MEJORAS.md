# Auditoría integral de BUDDY

**Fecha:** 11 de octubre de 2026  
**Alcance:** revisión estática del código y documentos del repositorio, más pruebas automatizadas ejecutadas en esta auditoría. No incluye revisión en App Store/Play Console, proyecto Supabase remoto, teléfono físico ni entrevistas con personas mayores.

## Dictamen

BUDDY ya tiene una identidad visual reconocible, una experiencia de adulto mayor con acciones grandes, manejo cuidadoso del lenguaje de salud y una base automatizada útil. La pantalla del adulto era difícil de descubrir: su previa estaba dentro de **Rutina**, mientras que Resumen no la ofrecía. Añadí a Resumen un bloque visible, rotulado y accesible para abrir la vista de solo lectura. La entrega del teléfono y el PIN siguen siendo acciones separadas.

La app es adecuada para seguir iterando como prototipo local. **No recomiendo lanzar a usuarios con información real de salud todavía.** La base local completa usa AsyncStorage; Supabase y la sincronización están implementados como opción, pero el código documenta que no se han probado contra un proyecto real; tampoco se ha validado operación, recuperación de cuenta, notificaciones fiables, privacidad/regulación ni experiencia nativa con usuarios.

## Puntuación

Escala orientativa de 1 a 10. Mide el estado observado en el repositorio, no una certificación ni una prueba de campo.

| Aspecto | Nota | Evidencia y límite |
|---|---:|---|
| Claridad para llegar a la pantalla del adulto | 7.5 | Antes se encontraba en Rutina. Ahora Resumen ofrece un acceso explícito a la previa; falta observar si mayores y cuidadores entienden la diferencia entre previa y entrega. |
| Experiencia del adulto mayor | 7.5 | Una acción a la vez, botones grandes, llamadas y voz configurables. Falta probar comprensión, uso con temblor/visión reducida y salida segura en teléfonos reales. |
| Diseño visual e identidad | 8.0 | Sistema coherente, robot vectorial y cuatro temas probados; iconografía e identidad final siguen marcadas como provisionales en documentos. |
| Accesibilidad | 7.0 | Contraste automatizado y escala propia/sistema; VoiceOver, TalkBack, 200 % de texto y focos/lectores no se han validado físicamente. |
| Animación y movimiento | 7.5 | Robot y componentes respetan reducción de movimiento en código; fluidez, batería y comportamiento nativo no se han medido en dispositivos. |
| Estabilidad automatizada | 8.5 | En esta auditoría: 13 suites/415 pruebas Jest, TypeScript, lint, chequeo de 24 rutas, Expo Doctor 21/21 y dependencias alineadas. Esto no prueba un teléfono. |
| Organización y documentación | 6.0 | La separación por rutas, dominio, componentes y estado es comprensible, pero `docs/ARCHITECTURE.md` y el README de plantilla no describían el código actual. Se actualiza el mapa. |
| Privacidad y seguridad para datos reales | 3.5 | Contraseñas/sesión usan SecureStore nativo, pero los datos de salud y el hash/sal del PIN viven en el store JSON de AsyncStorage. Las cuentas locales no son cuentas respaldadas por servidor. |
| Seguridad y continuidad de medicamentos | 5.0 | La UI evita recomendaciones clínicas y etiqueta declaraciones como declaradas; no hay recordatorios del sistema fiables ni revisión farmacológica validada. No presentar como sustituto de supervisión humana. |
| Preparación para lanzamiento público | 4.0 | Falta cerrar protección de datos, backend/RLS y pruebas remotas, notificaciones, builds firmadas, políticas/consentimiento, soporte y pruebas de campo. |

**Nota global del prototipo: 6.5/10. Preparación para lanzamiento público: 4/10.** La nota global mezcla calidad visible, accesibilidad, organización, estabilidad y riesgos de operación; el dato más importante para una decisión de lanzamiento es la preparación pública, que sigue baja por riesgos de datos sensibles y funciones todavía no verificadas.

## Hallazgos y prioridades

| Prioridad | Hallazgo | Efecto | Recomendación |
|---|---|---|---|
| P0 — antes de datos reales | `src/infrastructure/local/db.ts` persiste todo el dominio en AsyncStorage (`buddy.db`): perfil, medicación, salud, contactos y hash/sal del PIN. AsyncStorage no cifra la base completa. | Un respaldo, dispositivo comprometido o extracción local puede exponer información sensible. SecureStore solo protege por separado credenciales/sesión; no cifra `buddy.db`. | Definir y probar cifrado de datos en reposo y gestión/rotación de claves. Verificar exportación, borrado, respaldos, telemetría y consentimiento con especialistas de privacidad de Colombia antes de usar datos reales. No migrar datos automáticamente sin plan probado. |
| P0 — antes de cuentas multi-dispositivo | `src/infrastructure/supabase/auth.ts` y `sync.ts` existen, pero están etiquetados como no probados contra proyecto real. La sincronización en `src/state/session.ts` captura el rechazo sin mostrar estado ni permitir que la persona sepa que no sincronizó. | El usuario podría asumir que datos guardados localmente llegaron al cuidador/servidor. | Probar RLS, ownership, borrado, conflictos, modo offline, reintentos y recuperación en un proyecto aislado; agregar estado visible de sincronización y resolución de errores. No activar el modo remoto como si estuviera certificado. |
| P1 — política de red iOS | El `expo config --type introspect` actual devuelve `NSAppTransportSecurity.NSAllowsArbitraryLoads: true` junto a una excepción local para `localhost`, proveniente de la plantilla nativa de Expo. No está declarado directamente en `app.json`. | La política resultante permite tráfico HTTP no seguro desde la app; un endpoint futuro que use HTTP podría exponer información. | Configurar política estricta para builds de producción y mantener solo excepciones de desarrollo necesarias; probar una build de desarrollo y una de producción. No fijé el valor global en `app.json` porque puede romper conexiones de desarrollo Metro por LAN; hace falta distinguir los entornos de build. |
| P1 — usabilidad | La vista del adulto se descubría desde Rutina, no desde la pantalla principal del cuidador. | Cuesta saber cómo se verá la experiencia del familiar. | **Hecho en esta auditoría:** acceso “Ver pantalla de [nombre]” en Resumen; previa explícitamente de solo lectura. Medirlo con cuidadores y mayores. |
| P1 — adulto mayor | Vista previa, entregar teléfono y PIN son conceptos distintos, pero se encontraban juntos en una tarjeta dentro de Rutina. | Riesgo de confundir revisar la pantalla con activar el modo de uso del adulto. | Mantener verbos distintos (“Ver pantalla” y “Entregar teléfono”), indicar que la previa no modifica datos y explicar la salida por PIN con voz/texto grande durante la entrega. |
| P1 — permisos nativos | La app toma fotos con cámara y abre fotos elegidas de la galería; no usa grabación de audio. La configuración nativa no tenía mensajes de uso propios. | Permisos opacos o solicitud de micrófono innecesaria perjudican confianza y pueden complicar revisión de tienda. | **Hecho en esta auditoría:** configurados los plugins SDK 57 de Camera/ImagePicker con explicaciones en español y micrófono desactivado. Requiere una nueva build nativa para comprobar el manifest/Info.plist final; Expo Go no valida la configuración del binario de BUDDY. |
| P1 — recordatorios | La app organiza dosis, pero no programa notificaciones nativas fiables; los documentos ya lo señalan como futuro. | Puede confundirse una agenda visible con una alarma que avisará a la hora. | Implementar notificaciones locales con permisos, zona horaria, cambios de horario y reglas de sistema operativo probadas; mantener una indicación clara cuando estén desactivadas. No prometer puntualidad hasta validarla. |
| P1 — accesibilidad real | Hay test de contraste, pero no evidencia física de lector de pantalla, escala máxima de fuentes, contraste alto con todas las pantallas o tamaños pequeños. | Botones visibles en capturas pueden resultar difíciles de usar con preferencias reales del sistema. | Prueba guiada en iOS VoiceOver y Android TalkBack; texto del sistema al máximo; 320–360 dp; alto contraste; teclado; orientación permitida. Registrar incidencias por pantalla. |
| P1 — seguridad clínica | La revisión farmacológica no consulta fuentes clínicas verificadas y la app no interpreta mediciones. | No debe inferirse que BUDDY verifica interacciones, tomas o deterioro clínico. | Mantener mensajes transparentes; revisión de contenido por profesional y protocolo claro de emergencia antes de promoción pública. No añadir consejos ni alertas clínicas automáticas sin gobernanza clínica. |
| P1 — minimización de datos | El asistente recopila género, edad o fecha de nacimiento, peso y estatura; el paso de salud también pide aseguradora y médico. La búsqueda de referencias muestra que la mayoría solo se inicializa, valida y guarda en el flujo/modelo, sin uso actual en otras pantallas o reglas. | Aumenta la carga del registro y la cantidad de datos sensibles sin un beneficio demostrado para las funciones activas. | Revisar campo por campo con cuidadores; quitar o aplazar lo que no sea necesario. No cambiar el esquema de datos mientras existan registros guardados sin una migración probada. |
| P2 — animación | Robot/vector, vuelo y microinteracciones son parte de la marca; solo hay evidencia automatizada/web, no FPS/consumo nativos. | En equipos antiguos puede haber gasto de batería, tirones o distracción. | Medir en gama baja con movimiento reducido, background/foreground y sesiones largas; preferir animaciones breves de confirmación y evitar movimiento constante junto a tareas críticas. |
| P2 — comprensión de producto | El README era la plantilla de Expo y recomendaba `reset-project`; la arquitectura describía carpetas/roles obsoletos. | Nuevos colaboradores podían borrar el proyecto o seguir instrucciones incorrectas. | **Hecho en esta auditoría:** README reemplazado por guía de BUDDY y se añadió un mapa vigente. Mantener checklist de rutas y notas de versión al día. |
| P2 — marca | Documentación del proyecto registra logo/iconos de baja resolución o provisionales. | La primera impresión de tienda puede parecer prototipo aunque las pantallas estén cuidadas. | Encargar exportación oficial del robot/logo/iconos, splash y capturas localizadas, revisar recorte Android adaptativo y iOS. |
| P2 — lanzamiento | Hay identificadores, declaración y soporte tablet que deben confirmarse; no se mostró un checklist de release firmado. | Riesgo de metadatos provisionales, permisos incorrectos o una build que no corresponde a la demo/local. | Antes de publicar: fijar bundle IDs, EAS profiles, privacidad y permisos mínimos, build release, versionado, crash reporting con minimización de datos y plan de soporte. |

## Qué simplificar y qué conservar

- **Conservar:** pantalla “Ahora” para el adulto, resumen del cuidador, rutina, accesibilidad, PIN para devolver el teléfono y el robot. Son funciones centrales, no decoración prescindible.
- **No presentar como funciones listas:** escaneo automático de medicamentos, IA clínica, GPS en vivo, llamadas reales, voz conversacional o avisos del sistema mientras sigan como demostración, locales o “próximamente”. Es mejor ocultar la promesa que retirar capacidades reales.
- **Simplificar navegación antes de quitar pantallas:** en pruebas de producto medir si las cinco pestañas de cuidador ("Resumen", "Rutina", "BUDDY", "Salud", "Ajustes") tienen nombres y jerarquía comprensibles. No quitar BUDDY/Salud por intuición; usar tareas observadas y tasa de éxito.
- **Reducir el registro inicial:** hoy se preguntan varios datos demográficos/de salud que el flujo no aprovecha todavía; posponer captura hasta que haya una finalidad clara y consentimiento específico.

## Ideas de producto para cuidar mejor

Priorizar mejoras que ayuden a la vida diaria y no prometan supervisión médica que BUDDY no puede ofrecer:

1. **Rutina compartida y legible:** el adulto ve solo la siguiente actividad; el cuidador puede revisar el resto y distinguir “declarado por la persona” de “confirmado por un cuidador”. Dar opción de repetir instrucciones por voz.
2. **Seguimiento amable, configurable:** si una toma queda sin respuesta, preguntar primero si necesita ayuda y mostrarlo al cuidador como seguimiento. Permitir cambiar horario y descartar recordatorios con respeto, sin mensajes culpabilizantes ni llamar “emergencia” a una respuesta ausente.
3. **Contacto fácil:** llamar a un contacto elegido y pedir ayuda con botones grandes; verificar teléfonos y país junto al cuidador. No marcar automáticamente ni prometer atención si el teléfono está desconectado.
4. **Continuidad de cuidado:** calendario simple de citas, notas prácticas y relevo entre cuidadores con quién registró cada cambio. Compartir solo con personas invitadas y con permisos explícitos.
5. **Rutinas de bienestar elegidas por la persona:** agua, comidas y actividades con horarios que pueda adaptar el adulto y el cuidador. Evitar metas universales o interpretar cantidad de agua, sueño o ánimo como diagnóstico.
6. **Menos carga para el cuidador:** resúmenes claros de “qué requiere atención hoy”, tareas compartidas y opción de descanso; evitar dashboards con muchos indicadores, notificaciones repetidas o puntuaciones de salud no validadas.
7. **Accesibilidad configurada con la persona:** lectura en voz alta de la acción actual, volumen/velocidad simples, botones con etiqueta hablada, alto contraste, texto grande y una alternativa para quien no pueda tocar con precisión.

No añadir por atractivo detección de caídas, monitoreo GPS continuo, diagnóstico por IA ni verificación automática de que se tomó un medicamento sin sensores/servicio validados, consentimiento, revisión clínica y respuesta operativa reales.
- **Reducir sobrecarga visual:** reservar animación persistente para bienvenida/reposo; acciones de medicación, PIN y emergencia necesitan foco, etiquetas claras y feedback corto que no dependa del color o movimiento.
- **Separar demo y real:** cuenta local, datos de ejemplo, sincronización, mapa, contactos de emergencia y llamadas deben tener un estado visual consistente para que una persona no interprete datos ficticios como reales.

## Organización del proyecto observada

La fuente de verdad actual está resumida en `docs/ARQUITECTURA_ACTUAL.md`. En términos prácticos: `src/app` decide rutas; `src/features` compone flujos; `src/domain` contiene reglas/modelos; `src/state` y `src/infrastructure` administran estado/persistencia; `src/components` concentra piezas reutilizadas; `src/theme` y `src/i18n` mantienen diseño y textos. La base de datos local está en `src/infrastructure/local/db.ts`; no hay una capa `src/repositories` en el estado actual, pese a que el antiguo documento lo afirmaba.

Evitar refactorizar todo. Próximo trabajo de arquitectura recomendado: encapsular el estado de sincronización detrás de una interfaz visible y reducir la cantidad de lógica de flujo en pantallas, sin mover carpetas hasta que haya pruebas de comportamiento que la protejan.

## Cambios realizados durante esta auditoría

1. Se añadió en Resumen del cuidador una tarjeta “Pantalla del adulto mayor”, un botón por nombre y una indicación explícita de que abre una vista sin cambios.
2. Se agregó una prueba de regresión que comprueba visibilidad y navegación a la vista previa.
3. Se sustituyó el README de plantilla por guía de inicio, flujos, comandos, mapa de carpetas y advertencia sobre el estado de demostración. Se eliminó la instrucción de `reset-project`.
4. Se documentan arquitectura real, riesgos de privacidad, integración remota y validación pendiente, sin tocar Supabase ni cambiar dependencias.
5. Se explicitan los permisos de cámara y galería para nuevas builds y se elimina la grabación de audio que el flujo de fotos no necesita.

## Verificación

Resultados al 11-10-2026: `npm.cmd test -- --runInBand` pasó **13 suites y 415 pruebas**; `npm.cmd run typecheck`, `npm.cmd run lint` y `npm.cmd run check:headers` pasaron (24 rutas); `npx.cmd --yes expo-doctor` pasó **21/21**; `npx.cmd expo install --check` indicó dependencias alineadas; `npm.cmd ls --depth=0` no reportó dependencias faltantes o extrañas; `git diff --check` pasó. La configuración Expo introspectada contiene los textos en español para cámara/fotos y quita `RECORD_AUDIO`; la build nativa todavía debe confirmar el resultado. Intenté abrir la web local, pero no había navegador conectado a la sesión, así que no registré revisión visual web. Las pruebas de Jest sirven para lógica/rutas simuladas; no son prueba de Expo Go.

**Pendiente de dispositivo:** ejecutar los flujos en Expo Go en iOS y Android, con lector de pantalla, texto grande, VoiceOver/TalkBack, entrada/salida por PIN, llamadas (sin realizar llamada real durante la prueba), reducción de movimiento y carga prolongada. Antes de datos reales: revisión de privacidad/cifrado y pruebas de Supabase/RLS en entorno aislado.
