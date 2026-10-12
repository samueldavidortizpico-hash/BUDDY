# BUDDY — Decisiones

Registro de decisiones tomadas durante la Fase 1 (interfaz completa con datos ficticios locales).
Fuentes, en orden: `docs/CONTEXTO_BUDDY.md` (no estaba en el repositorio ni en el remoto durante este trabajo; se usaron las reglas del prompt y la Skill `buddy-medical-safety`), prototipo de Figma Make (`docs/figma-referencia/`, descargado con el conector de Figma) y el prompt de la fase.

## Producto y seguridad

| # | Decisión | Motivo |
|---|---|---|
| 1 | Seguridad de medicamentos muestra "Revisión farmacológica: próximamente", cómo funcionará (fuentes verificadas, revisión profesional, sin conclusiones automáticas) y el aviso orientativo. Se eliminaron las tarjetas ATENCIÓN / INDICACIÓN / TODO BIEN del Figma. | No se afirma ninguna interacción, contraindicación ni indicación, ni siquiera ficticia. |
| 2 | Salud: registros MANUALES con la leyenda "Registrado manualmente · sin dispositivos conectados". Sin "índice general 92": el resumen cuenta cuántos registros hay hoy. Tendencias: "Más alto / más bajo / igual que el anterior". | No hay dispositivos ni umbrales clínicos validados por un profesional. |
| 3 | Rangos de validación de registros de salud (p. ej. glucosa 20–600) | Solo detectan errores de escritura; no valoran la salud. |
| 4 | Estados de toma: pendiente, tomada, pospuesta, omitida (el usuario dijo "No lo tomé") y sin confirmar (60 min sin respuesta, calculado). | "Sin confirmar" nunca se llama omitida ni emergencia. |
| 5 | "Ya lo tomé" se guarda como `confirmedByUser` + `respondedAt`; la UI aclara que BUDDY no puede comprobarlo. | Confirmación declarada, no ingestión comprobada. |
| 6 | Concentración (valor + unidad) y dosis (cantidad + presentación) son campos separados. | El Figma los juntaba en un texto. |
| 7 | Alertas del cuidador = seguimiento (Pendiente / Importante / Atendida / Resuelto), con aviso "no son emergencias". | Separar seguimiento de alertas clínicas. |
| 8 | Chat: respuestas locales por reglas; ante "presión" muestra el último registro manual y dice que no puede interpretarlo; nunca da dosis; ante palabras de urgencia deriva al 123. | Sin IA real en esta fase. |
| 9 | Emergencia: hoja con contactos ficticios y la línea 123 marcada "Demostración: no se realizan llamadas". Llamar solo muestra un aviso. | No marcar números reales. |
| 10 | Mapa: dibujo con Views y etiqueta "Vista de ejemplo"; dirección "Calle 00 # 00-00, Barrio Ejemplo (dirección ficticia)". Pantalla de permisos y revocación con confirmación. | Sin GPS ni mapa real. |
| 11 | Sin "pasos" en el panel del cuidador (el Figma mostraba 1.250 pasos). Se usan tomas, sueño, ánimo y vasos de agua registrados. | No hay sensores: sería un dato de dispositivo inventado. |
| 12 | Reportes: el círculo muestra el % de tomas confirmadas, no un puntaje "89/100". | No inventar índices de salud. |
| 13 | Chequeo diario del primer prompt = Ánimo + Síntomas del Figma (no se creó un modal adicional). | El segundo prompt y el Figma mandan en la estructura. |
| 14 | La app tiene autenticación local por dispositivo por defecto y un proveedor Supabase opcional mediante variables de entorno. El proveedor remoto está implementado en código, pero no validado contra un proyecto real. | No confundir credenciales locales ni sincronización no probada con cuentas multi-dispositivo listas para producción. |

## Diseño

| # | Decisión | Motivo |
|---|---|---|
| 15 | Tipografía Manrope 400–800 (`@expo-google-fonts/manrope`); se retiró Inter. | Es la del Figma. |
| 16 | Escala con mínimos: Display 32, H1 28, H2 22, H3 20, texto 18, secundario 16, auxiliar 14, metadatos 12. Tarjetas más altas que en el Figma con la misma estructura. | El Figma usa 7–12 px. |
| 17 | Tamaño de texto propio (Normal ×1, Grande ×1,15, Muy grande ×1,3) multiplicado sobre la escala del sistema (`allowFontScaling`, tope ×2 por texto). | Requisito de accesibilidad. |
| 18 | Colores de texto oscurecidos para AA (ver ACCESSIBILITY_AUDIT.md): slate → `#56657A`, menta texto → `#127A62`, coral texto → `#B9433D`, lavanda → `#5B4BD0`, cielo → `#1F6FAE`, amarillo → `#86620C`, rojo → `#C2413F`. | Los originales daban 2,4–4,4:1. |
| 19 | CTA coral: degradado `#C24E3B → #B84A3A` con texto blanco (4,7–5,2:1). | `#F28C7A → #FF776B` daba 2,4–2,6:1. |
| 20 | IconButton menta con fondo `#178C6F` (icono blanco 4,2:1). | `#21AD8B` daba 2,8:1 (<3:1 para iconos). |
| 21 | Iconos siempre con etiqueta visible (Atrás, Agregar, Menú, Cerrar, Opciones, Historial). Única excepción: Enviar del chat, junto al campo de texto rotulado y con nombre accesible. | Adultos mayores. |
| 22 | Pestañas del paciente: Inicio, Medicamentos, Chat, Bienestar; Perfil desde el avatar y desde el menú. Cuidador: Resumen, Seguimiento, Alertas, Cuenta. | Decisión del prompt. |
| 23 | Ánimo: Excelente, Bien, Regular, Cansado, Triste, Mal con los colores del Figma (amarillo, menta, cielo, lavanda, coral, rojo). | Decisión del prompt. |
| 24 | Selector de hora con botones (−1 h, −15 min, +15 min, +1 h) y de fecha (día anterior / siguiente) en lugar de `@react-native-community/datetimepicker`. | Botones grandes y fáciles; funciona en web; sin dependencia nueva. |
| 25 | Logo: el PNG del Figma dice "BUDY" (una D). Solo se usa el recorte del robot (centrado, 130 px de la imagen) y el nombre BUDDY se escribe como texto. | Nombre siempre BUDDY. |
| 26 | Iconos de app y splash PROVISIONALES generados del recorte del robot (`jimp-compact`) sobre `#F8FAF8`. | No hay arte final; se reemplazan los de Expo. |
| 27 | Foto de Carmen solo como avatar de la usuaria ficticia (con iniciales de respaldo); nunca en la portada. | Prompt. |
| 28 | Galería de componentes en `/dev/gallery`, accesible desde Perfil solo con `__DEV__`. | Revisión de componentes. |

## Técnica

| # | Decisión | Motivo |
|---|---|---|
| 29 | Rutas en `src/app` (no `app/`), con nombres en inglés para evitar choques: `/home`, `/medications`, `/summary`, `/tracking`… | Estructura real del repo; dos `index` en grupos distintos chocarían en `/`. |
| 30 | `Tabs` desde `expo-router/js-tabs` con barra propia; Stack con modales (`modal`, `fullScreenModal`, `transparentModal`). | `Tabs` de `expo-router` está deprecado en SDK 57. |
| 31 | Capas: pantalla → hook → caso de uso → contrato de repositorio → implementación local sobre Zustand persistido en AsyncStorage (`buddy-store-v1`). Solo `repositories/in-memory.ts` conoce el store. | Separación UI / lógica; Supabase podrá sustituir la implementación. |
| 32 | Datos ficticios en `src/features/*/demo-data.ts` con `demo: true`, generados relativos a la fecha de instalación. "Restablecer datos de ejemplo" en Privacidad. | La demo siempre tiene historial. |
| 33 | Horarios en hora local del dispositivo (`YYYY-MM-DD` + `HH:mm`). | Política simple para Fase 1; UTC en BD en Fase 2. |
| 34 | `web.output: "single"` | La web es solo apoyo de revisión; evita el render estático en Node con AsyncStorage. |
| 35 | Animaciones con Reanimated 4 usando `sv.set()` | Compatibles con React Compiler (regla `react-hooks/immutability`). |
| 36 | Recursos con rutas relativas (`../../assets/...`) | El alias `@/assets` no resuelve en Jest. |
| 37 | Identificadores `co.buddy.app` (Android e iOS) | Provisionales: confirmar antes de publicar. |
| 38 | `eslint.config.js` no se modificó (lo protege un hook) | `expo lint` igual termina sin errores. |

## Ronda v2.2 (11-10-2026)

Este prompt prevalece sobre los anteriores donde se contradicen.

| # | Decisión | Motivo |
|---|---|---|
| 39 | Se elimina `RobotStage` (robot único en capa global, `src/components/robot/stage.tsx`). Cada pantalla de cuenta dibuja `AuthRobot` dentro de su contenido. | Causa raíz del problema 9: el ancla se medía una vez con `measureInWindow`; al desplazarse o abrir el teclado el robot quedaba fijo encima de textos y campos. |
| 40 | `AuthRobot` se achica y desvanece con el scroll usando solo `transform: scale` y `opacity` (escala 1 → 72/alto). Con teclado reserva 96 dp con transición de layout corta. | Regla de `fixing-motion-performance`: animar solo propiedades de composición; el único cambio de layout es puntual (teclado), no continuo. |
| 41 | El vuelo de la bienvenida mide robot y botón **en el momento del toque** y se reinicia con `useFocusEffect`. | No depender de coordenadas medidas una sola vez. |
| 42 | Gestos del robot con `Pressable` + eventos táctiles (`onTouchMove`) en vez de Gesture Handler. | Conserva el botón accesible (lector de pantalla y pruebas con `getByRole`) y funciona igual en web y nativo. |
| 43 | Ojos "normales" (abiertos con brillo) pasan a ser el estado `idle`; los arcos felices quedan para `happy`, `wave` y `celebrate`. | Pedido del dueño (6.2): normal con brillo, feliz en arcos, corazones, dormido con Zz, sorprendido, preocupado y guiño. |
| 44 | Las reproducciones de los 15 problemas se escriben como `it.failing` antes de corregir; al corregir pasan a `it`. | Método de la ronda: la suite queda verde y cada prueba demuestra el antes y el después. |
| 45 | `baseline-ui` exige Tailwind y `motion/react` (web). En React Native se aplican sus principios equivalentes (solo transform/opacity, ≤ 200 ms en respuestas al toque, reducir movimiento, estados vacíos con una acción) sin cambiar de librería. | La skill es para web; migrar librerías está prohibido por `fixing-motion-performance`. |
| 46 | `AuthUser` gana `role`, `ownerId`, `elderId`. Sin rol = administrador (compatibilidad con cuentas anteriores). `currentUserId()` devuelve la cuenta dueña de los datos; `currentAuthorId()` el autor real. | El adulto mayor escribe en los datos de su administrador sin duplicarlos y queda constancia de quién respondió. |
| 47 | "Entrar como administrador" desde la sesión propia del adulto mayor cierra su sesión y abre el inicio de sesión del administrador. | La contraseña del administrador nunca se guarda en el teléfono del adulto mayor; el PIN solo protege el acceso a esa opción. |
| 48 | La decisión sobre la ubicación (`location_consent`, `share_location`) es exclusiva del adulto mayor en la matriz `can`. | Consentimiento propio y revocable (Ley 1581); el administrador solo puede solicitar. |
| 49 | La 2.ª diapositiva conserva el título pedido ("Recordatorios que sí llegan") pero aclara "en su celular, BUDDY programa los avisos a la hora". | No prometer avisos remotos entre celulares que aún no existen (Fase 3). |
| 50 | El borrador del chat vive en `drafts[dueño]['assistant.draft.<elderId>']` (persistido) y solo pregunta lo obligatorio; los opcionales se completan desde "Editar". | Pedido del dueño: BUDDY deja de preguntar en cuanto tiene lo necesario; preguntar opcionales uno por uno era la causa de que la confirmación quedara enterrada. |
| 51 | "Deshacer" funciona inmediatamente después de confirmar (en memoria). | Deshacer más tarde se hace desde Rutina (editar o eliminar), que sí es persistente. |
| 52 | Los mensajes para el adulto mayor son recordatorios de un solo día (`Reminder.date`) con el texto "Mensaje de [nombre]: …". | Reutiliza la pantalla "Ahora" sin un tipo nuevo de dato; no se repiten otros días. |
| 53 | "Nuevo" dura 8 s y no se persiste. | Es una señal visual inmediata, no un dato. |
| 54 | ChangeLog dentro del mismo store persistido (`changelog`), sin datos de salud (solo ids); se conservan todas las entradas pendientes y las últimas 500 sincronizadas. | Es la cola que el SyncEngine enviará; no debe crecer sin límite ni filtrar datos sensibles. |
| 55 | "Probar como" usa la misma entrega (`handoff`) con `mode: 'test'`; las respuestas en modo prueba SÍ quedan registradas y la pantalla lo avisa. | Es la pantalla real (no una simulación); el dueño pidió ver exactamente lo que verá el adulto mayor. |
| 56 | "Ver pantalla de [nombre]" abre una hoja inferior con el `ElderScreen` real en solo lectura. | Pedido 4: ver lo que BUDDY acaba de agregar sin salir de Rutina o del chat. |
| 57 | Las tarjetas dicen "no ha confirmado" en vez de "no ha tomado". | Una toma sin respuesta no prueba que no se tomó (`buddy-medical-safety`). |
| 58 | Racha de ánimo/sueño: cuenta respuestas "Mal" hacia atrás; una respuesta distinta la corta; días sin respuesta no cuentan; 3 sin respuesta la terminan; debe incluir hoy o ayer. "Regular" no cuenta. | Evita alarmas por datos viejos o por un "regular" habitual; umbrales editables. |
| 59 | El lanzador vive en el layout de pestañas (todas salvo el chat); en pantallas de detalle no aparece. | Las pantallas de detalle tienen su propia acción principal y flecha atrás. |
| 60 | "Llamar" en las tarjetas llama al celular del adulto mayor (campo opcional nuevo en "Quién es"); si no está, indica dónde agregarlo. | Antes no existía ese dato y llamar al contacto de emergencia sería confuso. |

## Ronda V2.4 (2026-10-12)

| # | Decisión | Motivo |
|---|---|---|
| 61 | La pregunta, las respuestas rápidas y la confirmación viven en la **tarjeta fija** sobre el compositor; ya no se publican como mensajes. Responder (con botón o escribiendo) no agrega burbujas. Sustituye a la decisión 50 en lo de "preguntar en el historial". | Causa raíz de los problemas 1 y 2: los chips vivían en el pie de la lista, se desplazaban con ella y el teclado los tapaba; cada respuesta sumaba dos burbujas (el "muro"). |
| 62 | Mientras falta un dato obligatorio la tarjeta no muestra "Confirmar y agregar"; al completarse muestra el resumen editable y el botón activo junto a "Cancelar". | Una sola acción visible por paso; la confirmación nunca queda enterrada. |
| 63 | Los opcionales se agregan desde "Agregar detalle" (un toque) y se pueden omitir; "Atrás" vuelve al obligatorio anterior. | Pedido 1.3 sin volver a preguntar opcionales uno por uno (decisión 50). |
| 64 | Teclado: `KeyboardAvoidingView` con `padding` en iOS y `height` en Android (igual que `ScreenContainer`), `keyboardShouldPersistTaps="handled"`, cierre al arrastrar, y la barra de pestañas se oculta con el teclado abierto en Android. **No** se usa `react-native-keyboard-controller`. | La guía oficial de Expo dice: "The Keyboard Controller library is not included in Expo Go" (https://docs.expo.dev/guides/keyboard-handling/). Pendiente de comprobar en dispositivo (`docs/PRUEBAS_EN_DISPOSITIVO.md`). |
| 65 | Fechas en español con un único analizador (`parseDate`): "el jueves" y "el próximo martes" = siguiente ocurrencia, nunca hoy. Una fecha sin año que ya pasó es del año siguiente. | Se unifican los dos analizadores que había (motor y borrador). "El próximo X" es ambiguo en el habla; se elige la interpretación más común y el cuidador la ve y la corrige en la tarjeta antes de confirmar. |
| 66 | Tolerancia a errores de ortografía: solo palabras de 5+ letras y como máximo 1 error (2 con 8+ letras), contra verbos conocidos y los medicamentos ya registrados. | Más tolerancia confundiría palabras distintas ("dile"/"dale", "cena"/"crea"). |
| 67 | Una cita detectada se resuelve antes que contactos y agua (puede traer el teléfono del consultorio). Especialidad normalizada (25 especialidades); el título es "Cita de cardiología". | Antes "telefono 601…" convertía la cita en un contacto de emergencia. |
| 68 | El corpus (138 frases) se usó para corregir el motor, así que su acierto sobreestima la comprensión real. Se agrega un **conjunto reservado** de 24 frases escritas después de corregir, que se mide una vez y no se usa para ajustar. | Medición honesta (pedido del dueño: no manipular el corpus para llegar a la meta). |
| 69 | "¿Para qué sirve X?" responde solo con lo que registró el cuidador o "No encontré información verificada" hasta el Hito 2 (MedicationKnowledgeService). | BUDDY nunca completa información de salud de memoria. |
| 70 | Con texto ≥ ×1.3 el menú de acciones pasa a una columna; las etiquetas de la barra de pestañas no crecen más de ×1.1 (visor de contenido grande en iOS); el compositor no crece más de ×1.5. | Detectado con `scripts/check-overflow.mjs` y capturas al 200 %. |
| 71 | Un nombre de medicamento mal escrito **no se corrige solo** (ni contra los medicamentos registrados ni contra el registro del INVIMA): se conserva lo escrito y la tarjeta ofrece "¿Quisiste decir…?". Solo se normalizan tildes y mayúsculas. Cambia lo hecho en el Hito 1 (3 frases del corpus actualizadas, con la expectativa original anotada). | `buddy-medical-safety`: "si no hay coincidencia exacta → advertir, no autocorregir al más parecido"; el nombre es un dato crítico. |
| 72 | Índice del INVIMA empaquetado en la app (`src/data/cum-index.json`, 1,4 MB, CC BY-SA 4.0) y cargado de forma diferida; se regenera cada mes con `scripts/build-cum-index.mjs`. | Funciona sin conexión y no envía nada para reconocer el medicamento; licencia que permite redistribuir con atribución. |
| 73 | Paso obligatorio "Presentación" cuando el registro tiene coincidencias: el cuidador elige la de su caja o "No está en la lista". Al elegir se copian nombre, principio activo, concentración, forma, ATC y la fuente (`verifiedSource`); la dosis nunca. | Pedido 2.3 y segundo prompt: "presenta posibles productos y concentraciones; solicita elegir la presentación correcta". |
| 74 | "Para qué se usa" sale de MedlinePlus en español por la ruta ATC → RxCUI; la coincidencia aproximada solo se acepta si el título corresponde al mismo principio activo. "Qué debe saber" es un enlace a la fuente (Connect solo devuelve el resumen de usos). | Rutas probadas con llamadas reales el 2026-10-12; nunca se completa con memoria de un modelo. |
| 75 | Reglas de nivel 2 (clases ATC y misma clase) detrás de `FEATURES.level2Review`: activas en desarrollo, apagadas en producción salvo `EXPO_PUBLIC_LEVEL2_REVIEW=on`. | Sin revisión de un profesional de salud todavía. |
| 76 | `fetch` falla por defecto en las pruebas; cada prueba simula respuestas con la forma real de las APIs. | `buddy-testing`: sin red real en pruebas unitarias. |
| 77 | Cada toma guarda `stockApplied` (unidades descontadas): confirmar es idempotente y corregir una confirmación devuelve las unidades con un asiento "Toma corregida" en el registro de existencias. | Pedido del segundo prompt (idempotencia, compensación auditable). Antes, confirmar dos veces descontaba dos veces y corregir no devolvía nada. |
| 78 | Avisos de existencias: uno por medicamento y nivel en cada ciclo (`stockAlerted`), aunque se marque atendido sin comprar; el ciclo se reinicia cuando las existencias vuelven a nivel normal; a 0 se suma "agotado". Al agregar un medicamento con pocas unidades se avisa de una vez. Umbral por defecto: 3 días. | Antes cada toma repetía el aviso si el cuidador lo atendía sin comprar, y un medicamento nuevo con pocas unidades no avisaba hasta la primera toma. |
| 79 | Evaluador de alimentos con la Tabla 17 de la norma vigente (Res. 810/2021 mod. 2492/2022, corr. 254/2023) como datos versionados con fuente y fecha. El proyecto de abril de 2026 que la derogaría se menciona como "en consulta, no vigente". Sin energía o sin tamaño de porción no da por bueno ningún nutriente; un plato casero no tiene veredicto. No se guarda historial de análisis todavía. | Pedido 2.5 y segundo prompt ("no emitir un veredicto sin todos los campos exigidos"). Guardar historial queda para cuando exista una función que lo use (minimización). |
| 80 | El robot lanzador se arrastra con Gesture Handler + Reanimated (`.get()/.set()` en el hilo de UI); React solo se entera al cambiar la dirección de la mirada y al soltar. Límites con la huella real del robot (96 dp con su brillo), imán al borde más cercano (desactivable), posición por tamaño de pantalla en `buddy.launcher` (AsyncStorage, no son datos de salud). | Pedido 4 y segundo prompt ("no actualizar estados de React en cada frame"). |
| 81 | Un arrastre nunca abre el chat: una bandera compartida ignora el toque que llega al soltar. | Encontrado en la verificación web: al soltar se disparaba el toque y se abría el chat ("arrastrar sin activar navegación accidental"). |
| 82 | Burbujas: se quedan hasta tocarlas o descartarlas; solo la primera va completa con acción ("Registrar compra", "Llamar"…); las otras dos, compactas de una línea; "+N" para el resto; se colocan respecto al robot (no lo desplazan) hacia el lado y la altura con espacio. Descartar recuerda la versión de la novedad: si cambia, vuelve a aparecer. | La primera versión con 3 burbujas completas tapaba casi toda la pantalla (segundo prompt: "no utilizar burbujas intrusivas"). |
| 83 | El detector de desbordes acepta el recorte con "…" solo dentro de las burbujas compactas del robot. | Cualquier otro recorte (p. ej. etiquetas de la barra) sigue siendo un fallo. |
