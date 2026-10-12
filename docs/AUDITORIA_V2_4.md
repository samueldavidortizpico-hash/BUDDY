# Auditoría ronda V2.4: antes y después

Método: cada problema se reproduce con una prueba que falla (jest) o una captura (Playwright) **antes** de corregirlo, se documenta la causa raíz y se demuestra la corrección. Datos de las capturas: sintéticos, generados por `scripts/capture/seed.js`.

## Hito 0: estado de partida (2026-10-12)

- `main` sincronizado con `origin`. El trabajo pendiente de V2.2 (citas con dirección, notificaciones locales, desbordes al 200 %) se cerró en `75b55c1` antes de empezar.
- Base: tsc 0 errores, lint 0, jest 549/549, reversa OK (25 rutas), desbordes OK (9 pantallas × 2 tamaños × texto normal y 200 % × 3 temas).
- Al probar el planificador de notificaciones (sin pruebas hasta entonces) aparecieron dos fallos reales, corregidos en `75b55c1`: avisos diarios que seguían después del fin del tratamiento (o antes de su inicio), y el texto "Ya le avisé a tu familiar" sin que exista entrega remota.
- Versiones verificadas en `package.json`: Expo ~57.0.27, React Native 0.86.3, React 19.2.3, Reanimated 4.5.1, Gesture Handler ~2.32.0.

## Tabla de problemas

| # | Problema | Reproducción (antes) | Causa raíz | Corrección | Evidencia (después) | Estado |
|---|---|---|---|---|---|---|
| 1 | Agregar un medicamento con BUDDY es difícil; el teclado estorba | `src/__tests__/v24/chat-guided.test.tsx`: 7/7 fallan (`docs/auditoria/v2_4/chat-guiado-antes.txt`) | Las respuestas rápidas estaban en el `ListFooterComponent` de la lista: se desplazaban con los mensajes y el teclado las tapaba. `KeyboardAvoidingView` sin `behavior` en Android, sin cierre al arrastrar. | Pregunta, respuestas, Atrás, Omitir y confirmación dentro de la tarjeta fija; altura máxima del 55 % con el cuerpo desplazable; teclado según la decisión 64. | 7/7 pasan; capturas `docs/capturas/v24/chat/2-…` a `6-…` en 390/360, claro, oscuro, alto contraste y texto al 200 % | **Corregido en web**; teclado pendiente de dispositivo |
| 2 | El chat es un muro de texto; faltan respuestas predeterminadas | Misma prueba (cuenta de burbujas por respuesta) | Cada respuesta agregaba dos burbujas (usuario + pregunta de BUDDY) y hacía falta escribir nombre, hora y fecha. | Respuestas sin burbujas; píldoras tocables, contador +/−, hora en rueda y fecha en hoja inferior; menú de 8 acciones; mensajes anteriores plegados; tarea terminada en una sola línea con Ver y Deshacer. | Prueba "agrega un medicamento solo con respuestas predeterminadas" (sin burbujas nuevas); captura `1-menu-360-claro.png` | **Corregido** |
| 3 | BUDDY no entiende lo que se le escribe (p. ej. citas) | Corpus `tests/assistant.corpus.ts`: **60,9 % (84/138)**, 30 de 32 citas fallan (`docs/auditoria/v2_4/corpus-antes.txt`) | El motor no extraía especialidad, médico, institución, teléfono ni preguntas; no entendía "el jueves", "en dos semanas" ni "hoy"; un teléfono convertía la cita en contacto; sin tolerancia a errores ni respuesta a "¿qué puedes hacer?". | `src/domain/assistant/appointment.ts` (extractor de citas), `parseDate` único, distancia de edición, ayuda y consulta de medicamento. | Corpus **100 % (138/138)**; conjunto reservado **95,8 % (23/24)** (`docs/auditoria/v2_4/corpus-despues.txt`) | **Corregido** (ver límites abajo) |
| 4 | "agrega dolex" no sabe qué es | Inspección del código (no hubo prueba fallida previa): `state/assistant.ts` guardaba `activeIngredient: ''` y no existía ninguna fuente de medicamentos; "agrega dolex" creaba "Dolex" sin principio activo ni concentración | No existía ninguna fuente de medicamentos; el chat guardaba `activeIngredient: ''`. | Índice sin conexión del INVIMA, paso "Presentación", tarjeta con la fuente del registro y "Para qué se usa" de MedlinePlus en español (decisiones 71–74). | 5/5 pruebas; capturas `docs/capturas/v24/dolex/` con la consulta **real** a NLM: "El acetaminofén se usa para el alivio del dolor de leve a moderado y para disminuir la fiebre." | **Corregido** |
| 5 | La app parece solo un recordatorio; debe analizar medicamentos y alimentos | Revisión con `activeIngredient` vacío: la regla de duplicados nunca se activaba para lo agregado por el chat | Sin datos del principio activo ni de la clase, la revisión solo comparaba el nombre escrito. | Revisión por perfil con principio activo y clase ATC del registro: alergia por clase (penicilina ↔ J01C), sinónimos, duplicados en combinaciones, misma clase; fuente en cada hallazgo; nivel 3 como contrato "Pronto". | `review-v24.test.ts` 7/7 | **Corregido** (alimentos en el Hito 3) |
| 6 | El stock no baja con las tomas ni avisa a 3 días | `src/__tests__/v24/stock.test.tsx`: **5 de 7 fallan** (`docs/auditoria/v2_4/existencias-antes.txt`) | (1) `confirm()` descontaba en cada confirmación (no idempotente); (2) `reset()` no devolvía las unidades; (3) un aviso atendido sin comprar se repetía en cada toma; (4) agregar un medicamento con pocas unidades no avisaba; (5) el chat creaba avisos a 7 días. | Decisiones 77 y 78. El resto ya funcionaba: descuento exacto con fracciones y ml, omitir o posponer no descuenta, la compra suma y reinicia el ciclo, tarjeta del adulto mayor con texto honesto. | 7/7 (`existencias-despues.txt`); las pantallas leen el mismo store y se actualizan al instante | **Corregido** (burbuja del robot: Hito 4) |
| 7 | Los mensajes flotantes de BUDDY no se notan | Inspección de `features/feed/launcher.tsx`: una sola burbuja pequeña, sin acción, con borde fino, que desaparecía a los 6 s | Diseño de la burbuja como aviso pasajero | Burbujas por severidad (menta, ámbar, coral; rojo solo "pidió ayuda") con icono y texto, rebote y meneo al entrar (sin ellos con reducir movimiento), persistentes, hasta 3 con "+N", deslizar o "×" para descartar, acción en la primera, haptic suave (decisión 82) | `launcher.test.tsx` 6/6; `docs/capturas/v24/robot/1-burbujas-390.png` | **Corregido en web**; haptic y deslizar: dispositivo |
| 8 | El robot no se puede mover | Inspección: posición fija abajo a la derecha | No existía gesto de arrastre | Arrastre con Gesture Handler, límites, imán, posición recordada, oculto con teclado, Ajustes > Apariencia > Robot BUDDY (imán, restablecer, ocultar por hoy) (decisiones 80 y 81) | `scripts/capture/v24-robot.mjs` en web: arrastre, imán al borde (x = 7,75), misma posición tras recargar | **Corregido en web**; dispositivo pendiente |
| 9 | Falta Ubicación con mapa | `src/__tests__/v22/repro.test.tsx` P6 ("el Resumen da acceso a la ubicación") estaba marcado `it.failing` | La función se había retirado en v2.1 y nunca se reconstruyó | Pantalla "Dónde está [nombre]" con mapa real, hora, precisión, aviso de desactualizada, historial y atribución; consentimiento del adulto mayor; tarjeta en el Resumen; "¿dónde está?" en el chat (decisiones 89 y 90) | P6 pasa; `location.test.tsx` 5/5; `scripts/capture/v24-location.mjs` en web: solicitar → aceptar en "Probar como" → mapa de OpenStreetMap con marcador (coordenadas ficticias de Playwright) | **Corregido en web**; mapa nativo y permiso: dispositivo |
| 10 | Barra inferior Liquid Glass y gestos | Inspección: barra con color translúcido sin desenfoque, sobre un fondo liso (no flotaba sobre el contenido), sin gesto | La barra se dibujaba debajo de las pantallas y el comentario decía "vidrio sin blur" | Barra flotante con vidrio nativo (iOS 26+), desenfoque (iOS anterior y web) o translúcida (Android); gota que se estira; deslizar sobre la barra para cambiar de pestaña con haptic (decisiones 84–87) | `scripts/capture/v24-tabbar.mjs`: barra sobre el contenido, arrastre de Resumen a Salud, toque a Rutina, en claro y oscuro (`docs/capturas/v24/barra/`) | **Corregido en web**; Liquid Glass nativo: pendiente de iPhone con iOS 26 |
| 11 | Portada de carga propia | Inspección de `src/app/_layout.tsx`: devolvía `null` hasta tener todo listo (solo el splash nativo, sin experiencia propia) | No existía portada | Portada con BUDDY dormido que respira, "Zz", halo, orbes, BUDDY y "Siempre contigo", barra de progreso real con el mensaje de la tarea, despertar y revelado; aviso si tarda y reintento si falla (decisiones 91 y 92) | `boot-screen.test.tsx` y `stages.test.ts` 6/6; capturas `docs/capturas/v24/portada/` (≈1,1 s en web) | **Corregido en web**; splash nativo de marca: falta un PNG transparente |

## Hito 1: chat guiado, teclado y comprensión

**Skills aplicadas:** `buddy-testing` (corpus y pruebas de integración del flujo), `fixing-accessibility` (rol de botón y área táctil de 48 en respuestas, regiones `accessibilityLiveRegion` para la pregunta y el contador, texto al 200 %), `baseline-ui` (crítica de las capturas: 3 rondas). `taste` y `fixing-motion-performance` se aplicaron en su versión para React Native (decisión 45): solo `FadeIn`/`LinearTransition`, sin animaciones con reducir movimiento.

### Corpus de comprensión

- 138 frases (32 citas, 32 medicamentos con errores de ortografía, 10 de agua, 10 de contactos, 10 de metas, 8 de comidas, 13 consultas, 10 ediciones y existencias, 8 mensajes y recordatorios, 5 de urgencias, cámara y frases sin sentido). Las respuestas esperadas se escribieron antes de medir.
- Antes: 60,9 %. Después: 100 %. **Límite:** el motor se corrigió mirando esas frases, así que ese 100 % sobreestima la comprensión real.
- **Conjunto reservado** (24 frases nuevas, medidas una sola vez, sin ajustar el motor): **95,8 % (23/24)**. Falla: "tiene que ir al laboratorio en 3 días a las 6 am" (sin la palabra "cita" o "examen de…" no se reconoce como cita; BUDDY responde con el menú).
- Ante una frase sin sentido ("hola", "asdf qwer", "buenas tardes") BUDDY no inventa una acción: muestra el menú de acciones y tres ejemplos.
- Un acierto alto en un corpus interno no es comprensión general del lenguaje.

### Rondas de crítica visual (baseline-ui)

1. Al 200 %, la tarjeta empujaba el compositor fuera de la pantalla, "BUDDY" se partía en "BUD/DY" e "Ir al final" flotaba sobre el encabezado. Corregido: altura máxima de la tarjeta con el cuerpo desplazable, tope de escala en el encabezado y "Ir al final" solo con altura de lista útil.
2. En 360 px la última fila del menú quedaba bajo el compositor; la línea "agregado" cortaba la revisión de BUDDY; el placeholder se partía letra por letra. Corregido.
3. El detector de desbordes encontró la segunda columna del menú fuera de la pantalla al 200 %. Corregido con una sola columna (decisión 70). Detector en verde.

### Pendiente de dispositivo

Teclado en iOS y Android (que la tarjeta y "Confirmar" queden visibles, sin saltos, cierre al arrastrar), hojas de hora y fecha, y la barra que se oculta con el teclado en Android. Ver `docs/PRUEBAS_EN_DISPOSITIVO.md`.

## Hito 2: base farmacológica

**Skills aplicadas:** `buddy-medical-safety` (fuentes con licencia, sin autocorrección, niveles de alerta, nada personal hacia APIs externas), `buddy-testing` (red simulada, casos positivos, negativos, desconocidos y sin conexión).

- Investigación y licencias: `docs/BASE_FARMACOLOGICA.md` (INVIMA CC BY-SA 4.0; RxNorm y MedlinePlus con su atribución y límites; RxClass descartada; API de interacciones de RxNav retirada; bases licenciadas sin precio publicado).
- **Cobertura con 100 medicamentos frecuentes: 97/100 directos.** Atenolol no está en el conjunto de vigentes; la digoxina tampoco (lo que aparece es betametildigoxina, otro medicamento); donepezilo se ofrece como sugerencia ("Donepecilo").
- Verificación real en web: "agrega dolex" → 8 presentaciones del registro → "Dolex Avanzado · 500 mg" → tarjeta con registro INVIMA 2019M-0009802-R1 (datos al 2026-09-16) y "Para qué se usa" desde MedlinePlus.gov.
- Atribuciones en Ajustes > Acerca de y Legal > Fuentes y atribuciones. La política de privacidad decía "no se envían a ningún servidor"; se corrigió para decir que solo se envían nombres o códigos de medicamentos a NLM.
- `docs/IA_BUDDY.md`: arquitectura futura (Edge Function), datos que nunca se envían, límites por plan y 100 preguntas de evaluación (25 trampas, 10 urgencias).
- Pendiente para el pulido: en 360 px la tarjeta de información queda arriba de la tarjeta fija y hay que desplazar para leerla completa.

## Hito 3: existencias y alimentos

**Skills aplicadas:** `buddy-testing` (reloj simulado, idempotencia, casos límite), `buddy-medical-safety` (textos honestos al adulto mayor, evaluador descriptivo sin consejo personalizado).

- Existencias: ver fila 6. Persistencia: los campos nuevos (`stockApplied`, `stockAlerted`) viven en el mismo store persistido; no se probó un reinicio real de la app (pendiente de dispositivo).
- Alimentos: `src/domain/food.ts` con la Tabla 17 verificada en el texto oficial consolidado (normograma del INVIMA, Res. 254/2023). 9 pruebas del evaluador con casos calculados a mano (límites exactos de 1 mg/kcal y 10 %, bebidas sin energía, por porción, datos faltantes, plato casero, restricciones del perfil) y 2 de la pantalla.
- Pantalla `/food` ("Analizar un alimento"), desde Rutina > Comidas y desde "Comida" en el chat. Lectura de la foto de la tabla: "Pronto" (Fase 6).
- El detector de desbordes encontró una opción que no cabía al 200 % en la pantalla nueva; corregida.

## Hito 4: robot arrastrable y burbujas

**Skills aplicadas:** `fixing-motion-performance` (solo transform y opacidad, gestos en el hilo de UI, React fuera del cuadro a cuadro), `fixing-accessibility` (etiqueta "BUDDY, N novedades", botón "Descartar este aviso" además del deslizamiento, no solo color, reducir movimiento), `baseline-ui` (dos rondas de crítica de capturas).

- La verificación en web (`scripts/capture/v24-robot.mjs`) encontró y corrigió tres fallos: al soltar el robot se abría el chat; con las burbujas a la izquierda el robot quedaba fuera de la pantalla (x = −200); los límites usaban 72 dp en vez de la huella real de 96 dp.
- "Registrar compra" suma una caja si se conoce su tamaño; si no, abre el medicamento (nunca inventa la cantidad). "Posponer" silencia el aviso 24 h.
- Pendiente de dispositivo: suavidad a 60 fps (no medida), haptic, deslizar para descartar con el dedo, ojos que siguen el arrastre.

## Hito 5: barra Liquid Glass y gestos

**Skills aplicadas:** `fixing-motion-performance` (gota con translateX + scaleX, sin desenfoques animados, React solo al soltar), `fixing-accessibility` (reducir transparencia → barra sólida, reducir movimiento → sin estiramiento, gesto desactivable, etiquetas siempre visibles, áreas ≥ 56, visor de contenido grande).

- Dependencia instalada con `npx expo install`: `expo-blur ~57.0.3` (incluida en Expo Go según la doc. de SDK 57).
- La verificación web encontró y corrigió: navegación del gesto sin efecto en web (decisión 85) y el "+" de Rutina sobre la barra al pasarla a flotante (ahora está en el flujo del contenido).
- 60 fps: **no medido** (requiere dispositivo de gama media).
- Pendiente de pulido (Hito 8): el selector de Rutina corta "Medicamentos" y "Comidas" a mitad de palabra en 390 px (defecto anterior a esta ronda).

## Hito 6: ubicación y mapa

**Skills aplicadas:** `buddy-medical-safety` (consentimiento, minimización, borrado real, no mostrar ubicaciones inventadas), `buddy-testing` (permisos simulados, estados), `fixing-accessibility` (estado vacío con ilustración y una acción, aviso como alerta).

- Dependencias instaladas con `npx expo install`: `expo-location ~57.0.21` y `react-native-maps 1.27.2`; plugin de ubicación solo en primer plano (la configuración resuelta pide solo ACCESS_COARSE_LOCATION y ACCESS_FINE_LOCATION).
- Las pruebas encontraron y corrigieron: ubicación duplicada al aceptar y un campo de más (`ok`) guardado con las coordenadas. Las capturas encontraron y corrigieron: el robot de la tarjeta "Ahora" tapaba "No ahora" y el mapa en web quedaba en blanco mientras cargaba.

## Hito 7: portada de carga y splash

**Skills aplicadas:** `fixing-motion-performance` (respiración, Zz, orbes y despertar solo con transform y opacidad; sin desenfoques animados), `fixing-accessibility` (barra como `progressbar` accesible con su valor y mensaje anunciado; reducir movimiento = desvanecido corto).

- La prueba encontró que la barra no se anunciaba como barra de progreso al lector de pantalla (faltaba `accessible`); corregido.
- En Expo Go se ve el splash de Expo; el de BUDDY solo en la build instalable, y necesita un PNG transparente de alta resolución.
