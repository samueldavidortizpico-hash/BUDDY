# Auditoría de interfaz, movimiento y limpieza de BUDDY

Fecha: 2026-11-10. Checkout: `C:\PROYECTS\BUDDY`. HEAD: `ce5174d`.

## Dictamen y límites

La base visual es reutilizable: temas centralizados, cuatro variantes de apariencia, tipografía compartida, botones con alturas mínimas y componentes de movimiento. Sin embargo, hay problemas de interacción comprobables en el código, controles que prometen efectos inexistentes y deuda de presentación. Priorizar los flujos rotos antes del pulido ornamental.

**Esta es una auditoría estática y automatizada; la auditoría visual total en dispositivos queda pendiente.** No se abrió la aplicación ni se observaron capturas nuevas. No se midieron FPS, consumo de batería, tiempos de respuesta ni layout real de Android/iOS. Las condiciones de reproducción siguientes son instrucciones para verificar, no pruebas manuales ya ejecutadas. Inventario: 214 archivos TS/TSX, incluyendo pruebas, y 43 archivos TSX en rutas, incluyendo layouts; no equivalen a 43 pantallas validadas.

No se corrigió código, se instalaron dependencias, se alteró configuración ni se hizo commit. Los cambios previos (`eas.json`, `.audit-2026-11-03/`, `.idea/`, `docs/AUDITORIA_2026-11-03.md`) se preservaron. El único archivo añadido por esta auditoría es este informe.

## Evidencia ejecutada

| Comprobación | Resultado | Alcance |
|---|---|---|
| `npm.cmd run lint` | PASS | Sin errores reportados |
| `npm.cmd run typecheck` | PASS | Sin errores reportados |
| Jest: contraste, layout-v31, screens-smoke | PASS | 3 suites, 328 pruebas, 0 snapshots |
| Inspección de rutas, componentes, temas y ajustes | Realizada | Revisión estática por muestreo dirigido; no lectura exhaustiva de todo el producto |
| Capturas nuevas, navegación táctil, TalkBack/VoiceOver, teclado real | NOT RUN | Android e iOS pendientes |
| Rendimiento y batería en teléfono | NOT RUN | No hay mediciones |

Las pruebas de layout inspeccionadas verifican propiedades del árbol React; el propio archivo aclara que no ejecuta layout Yoga ni capturas físicas. Pasar estas pruebas no descarta recortes, solapamientos o conflictos de gestos.

## Hallazgos prioritarios

P1 = flujo importante comprometido. P2 = defecto de interacción, accesibilidad o coherencia. P3 = limpieza/mantenibilidad. «Confirmado en código» no significa observado en pantalla.

### UX-01 — P1 — Contraseña para eliminar la cuenta detrás del modal

**Confirmado en código.** `src/app/(caregiver)/settings/[section].tsx:129-142`, `src/components/feedback.tsx:158`.

El mismo estado `del` abre `ConfirmDialog` y monta el campo de contraseña como hermano del diálogo, dentro de la pantalla de fondo. El modal recibe la confirmación, pero no contiene el campo ni el error. El servicio local exige verificar la contraseña (`src/infrastructure/local/auth.ts:233`). El primer intento usa una cadena vacía; el error se muestra detrás del modal. Cancelar también desmonta el campo.

**Qué mirar:** Ajustes → Cuenta → Eliminar cuenta. Comprobar que se pueda escribir la contraseña, corregir un error y confirmar sin salir del diálogo. **Recomendación:** reunir entrada, error y confirmación dentro de una misma superficie modal accesible. No ejecutar una eliminación real para validar el diseño; usar cuenta de prueba o interceptar la operación.

### UX-02 — P2 — Ajustes de un lanzador que no se monta

**Confirmado por búsqueda de referencias en `src`.** `settings/[section].tsx:181-194` expone imán, restablecer posición y ocultar/mostrar. `src/features/feed/launcher.tsx:55` exporta `BuddyLauncher`, pero ninguna ruta lo importa o monta. Las pestañas montan `BottomTabBar`, cuyo acceso central no usa estas preferencias.

**Qué mirar:** cambiar estos controles y volver a Inicio; buscar el efecto visible. **Recomendación:** decidir si el producto conserva el lanzador o solo el botón central; alinear controles, textos, componentes y espacio reservado con esa decisión.

### UX-03 — P2 — Vista previa de Apariencia con botón activo sin acción

**Confirmado en código.** `settings/[section].tsx:162`: `Button` con texto de crear cuenta sin `onPress`, sin `disabled` y sin marca de demostración no interactiva. El componente sigue exponiendo rol de botón y feedback táctil.

**Qué mirar:** pulsar «Crear cuenta» en Apariencia. **Recomendación:** presentar una muestra inequívoca y evitar prometer una acción que no ocurre.

### UX-04 — P2 — Carrusel sin resincronización explícita al cambiar el ancho

**Riesgo derivado del código; reproducción pendiente.** `src/app/(auth)/onboarding.tsx:28-55,83`. Cada página usa el ancho actual, pero no hay efecto que realinee offset e índice cuando cambia `width`. El offset compartido conserva coordenadas del ancho anterior mientras las interpolaciones dividen por el nuevo ancho.

**Qué mirar:** situarse en la diapositiva 3 y rotar o redimensionar. Comprobar página centrada, texto visible, barras, escena activa y acción final. **Recomendación:** una única política para conservar la página seleccionada y ajustar offset al cambiar dimensiones. No afirmar que el sistema nunca recoloca el scroll: eso requiere ejecución nativa.

### UX-05 — P2 — Dos fuentes de verdad para el paso del carrusel

**Confirmado en código; consecuencias gestuales pendientes.** `onboarding.tsx:33,54-55,83`. «Siguiente» cambia `i` antes de terminar el desplazamiento; un swipe lo cambia al finalizar la inercia. Las animaciones y el texto accesible dependen de `i`; el paralaje depende de `x`.

**Qué mirar:** alternar swipe interrumpido, «Siguiente» y pulsaciones rápidas; comprobar que escena activa, progreso y «Empezar» coincidan con la página que realmente está centrada. **Recomendación:** distinguir destino y página asentada o usar un estado canónico de paginación.

### UX-06 — P2 — Reducción de movimiento incompleta en el carrusel

**Confirmado en código.** `onboarding.tsx:55,103-112`; `src/features/onboarding/hero.tsx:160-174`. Las líneas de tiempo internas sí consultan reducción de movimiento. El desplazamiento programático usa siempre `animated: true`; el paralaje de escenas y textos depende directamente de `x` sin alternativa reducida.

**Qué mirar:** activar reducción de movimiento antes de abrir la introducción y avanzar por toque y swipe. **Recomendación:** definir una presentación reducida coherente para todo el carrusel.

No se etiqueta cada `withTiming` o `withSpring` sin condición como bug: Reanimated contempla reducción de movimiento del sistema. La evidencia aquí es el movimiento de scroll/paralaje programado directamente.

### UX-07 — P2 — Errores de formulario no respetan el tamaño de texto elegido

**Confirmado en código.** `src/components/forms.tsx:114-118,499`; `src/components/app-text.tsx:27-40`. `AppText` calcula fuente y lineHeight según la preferencia, pero `s.errorText`, aplicado después, vuelve a fijarlos en 14 y 20. Con tamaño de aplicación máximo, el multiplicador de sistema queda en 1 y el error permanece en 14.

**Qué mirar:** seleccionar texto máximo y provocar un error de formulario. Comparar mensaje, etiqueta y contenido. **Recomendación:** mantener los errores dentro de la misma política de escala que el texto esencial.

### UX-08 — P2 — Pestañas inferiores bloqueadas a texto pequeño

**Confirmado en código; aceptación de diseño pendiente.** `src/components/bottom-tab-bar.tsx:194-214`. Etiquetas con `maxScale={1}`, una sola línea y ajuste que puede reducirlas hasta 0.8. La base es 13: pueden bajar hasta 10.4. La preferencia «texto máximo» no agranda estas etiquetas.

**Qué mirar:** 320/360 dp, texto máximo, las cuatro pestañas y acceso BUDDY. **Recomendación:** validar legibilidad con usuarios y ofrecer una adaptación accesible en lugar de depender de encoger las etiquetas. iOS configura un visor de contenido ampliado; eso no demuestra equivalencia en Android.

### UX-09 — P2 — Estado accesible incorrecto durante éxito de un botón

**Confirmado en código.** `src/components/button.tsx:131-143`, `pressable-scale.tsx:48`. El control se deshabilita para `success`, pero `accessibilityState.disabled` solo incluye `disabled || loading`. El estado recibido sobrescribe el calculado por `PressableScale`, por lo que con solo `success=true` se anuncia un estado distinto de la capacidad real de pulsación.

**Qué mirar:** una confirmación de éxito con lector de pantalla. **Recomendación:** derivar interacción y semántica del mismo estado.

### UX-10 — P2 — Umbrales diferentes con etiquetas iguales o genéricas

**Confirmado en código.** `settings/[section].tsx:292-299`. Los dos primeros umbrales de ánimo repiten `F.severity.attention`. Los tres umbrales de sueño usan «atención», «alarma» y un título genérico de umbrales. El usuario no recibe una explicación uniforme de qué escalón modifica.

**Qué mirar:** Ajustes → Mis avisos → Umbrales, especialmente con lector de pantalla. **Recomendación:** nombrar cada nivel y su consecuencia de forma inequívoca, validándolo con el dominio antes de cambiar reglas.

### UX-11 — P2 — Operaciones asíncronas en Cuenta sin estado de espera

**Confirmado en código; concurrencia real no probada.** `settings/[section].tsx:109-140`, `feedback.tsx:170-175`. Cambiar contraseña y confirmar eliminación no conectan estado de carga con el botón. Se pueden iniciar pulsaciones adicionales mientras se espera. No hay error de eliminación dentro del diálogo (UX-01).

**Qué mirar:** cuenta de prueba con respuesta lenta; confirmar feedback, bloqueo temporal y recuperación de errores. **Recomendación:** estados explícitos de espera, éxito y error, con protección contra envío repetido.

### UX-12 — P2 — Diálogo central sin desplazamiento ni adaptación al teclado

**Riesgo estructural; layout real pendiente.** `feedback.tsx:158-177,268-270`. `ConfirmDialog` presenta título, cuerpo y acciones en un `View`, con padding fijo, sin scroll ni límite de alto. Con texto máximo y poca altura puede superar el espacio disponible. Si se añade el campo de UX-01 sin resolver este contenedor, el teclado puede empeorar el problema.

**Qué mirar:** confirmaciones largas, orientación horizontal, texto máximo y teclado. **Recomendación:** superficie con límites, contenido desplazable y acciones alcanzables.

## Limpieza y duplicación

### CODE-01 — P3 — Brillo animado duplicado

`src/components/button.tsx:202-222` y `src/app/(caregiver)/plus.tsx:286` implementan `Shine`: valor compartido, bucle con espera, timing de 900 ms, reinicio, cancelación y gradiente. Cambian espera y geometría. Es duplicación concreta, no un porcentaje global medido. Recomendar una primitiva parametrizable si ambos efectos se conservan.

### CODE-02 — P3 — API de Button promete contenido que no renderiza

`button.tsx:109` admite `children?: ReactNode`, pero la función no lo extrae ni lo incluye en JSX. TypeScript acepta contenido que desaparecerá. No se confirmó un consumidor actual afectado. Además `ButtonRow` no tiene consumidores en `src` según la búsqueda efectuada. Revisar contratos y exportaciones antes de eliminarlos.

### CODE-03 — P3 — Alias visuales y contratos contradictorios

`button.tsx:24,45-48,161` declara `mint` como alias de `primary`, pero `mint` selecciona tipografía `h3` y `primary` selecciona `button`: 18/24 frente a 17/22. `theme/index.ts` mantiene aliases y una paleta legacy calculada al importar. `ScreenContainer` aún admite degradados legacy.

No se encontró una pantalla actual usando un nombre legacy de fondo en la búsqueda dirigida; es deuda de contrato, no un fallo activo de cambio de tema demostrado. Recomendar inventario de consumidores, consolidar variantes equivalentes y retirar compatibilidad solo con evidencia de desuso.

### CODE-04 — P3 — Archivo de Ajustes concentra demasiadas responsabilidades

`settings/[section].tsx` reúne selección de ruta, cuenta, apariencia, robot, preferencias del mayor, avisos, umbrales, notificaciones, personas, dispositivos, legal, borrado, demo y ayuda. También repite el patrón de purga/reconstrucción de cuenta en Legal y Avanzado, con diferencias de `demoMode` que deben conservarse.

Recomendar separar responsabilidades por sección y centralizar solo las operaciones verdaderamente comunes. `Row` local es una fila con switch y `components/row.tsx` es una composición texto/acción: compartir nombre no prueba duplicación funcional.

### CODE-05 — P3 — Restos del antiguo robot y reserva de espacio

`features/feed/launcher.tsx:79-120` conserva estados de mirada y corazones cuyos valores se descartan, timers y lógica de gestos que ya no afectan al dibujo actual de campana. El componente tampoco se monta (UX-02). `ScreenContainer` reserva `tabBarSpace(...) + 88` para pantallas de pestañas; el comentario atribuye el extra al antiguo lanzador.

Recomendar decidir el destino del componente y de su estado persistido. Comprobar el espacio inferior antes de eliminar el extra: el resultado visible y su posible propósito adicional no se midieron.

## Colores, animación y criterio de diseño

- **Conservar:** tokens por dominio, cuatro temas, texto/icono además de color para estados, botones de altura mínima, separación de lógica de dominio y presentación, escenas internas del onboarding que cancelan su bucle cuando quedan inactivas.
- **Contraste:** pasan los pares de la suite actual. No afirmar que todo BUDDY cumple contraste por eso: no se midieron todos los colores arbitrarios, transparencias compuestas, foco ni fondos reales de cada pantalla.
- **Uniformidad:** hay controles con `PressableScale` y controles con `Pressable` directo. Por ejemplo, la tarjeta de agua en `health.tsx` abre detalle con `Pressable`, mientras otras métricas usan `Card` interactiva. Es una diferencia de implementación que debe compararse visualmente antes de imponer un único efecto.
- **Tamaño táctil:** chips y segmentos usan 44 dp sin la ampliación explícita del botón compacto de 40+8. Eso difiere del mínimo interno de 48; 44 no se declara automáticamente inaccesible en todas las plataformas. Verificar separación y objetivos por plataforma.
- **Rendimiento:** `CountUp` ejecuta estado React por frame durante cambios; `WaterFill` mantiene dos bucles mientras está montado. Son candidatos a medir, no evidencia de lentitud. Medir con pantalla enfocada, oculta y app en segundo plano antes de optimizar.
- **Documentación:** el design system mezcla decisiones y cifras de varias versiones; por ejemplo, documenta compacto de 44 mientras el token actual es 40. Actualizar una única especificación después de acordar el diseño final.

## Carrusel: qué cambiar

Sí recomiendo rediseñar el comportamiento del carrusel como primera pieza de presentación, una vez atendido UX-01. No hay evidencia para afirmar que cambiar de librería resuelva el problema: hoy es un `Animated.ScrollView` con paginación y escenas propias.

Objetivo propuesto, pendiente de aprobación de diseño:

1. Una única página seleccionada coherente con posición real, progreso y acción.
2. Conservar página al rotar y redimensionar, sin texto semitransparente fuera de centro.
3. Movimiento reducido que incluya scroll programático, texto y escena.
4. Ilustración secundaria al texto; ninguna explicación esencial dentro de las miniaturas decorativas.
5. Estado accesible del paso, orden de lectura y foco comprobados con TalkBack/VoiceOver.
6. Evaluar si cuatro escenas aportan comprensión. No añadir una dependencia solo para cambiar el aspecto.

## Qué debes revisar en pantalla

| Recorrido | Acción concreta | Aceptación |
|---|---|---|
| Introducción | Swipe lento/rápido, interrumpir, Siguiente, Omitir, volver a verla | Página, título, escena, progreso y CTA coinciden |
| Introducción | Cambiar orientación en pasos 2–4 | Página centrada y contenido legible |
| Apariencia | Claro, oscuro, automático y ambos altos contrastes | Todo cambia de forma coherente; sin muestras engañosas |
| Tamaño de texto | Normal, máximo y escala del sistema | Errores y etiquetas esenciales legibles; acciones alcanzables |
| Cuenta | Abrir eliminación y provocar error en entorno de prueba | Contraseña y error dentro del diálogo; cancelar siempre posible |
| Avisos | Leer y modificar cada umbral | Se entiende qué nivel se configura |
| Formularios | Teclado, error, mostrar contraseña, reintento lento | Campos y botones visibles; sin doble envío |
| Inicio y Salud | Vacío, datos, alertas, nombres largos | Jerarquía clara; tarjetas con feedback coherente |
| Pestañas | Toque y arrastre interrumpido/cancelado | Indicador vuelve a la pestaña real; no queda entre posiciones |
| Pantalla del mayor | 320/360 dp, letra máxima, pendientes y confirmación | Acciones principales alcanzables; ninguna información esencial cortada |
| Diálogos y hojas | Horizontal, letra máxima, contenido largo | Cuerpo desplazable y botones siempre accesibles |
| Animaciones | Reducción de movimiento desde antes del arranque | Sin paralaje ornamental innecesario; feedback comprensible |

Matriz mínima pendiente: Android e iOS; ancho pequeño y normal; texto normal y máximo; temas claro/oscuro/alto contraste; lector de pantalla; teclado; estado vacío/error/carga/datos. Priorizar recorridos críticos en vez de multiplicar capturas sin revisar interacciones.

## Orden recomendado para una futura corrección

1. Cuenta: diálogo, contraseña, errores y espera.
2. Retirar o hacer coherentes los ajustes sin efecto.
3. Carrusel: paginación, adaptación y accesibilidad.
4. Escalado de errores, etiquetas y contenedores modales.
5. Consolidación de primitivas, contratos y deuda legacy.
6. Verificación visual móvil y medición de rendimiento; después pulido de sombras, intensidad de color y ritmos de animación.

No se da una nota de «máxima potencia», un porcentaje global de duplicación o una aprobación visual: no hay mediciones suficientes para sostenerlos.

## Referencias técnicas consultadas

- Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/
- Reanimated 4, `withTiming` y configuración `reduceMotion`: https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/

Los hallazgos funcionales proceden del código local actual, no de resultados históricos de otras auditorías.
