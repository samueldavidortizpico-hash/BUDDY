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
