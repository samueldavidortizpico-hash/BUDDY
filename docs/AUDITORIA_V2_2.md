# Auditoría ronda v2.2 — antes y después

Cada problema reportado por el dueño se reprodujo **antes** de tocar el código con una prueba automática (Jest) o una
captura (Playwright sobre la exportación web). Las pruebas viven en `src/__tests__/v22/`: se escribieron como
`it.failing` (pasan solo mientras el fallo existe) y se cambian a `it` cuando la corrección las pone en verde.
Capturas en `docs/capturas/v22/antes` y `docs/capturas/v22/despues`.

Resultado de la reproducción (11-10-2026, antes de corregir): `npx jest src/__tests__/v22` → **12 de 12 reproducciones
fallan como se esperaba** (`Tests: 12 passed` con `it.failing` = las 12 expectativas fallan con el código original).

## Tabla de problemas

| # | Problema | Reproducción (antes) | Causa raíz | Corrección | Evidencia después | Estado |
|---|---|---|---|---|---|---|
| 1 | El chat pregunta, pero el botón para confirmar queda arriba y el medicamento no se agrega | `repro-chat.test.tsx`: falla con `Unable to find an element with testID: draft-pinned` | (a) La tarjeta de propuesta se dibujaba dentro del mensaje donde nació y las preguntas siguientes la empujaban fuera de vista; (b) tras lo obligatorio el motor seguía preguntando opcionales y nunca aparecía una confirmación al pie; (c) el intérprete no entendía "quiero que tome…", "necesita tomar…", "pon que tome…", "agregar medicamento" y convertía "ponle agua" en un medicamento llamado "Agua"; (d) una hora respondida cuando se pedía la dosis ("8:00 p. m.") se guardaba como dosis 8. | Borrador persistente (`domain/assistant/draft.ts`, `draftActions`) con obligatorios y opcionales; preguntas de a una con respuestas rápidas; tarjeta FIJA sobre el compositor que se llena; con lo obligatorio completo BUDDY deja de preguntar y pone la confirmación como último mensaje con scroll al final; Confirmar y agregar / Editar / Cancelar; "Listo, agregué… a las…" con Ver en Rutina, Deshacer y Ver pantalla; intérprete ampliado; una hora nunca se toma como dosis. | `repro-chat.test.tsx` en verde; `chat-actions.test.tsx` (15 pruebas, una por acción: medicamento, persistencia del borrador al salir y volver, confirmar deshabilitado hasta completar + deshacer, editar y quitar, existencias, agua, comidas, metas, contacto, chequeo, cita con dirección, recordatorio, mensaje, dosis nunca propuesta, urgencia); `draft.test.ts` (16). Capturas `despues/hito3/chat-*.png`. | **Corregido** |
| 2 | Lo agregado por BUDDY no se nota en Rutina, Resumen y vista del paciente | `repro.test.tsx` P2 (no existe la marca "Nuevo") | Los datos sí llegaban al store (mismo caso de uso que Rutina), pero no había resaltado ni enlace al registro; "Ver en Rutina" abría la pestaña sin contexto. | El ejecutor marca lo agregado (`state/recent.ts`); Rutina muestra "Nuevo" 8 s con entrada animada y borde; "Ver en Rutina" abre la pestaña correcta (`?seg=`). | P2 en verde; `chat-actions.test.tsx` comprueba Rutina ("Nuevo"), Citas y la pantalla del paciente (vista previa). Captura `despues/hito3/rutina-nuevo-390.png`. | **Corregido** (la hoja "Ver pantalla" llega en el Hito 4) |
| 3 | Las recomendaciones (no tomó la pastilla, ánimo bajo, no durmió) no llegan al administrador y no hay escalada | P3 | No existe un motor de reglas sobre historiales: el panel "BUDDY te sugiere" solo mira el día actual y elige un texto. | Hito 5 | — | Pendiente |
| 4 | Login y registro no distinguen administrador y adulto mayor | P4 | `AuthUser` no tiene rol; solo existe la cuenta del cuidador. | Selector de rol en la entrada; `AuthUser.role/ownerId/elderId`; `createManagedAccount` (paso "Acceso de [nombre]" y Ajustes > Mis personas > Acceso); el adulto mayor entra a su pantalla; acceso del administrador con PIN (mantener el saludo 2 s). | P4 en verde; `roles.test.tsx` (32 pruebas: matriz `can`, crear/entrar/revocar/restablecer acceso, dos cuentas en un dispositivo con datos aislados y autoría, rol equivocado, rutas por rol, PIN con intentos). Capturas `despues/hito2/entrada-*.png`, `login-adulto.png`. | **Corregido** (local; en otro celular requiere Fase 2) |
| 5 | Lo que cambia el administrador no se refleja en el celular del paciente | P5 | No había registro de cambios ni motor de sincronización: un solo store local por teléfono. | ChangeLog local en cada escritura (`{ id, entity, entityId, op, author, ownerUserId, updatedAt, version, syncStatus }`), `version` por registro, `db.subscribe()`, SyncEngine con reglas de conflicto (administrador manda en la rutina; adulto mayor solo agrega eventos) **desactivado**; plan en `docs/SUPABASE_PLAN.md` §2. | P5 en verde; `handoff-sync.test.tsx` (ChangeLog con autor real, subscribe por colección, conflictos, motor desactivado que lo dice y error nunca silencioso). | **Preparado; el reflejo real entre dos celulares NO funciona hasta conectar el servidor (Fase 2)** |
| 6 | Se quitó el mapa | P6 | La función de ubicación se retiró en v2.1. | Hito 7 | — | Pendiente |
| 7 | Salud mental y Sueño con texto desbordado o ilegible | Capturas `antes/salud-360.png`, `antes/salud-semana-360.png`: la cara desaparece (ancho 0), "Bien Regular Mal" se pisa y es ilegible sobre morado, la flecha de "Alimentación" se sale | `MetricBody` pone la cara y un número `heroL` en una fila sin `flexShrink`; en tarjetas de media columna el texto aplasta la cara. Etiquetas de barras de 11 px con contraste bajo sobre el degradado nocturno. | Hito 6 | — | Pendiente |
| 8 | Sin notificaciones al adulto mayor; las citas no tienen dirección | P8 | `Appointment` solo tiene `place`; no hay `expo-notifications` ni programador. | Hito 6 | — | Pendiente |
| 9 | En el login el robot se queda fijo y tapa el texto | Captura `antes/login-teclado-scroll-200.png`: el robot tapa "Correo electrónico" y el campo. P9 | `RobotStage` dibuja un robot único en una capa absoluta sobre toda la app y lo coloca con `measureInWindow` **una vez** al enfocar la pantalla. Al desplazar o abrir el teclado el contenido se mueve y el robot no. | Se elimina `RobotStage`; `AuthRobot` vive dentro del contenido, se achica (escala) y se desvanece con el scroll, reserva menos alto con teclado y se reinicia con `useFocusEffect`. | P9 en verde; `node scripts/capture/robot-overlap.mjs` → "OK: el robot no tapa campos, botones ni textos" en `/`, `/sign-in`, `/sign-up`, `/forgot-password` × 390×844, 360×740, 360×520 × scroll 0/200/400. Captura `despues/robot_sign-in-520-scroll-200.png`. | **Corregido** |
| 10 | Falta flecha atrás en "Entregar a [nombre]" | P10/P11 | "Entregar" no era una pantalla: abría directamente la hoja del PIN y entraba al modo del adulto mayor. | Nueva ruta `/handoff` con `ScreenHeader` (flecha atrás). Revisión de todas las rutas con `npm run check:headers`. | P10 en verde; `check:headers` → 25 rutas OK; prueba "tiene flecha atrás y tres opciones claras". Captura `despues/hito4/entregar.png`. | **Corregido** |
| 11 | En "Entregar" no se ve la pantalla del paciente mientras se edita | P10/P11 | La vista previa solo existía como ruta aparte `/preview`. | "Entregar a [nombre]": vista previa en vivo (el mismo `ElderScreen`, solo lectura, marco de teléfono), "Probar como [nombre]" (banner "Modo prueba" y "Salir" sin PIN) y "Entregar el celular" (PIN). Botón "Ver pantalla de [nombre]" en Rutina y en el chat que abre la vista en una hoja inferior. | `handoff-sync.test.tsx`: la vista previa se actualiza al instante al agregar algo; modo prueba entra y sale sin PIN; una entrega real no se puede cerrar como prueba; sin datos muestra el estado vacío. Capturas `despues/hito4/*.png`. | **Corregido** |
| 12 | Las diapositivas no explican qué es BUDDY | P12 | Tres diapositivas estáticas con un icono; no mencionan el escaneo ni la advertencia de contradicciones. | 6 diapositivas con escenas animadas propias (mapa que se conecta, campanas y gotas, cámara que revisa una caja, orden que se escribe sola y se vuelve tarjeta, tarjetas de ánimo/sueño/salud, candado y permisos), robot guía, "Saltar", insignia "Revisión con base farmacológica: Pronto" y al final Crear cuenta / Iniciar sesión. Bucles de 3–4 s, quietos con "reducir movimiento". | P12 en verde. Capturas `despues/hito2/onboarding-1..6.png`. | **Corregido** |
| 13 | El robot necesita más vida, caricias, ojos de corazón, lanzador con bolita roja | P13 | Ojos limitados a 4 dibujos; el toque solo hacía un saltito; no existía lanzador. | Ojos y gestos en Hito 1; lanzador en Hito 5 | `gestures.test.tsx` (6 pruebas): toque → ojos felices, doble toque → guiño, mantener → corazones durante 2 s tras soltar, 20 s → bostezo y sueño, bolita "3"/"9+", reducir movimiento sin bucles | Parcial (falta lanzador) |
| 14 | El panel de recomendaciones queda vacío o sin sentido con todo en orden | P14 | Un único texto genérico. | Hito 5 | — | Pendiente |
| 15 | Animaciones poco fluidas | Revisión de código con `fixing-motion-performance` | El vuelo del robot global recalculaba una curva por fotograma con 3 estelas y se cortaba al cambiar de pantalla. | Hito 1 elimina el vuelo global; el resto en Hito 7 | — | Parcial |

## Hito 1 — detalle

Skills aplicadas: `buddy-testing` (pruebas antes de corregir), `fixing-motion-performance` (solo transform y opacidad,
cancelar animaciones al desmontar, sin desenfoques animados), `fixing-accessibility` (el robot interactivo sigue siendo
un botón con nombre), `baseline-ui` (principios aplicables a React Native, ver decisión 45), `playwright-cli` (capturas).

### Robot vectorial con ojos (6.1–6.3)

- `vector.tsx`: estados `idle` (ojos abiertos con brillo), `happy`, `love` (corazones que laten), `sleep` (con Zz
  flotando), `surprised`, `worry`, `wink`, además de los anteriores. La mirada sigue al dedo (`gazeX/gazeY` en el
  hilo de UI) y en reposo mira a los lados cada ~8 s. Parpadeo cada 3–5 s.
- `index.tsx`: tocar = saltito, ojos felices y háptico ligero; doble toque = voltereta con guiño; acariciar (arrastrar
  o mantener 600 ms) = ojos de corazón, meneo, 3 corazones flotantes y vibración suave mientras dura, y se mantiene
  2 s tras soltar; 20 s sin tocarlo = bostezo y sueño, despierta al tocarlo. Bolita roja `badge` que late.
- Límites de rendimiento: 6 destellos y 3 corazones como máximo; sin desenfoques animados; contenedor rasterizado
  (`renderToHardwareTextureAndroid`, `shouldRasterizeIOS`). Con "reducir movimiento" no hay bucles (prueba).
- Pendiente de dispositivo: comparación lado a lado con la referencia en `/dev/robot` en Expo Go y medición de fps.

## Hito 2 — detalle

Skills aplicadas: `buddy-testing` (pruebas de rol, rutas y PIN), `buddy-medical-safety` (texto del escaneo: advierte y
nunca receta; lo futuro con "Pronto"), `fixing-accessibility` (selector como `radiogroup`/`radio`, saludo con acción
accesible para el acceso del familiar, sin encabezados anidados), `fixing-motion-performance` (escenas con un solo
progreso en el hilo de UI, transform/opacidad, detenidas sin foco), `baseline-ui`.

- Entrada: "Soy administrador (familiar o cuidador)" → Crear cuenta / Iniciar sesión; "Soy adulto mayor" → solo
  Iniciar sesión con "Tu familiar creó tu acceso".
- Cuentas: el adulto mayor entra con el correo y la contraseña que definió su administrador y ve solo su pantalla
  (sin pestañas, ajustes, edición ni chat). Si en ese celular aún no hay datos de su perfil, lo dice con honestidad
  (el envío entre celulares llega con el servidor).
- Cambio de usuario: mantener presionado el saludo 2 s → PIN de 4 dígitos (5 intentos, espera creciente de 30 s a
  15 min) → "Cambiar de usuario" o "Entrar como administrador".
- Corrección adicional: en web los orbes decorativos generaban desplazamiento horizontal; `ScreenContainer` recorta.

## Hito 3 — detalle

Skills aplicadas: `buddy-testing` (integración por acción con el hook, el borrador, el ejecutor y las pantallas),
`buddy-medical-safety` (la dosis la escribe el cuidador y BUDDY la repite; nunca se propone; una hora no se acepta como
dosis; la revisión de BUDDY advierte y nunca receta; urgencias → 123 y contacto principal), `fixing-accessibility`
(datos del borrador con etiqueta completa, progreso anunciado con `accessibilityLiveRegion`), `fixing-motion-performance`
(transición de layout corta en la tarjeta, entradas con transform/opacidad), `baseline-ui`.

- Fallo adicional corregido: un recordatorio diario visto una vez nunca volvía a mostrarse (la clave de "visto" no
  incluía la fecha). Ahora es `id@YYYY-MM-DD` (`reminderSeenKey`).
- Revisión visual: en 360 px la primera versión de la tarjeta ocupaba casi toda la pantalla y el botón se cortaba;
  se compactó (datos en etiquetas, "Confirmar y agregar" a lo ancho, Editar/Cancelar debajo).
- Pendiente detectado para el Hito 6/7: el selector de segmentos de Rutina corta "Medicamentos" y "Comidas" en 390 px.

## Hito 4 — detalle

Skills aplicadas: `buddy-testing`, `buddy-medical-safety` (el ChangeLog no guarda datos de salud, solo ids),
`fixing-accessibility` (banner del modo prueba anunciado como alerta; botón "Salir" con indicación), `baseline-ui`.

- Revisión visual: el botón "Salir del modo prueba" se salía del banner; ahora es "Salir" con indicación accesible.
- Honestidad: la pantalla "Entregar a [nombre]" explica que el envío entre celulares llega al conectar el servidor.
