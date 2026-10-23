# Auditoría V3.1

Fecha: 2026-10-22. Este prompt sustituye al V3.1 anterior donde se contradigan.

## Condiciones y límites de evidencia

- Rama inicial `main`, remoto `https://github.com/samueldavidortizpico-hash/BUDDY.git`.
- Cambios anteriores conservados fuera de los commits de esta ronda: `.vscode/settings.json`, `package.json`, `package-lock.json`, `docs/capturas/v25/`, `scripts/capture/v25-chat.mjs`.
- Expo `~57.0.30`, React Native `0.86.3`. Documentación consultada: [Expo 57](https://docs.expo.dev/versions/v57.0.0/), [índice Expo](https://docs.expo.dev/llms.txt), [Flexbox RN 0.86](https://reactnative.dev/docs/0.86/flexbox), [Text RN 0.86](https://reactnative.dev/docs/0.86/text).
- No había servidor web activo. No se inició ninguno, conforme al prompt. Se solicitó una URL del servidor que inicia el dueño. Los scripts de captura que levantan un servidor estático tampoco se ejecutan.
- `adb devices -l`: lista vacía. Existe el AVD Pixel_7_Pro, pero no estaba arrancado. No hay evidencia visual Android ni iPhone.
- Los renders de Jest no ejecutan Yoga ni prueban el desborde físico: se identifican expresamente como evidencia estructural. No sustituyen la matriz nativa de fuente/ancho ni VoiceOver/TalkBack.

## Skills y mapa

- Leídas: `buddy-testing`, `buddy-medical-safety`, `frontend-design`, `baseline-ui`, `fixing-accessibility`, `playwright-cli` y `taste`.
- Graphify está instalado; su instrucción real se distribuye como `C:/Users/samue/AppData/Roaming/Python/Python314/site-packages/graphify/skill-codex.md`. Se usa extracción AST local, sin análisis de IA ni servicios externos: `graphify.cmd extract src --code-only --no-cluster --out .` → 1331 nodos, 5838 aristas al inicio. Generados ignorados en `graphify-out/`; no prueba por sí solo ausencia de código muerto.
- `baseline-ui` y `fixing-accessibility`: aplicar equivalentes React Native; no migrar a Tailwind, DOM ni motion/react.
- `taste` analiza sitios de referencia, no aplica a esta app nativa; `task-observer`, `ui-skills-root`, `find-skills` no se localizaron en el catálogo ni en las carpetas de skills inspeccionadas. No se instalaron herramientas.

## Hito 1 — textos y botones (implementación parcial; falta reproducción visual nativa)

Brief visual:
1. Una pregunta protagonista en la pantalla del adulto mayor.
2. Contenido de esa pregunta centrado, acciones con etiquetas completas.
3. Acciones secundarias compactas con icono y etiqueta.
4. Al crecer la letra, el texto conserva ancho y la acción pasa debajo.
5. Se conservan Manrope, paleta y robot existentes.

| Fallo | Antes / causa demostrada | Cambio | Después / evidencia |
|---|---|---|---|
| Texto sin política nativa de encogimiento | `layout-v31.test.tsx`: AppText no declara `minWidth: 0`, `flexShrink: 1`. RN usa flexShrink 0 por defecto. | Contrato base en AppText, heredado por textos de toda la app. | La regresión pasa; no equivale a reproducir letras verticales en iPhone. |
| Etiquetas de IconButton | Regresión falla por ausencia de centrado y shrink. | Etiqueta centrada, píldora con ancho máximo y altura mínima. Iconos indeformables. | Regresión pasa. |
| Editar grande | Regresión mide padding horizontal 20 en tamaño sm. | Tamaño sm usa padding 8, conserva área mínima 48 y texto escalable. | Regresión pasa. |
| Ubicación junto a Dejar de compartir | Código: un único row envuelve icono, texto flex y botón sin reserva mínima para el texto. Síntoma físico reportado, no reproducido visualmente aquí. | InlineBanner divide mensaje/acción; columna a 360/375 o escala combinada >1,15. | Matriz de decisión 3 anchos × 3 escalas del sistema × 5 pasos de la app probada en funciones puras. Falta Yoga real. |
| Chat estrecho | Código: límite 88% sin ancho explícito; contenedor alineado al inicio. | Fila a ancho completo, burbuja 85% explícito, alignSelf según emisor; resultados a ancho completo. | Falta captura del mismo chat en web y nativo. |
| Marcar como tomado / existencias | Fila horizontal con hora de mínimo 96, estado y botón; acciones de existencias con basis 140. | InlineBanner para toma; compra/corrección a ancho completo; títulos de propuesta hasta dos líneas. | Render de pantallas pasa, falta comprobación visual. |
| Texto corrido de pantalla adulta | Código sin centrado del título/pregunta ni de etiquetas de caras. | Preguntas y caras centradas; cuerpos con ancho completo. | Render estructural, falta iPhone. |
| Recuadro amarillo Cerrar | No se encontró `title`/tooltip con ese texto en la pantalla adulta. Sí existen nombres accesibles de cierre en las hojas. | **Sin cambio especulativo.** No retirar etiquetas que necesita VoiceOver. | Pendiente reproducir y localizar origen real. |

Reproducción: primera ejecución de la nueva suite falló por falta del mock de safe-area (error del arnés, no del producto); corregido el arnés, **18 pruebas fallaron por las aserciones buscadas antes de modificar los componentes**. Después: suite de layout + smoke **97/97 pruebas**. Typecheck y lint terminaron sin errores. La guarda inicial señaló Text ajenos a filas; se afinó para revisar contexto de fila mediante AST, sin eximir contenido por nombre de archivo.

Controles nuevos:
- `node scripts/check-text-rows.mjs`: guarda AST de Text en filas y contrato base AppText; no es un motor de layout ni resuelve toda expresión de estilo dinámica.
- `$env:BUDDY_TEST_URL='http://localhost:8081'; node scripts/check-text-widths.mjs`: usa solo servidor ya activo; texto de más de 3 caracteres con ancho <48 y botones fuera del contenedor hacen fallar. App al máximo, 360/375/390. **No ejecutado** por ausencia de servidor; no afirma emular fontScale nativo.
- `layout-v31.test.tsx`: prueba contrato escalable y decisión de columna en los 45 casos de ancho/fuente; medición física pendiente.

Verificación adicional del hito: guarda AST **406 declaraciones**; suite completa **40 suites, 712 pruebas aprobadas**; `typecheck`, `lint`, `git diff --check` sin errores. Jest emitió una advertencia `act` preexistente en NotificationsSection (suite V3.0); no se presenta como ejecución sin advertencias.

## Hito 2 — vista y cambio de cuenta

Skills: buddy-testing, buddy-medical-safety, baseline-ui, fixing-accessibility (ya leídas). Brief: una vista de lectura; banner explícito; una acción de cambiar cuenta; contraseña en ruta propia; errores junto al campo.

| Fallo | Antes / causa | Después / evidencia |
|---|---|---|
| Nombre no abre vista | `Summary` abría selector de personas. `PreviewSheetButton` abría otra hoja. | Ambos abren `/preview`. Mi perfil conserva acceso a la misma ruta. |
| No había cambio con acceso de la persona | Dos tests de integración fallaron por servicio inexistente antes del cambio. | Servicio verifica cuenta vinculada, rol, revocación y contraseña antes de cambiar sesión. Contraseña errónea conserva sesión. |
| PIN aparte para salir | `ElderOptionsSheet` y `/elder/unlock` exigían PIN, luego otra pantalla de login. | Una contraseña de cuenta basta. Las entregas antiguas siguen siendo válidas; tras contraseña se elimina el PIN persistido, sin borrar persona ni registros. |
| Recuperación local inexistente | El proveedor respondía solamente que no podía enviar correo. | Código mostrado una vez, hash con sal, rotación, consumo, bloqueo y nuevo acceso probados contra el proveedor local. No se publica código en URLs ni se registra en logs. |
| Riesgo de salir de la vista modificando alarmas | La vista usa `preview`; los efectos de sincronización, programación y respuestas están guardados. | Se mantiene lectura. El acceso cambia sesión solo después de verificar credenciales. Limitación de pausa y siguiente reprogramación documentada en V31-09. |

Pruebas específicas iniciales tras el cambio: 3 suites, 15 pruebas aprobadas (proveedor, formulario, Expo Router real), `typecheck`, lint y 31 rutas con encabezados. Se amplían pruebas de bloqueo y aislamiento entre dueños antes del commit. Recorrido de Router: vista → contraseña de persona → adulto mayor → contraseña del dueño → Inicio → cerrar sesión → entrada; prueba estructural en Jest, **no web ni celular**.

La herramienta de escritura inicial falló por comillas de PowerShell antes de escribir; se corrigió usando texto literal UTF-8. No se atribuye ese error al producto.

Verificación de cierre del hito 2: **41 suites / 714 pruebas aprobadas**. Tipos, lint, guarda de texto y comprobación de encabezados sin errores. Las 5 expectativas obsoletas se migraron conservando pruebas de lectura, actualización reactiva, error de contraseña y roles; no se omitieron pruebas. Sigue pendiente el recorrido visual en web/iPhone.

## Hito 3 — navegación

Skills aplicadas: `baseline-ui` para jerarquía y orden de pestañas; `fixing-accessibility` para mantener objetivo táctil de al menos 64 dp y etiquetas del lector; `fixing-motion-performance` para conservar solo la animación del robot existente y las transformaciones del indicador de la barra. No se añadió una animación nueva.

| Fallo | Antes / causa demostrada | Cambio | Después / evidencia |
|---|---|---|---|
| No había botón central BUDDY | Reproducción en Jest: la barra mostraba cuatro pestañas y no encontraba el botón central accesible. Causa: Hito 2 dejó el chat como ruta completa pero el diseño V3.0 mantuvo la barra de cuatro pestañas y un lanzador flotante aparte. | Barra ordenada Inicio, Salud, BUDDY, Ubicación y Rutina; botón central mint abre `/buddy`; se quitó lanzador duplicado; Ajustes se abre desde el avatar del Inicio y queda fuera de la barra. | `navigation-v31.test.tsx`: botón central abre ruta y no llama la navegación de pestañas; Ubicación navega a su ruta. La prueba focal pasa. |
| Ubicación no era pestaña | La ruta existía en el stack del cuidador, no dentro del navegador de pestañas. | Se movió la misma pantalla al grupo `(tabs)`; la URL estable `/location` no cambia. | `check:headers` valida 31 rutas; prueba focal de navegación pasa. |
| Chat podía mostrarse con barra o robot redundante | El chat ya era ruta de stack; el icono de Inicio y el lanzador de pantalla tenían accesos repetidos. | El acceso de chat queda central en la barra; el botón junto a campana ahora es el avatar y abre Cuenta. | Verificado por código y prueba del componente; aún sin captura de navegador. |

La prueba inicial focal fallaba porque no encontraba BUDDY; ese fue el fallo reproducido antes del cambio. Después pasan la prueba de navegación, `typecheck`, `lint` y `check:headers` (31 rutas). La suite completa queda en **42 suites / 715 pruebas aprobadas**. `scripts/check-text-rows.mjs` se ejecuta como `node scripts/check-text-rows.mjs` (no existe un script npm llamado `check:text-rows`); informó **405 declaraciones**, y no mide Yoga. No se inició servidor ni se capturó web por instrucción del dueño; el comportamiento visual en navegador, iPhone y Android queda pendiente. Android no tiene dispositivo conectado por adb.

## Hito 4 — chat y automatizaciones

Skills: `baseline-ui` (tarjetas y jerarquía del chat), `fixing-accessibility` (controles de respuesta y mensajes legibles), `fixing-motion-performance` (entrada y puntos con solo opacidad/transform en UI), y `buddy-medical-safety` (no inferir dosis/ingesta ni dar consejo médico).

| Fallo | Reproducción y causa | Cambio | Después / evidencia |
|---|---|---|---|
| BUDDY sacaba al usuario del chat al pedir medicamento | No se reproduce en el checkout actual: `chat-guided.test.tsx` crea el borrador desde el chat, mantiene pregunta y selección en tarjeta fija, y no llama a `router.push`. El único `/medication/new` en `buddy.tsx` es al elegir una foto importada. | Se añadió una aserción explícita de que pedir un medicamento no navega fuera del chat. Selector de hora/fecha sigue en hoja que vuelve a la tarjeta. | Prueba guiada pasa; la incidencia reportada quizá pertenecía a un flujo anterior, no se afirma reproducida en UI real. |
| Texto extra bajo “¿Cómo se llama el medicamento?” | La tarjeta mostraba siempre `O escríbelo abajo.` para `kind=text`; repetía la opción de escribir del compositor en el paso de nombre. | Se omite en ese paso concreto; las otras preguntas de texto conservan la indicación. | Regresión comprueba que el texto no aparece. |
| Chat sin hora ni avatar en mensajes; respuesta con espera fija | `AssistantMessage.createdAt` estaba disponible pero no se mostraba; las burbujas no incluían robot; todas esperaban 350 ms. | Hora en cada burbuja, robot junto a mensajes de BUDDY, animación de entrada y “BUDDY está escribiendo” con tres puntos; espera 300–1100 ms proporcional al texto y respeta movimiento reducido. | Render guiado y `typecheck` pasan; falta captura web y comprobación de VoiceOver/tacto nativos. |
| No existía concepto editable de automatización | No había modelo ni estado para preguntas periódicas. | El campo opcional de `Reminder` crea, lista, edita, pausa y borra automatizaciones en Rutina. Avisos locales; la pantalla adulta muestra la pregunta al vencer y respuestas; se registran en Salud. Respuestas negativas de ánimo/malestar crean alerta de seguimiento. Compatibilidad con recordatorios previos sin migración. | Pruebas prueban estado de crear/cambiar/pausar/listar, combinación con medicamento, respuesta “Mal” que actualiza Salud y alerta, y planificador local. No hay backend ni sincronización entre teléfonos. |
| Frases de automatización y mezclas | Antes no había reglas para esas intenciones; corpus inicial marcó seis frases fallidas (avisos con “avísame”, conjugaciones de recordar/almorzar y listado). | Se corrigieron raíces verbales y agenda; combinaciones separan la hora del medicamento y la pregunta. | Corpus determinista: **50/50 = 100 %** de reconocimiento en las frases incluidas. No equivale a comprensión abierta; consultas solo responden de registros reales. Pruebas focales: 31 aprobadas; última suite completa **43 suites / 722 pruebas**; regresión semanal añadida y pasa (total actual estimado 723); typecheck/lint; 32 rutas con flecha atrás. |

El aviso “no tomó el medicamento” usa la alarma escalonada y la alerta de toma sin confirmar existentes; no se presenta un aviso preventivo a la hora exacta como si supiera si tomó. El administrador verá el cambio de Salud/feed en el mismo almacén local. Entre dos celulares se necesita backend; queda pendiente. No se arrancó servidor ni se hizo recorrido web/celular. La hora ambigua “a las 6” sigue la regla actual del intérprete, que la normaliza a 18:00 en el ejemplo probado. Sin registros semanales, BUDDY devuelve “Aún no hay respuestas…”, sin inventar datos.
# Hito 5 — Permisos del adulto mayor (2026-10-23)

**Reproducción antes:** `src/features/elder/screen.tsx` montaba `ElderLocation` en el contenido principal. Con `locationConsent === 'requested'` mostraba la solicitud y Aceptar/No ahora; con `granted` mostraba `InlineBanner` con “Dejar de compartir”. `src/__tests__/v24/location.test.tsx` recorría ese flujo desde Inicio. `ElderOptionsSheet` no tenía entrada Permisos. `applyPlan()` leía el permiso para programar, pero no existía pantalla para consultarlo o activarlo.

**Causa raíz:** controles de consentimiento insertados en Inicio en lugar de una ruta de gestión; el permiso de notificaciones se consultaba internamente, sin acción accesible para la persona.

**Después/evidencia:** `ElderLocation` se movió a `/elder/permissions`; Inicio solo muestra “Compartiendo ubicación” si hay consentimiento y “Activar avisos” cuando el plan no confirma permiso concedido. Opciones incluye Permisos. Primera entrada de una cuenta adulta muestra explicación, botón grande para solicitar permiso y “Ahora no”. La ruta consulta Expo Notifications, solicita cuando aún se puede, ofrece `Linking.openSettings()` cuando está denegado y vuelve a consultar al regresar a primer plano. Revocar ubicación exige confirmación. La prueba actualizada verifica que no aparecen la solicitud ni el botón de revocación en Inicio y mantiene aceptación/revocación con purga de coordenadas en Permisos: 5/5 pruebas pasan. Typecheck pasó.

**Límite:** `permissions.events.<elderId>` y heartbeat se guardan localmente; `verify()` hace que el feed local del administrador muestre “No puedo verificar” al denegarse. Sin backend no se entrega evento entre teléfonos. El SO tampoco puede notificar localmente después de revocar notificaciones. Falta prueba manual en iPhone/Android, VoiceOver/TalkBack, fontScale 1.0/1.3/2.0 y anchos 360/375/390. No se comprobó emulador en esta ejecución.

## Hito 6 — Historiales visuales y Salud (2026-10-23)

**Reproducción antes:** `TodayPanel` tenía agua como número grande y relleno ondulado, sin un elemento por hora ni estado de registro. En `health.tsx`, ánimo y sueño se renderizaban en media columna con letra normal, mientras `MetricBody` devolvía solo el mensaje vacío y quitaba las barras si no había respuestas. Las tarjetas tenían altura mínima 160 dp.

**Causa raíz:** la presentación agrupaba agua por conteo total y quitaba la estructura visual al faltar registros; las métricas de ánimo/sueño compartían una fila con dos columnas según escala.

**Después/evidencia:** el resumen ahora presenta “Vasos de agua hoy”, total de registros, estado por hora y fondo de agua animado con `WaterFill` (transformaciones en Reanimated, respetan reducir movimiento y alto contraste). Una toma solo se asocia al horario más cercano si su marca de tiempo cae a ±90 minutos; las restantes no se inventan. Los historiales de medicamento, comida y actividad usan iconos de estado junto al tipo. Ánimo y Sueño son siempre ancho completo, tarjetas compactas; las barras animadas quedan visibles aun vacías con estado “Sin datos”. Pruebas nuevas cubren asociación de vasos y estados real/pasado/futuro, y render de Salud sin respuestas. Resultado focal actual: 18 pruebas pasan.

**Pendiente de dispositivo:** no se comprobó en iPhone ni emulador. Revisar los tres tamaños de texto de la app, fontScale 1.0/1.3/2.0, anchos 360/375/390, alto contraste y VoiceOver/TalkBack. La etiqueta de cada vaso y la acción “Ver horario de agua” sí se expusieron como elementos separados a pruebas de accesibilidad de componentes.
