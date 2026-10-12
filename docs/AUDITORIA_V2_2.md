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
| 1 | El chat pregunta, pero el botón de confirmar queda arriba y el medicamento no se agrega | `repro-chat.test.tsx`: falla con `Unable to find an element with testID: draft-pinned` | La tarjeta de propuesta se dibuja dentro del mensaje donde nació; las preguntas siguientes se agregan debajo y la empujan fuera de vista. Además, tras completar lo obligatorio el motor sigue preguntando opcionales (concentración, unidades por caja) y nunca aparece una confirmación final al pie. | Hito 3 | — | Pendiente |
| 2 | Lo agregado por BUDDY no se nota en Rutina, Resumen y vista del paciente | `repro.test.tsx` P2 (no existe la marca "Nuevo") | Los datos sí llegan al store (mismo caso de uso que Rutina), pero no hay resaltado ni enlace al registro; "Ver en Rutina" abre la pestaña sin contexto. | Hito 3 | — | Pendiente |
| 3 | Las recomendaciones (no tomó la pastilla, ánimo bajo, no durmió) no llegan al administrador y no hay escalada | P3 | No existe un motor de reglas sobre historiales: el panel "BUDDY te sugiere" solo mira el día actual y elige un texto. | Hito 5 | — | Pendiente |
| 4 | Login y registro no distinguen administrador y adulto mayor | P4 | `AuthUser` no tiene rol; solo existe la cuenta del cuidador. | Selector de rol en la entrada; `AuthUser.role/ownerId/elderId`; `createManagedAccount` (paso "Acceso de [nombre]" y Ajustes > Mis personas > Acceso); el adulto mayor entra a su pantalla; acceso del administrador con PIN (mantener el saludo 2 s). | P4 en verde; `roles.test.tsx` (32 pruebas: matriz `can`, crear/entrar/revocar/restablecer acceso, dos cuentas en un dispositivo con datos aislados y autoría, rol equivocado, rutas por rol, PIN con intentos). Capturas `despues/hito2/entrada-*.png`, `login-adulto.png`. | **Corregido** (local; en otro celular requiere Fase 2) |
| 5 | Lo que cambia el administrador no se refleja en el celular del paciente | P5 | No hay registro de cambios ni motor de sincronización; un solo store local por teléfono. | Hito 4 (preparación); el reflejo real requiere Supabase (Fase 2) | — | Pendiente |
| 6 | Se quitó el mapa | P6 | La función de ubicación se retiró en v2.1. | Hito 7 | — | Pendiente |
| 7 | Salud mental y Sueño con texto desbordado o ilegible | Capturas `antes/salud-360.png`, `antes/salud-semana-360.png`: la cara desaparece (ancho 0), "Bien Regular Mal" se pisa y es ilegible sobre morado, la flecha de "Alimentación" se sale | `MetricBody` pone la cara y un número `heroL` en una fila sin `flexShrink`; en tarjetas de media columna el texto aplasta la cara. Etiquetas de barras de 11 px con contraste bajo sobre el degradado nocturno. | Hito 6 | — | Pendiente |
| 8 | Sin notificaciones al adulto mayor; las citas no tienen dirección | P8 | `Appointment` solo tiene `place`; no hay `expo-notifications` ni programador. | Hito 6 | — | Pendiente |
| 9 | En el login el robot se queda fijo y tapa el texto | Captura `antes/login-teclado-scroll-200.png`: el robot tapa "Correo electrónico" y el campo. P9 | `RobotStage` dibuja un robot único en una capa absoluta sobre toda la app y lo coloca con `measureInWindow` **una vez** al enfocar la pantalla. Al desplazar o abrir el teclado el contenido se mueve y el robot no. | Se elimina `RobotStage`; `AuthRobot` vive dentro del contenido, se achica (escala) y se desvanece con el scroll, reserva menos alto con teclado y se reinicia con `useFocusEffect`. | P9 en verde; `node scripts/capture/robot-overlap.mjs` → "OK: el robot no tapa campos, botones ni textos" en `/`, `/sign-in`, `/sign-up`, `/forgot-password` × 390×844, 360×740, 360×520 × scroll 0/200/400. Captura `despues/robot_sign-in-520-scroll-200.png`. | **Corregido** |
| 10 | Falta flecha atrás en "Entregar a [nombre]" | P10/P11 | "Entregar" no es una pantalla: abre directamente la hoja del PIN y entra al modo del adulto mayor. | Hito 4 | `npm run check:headers` → 24 rutas OK (las existentes) | Pendiente |
| 11 | En "Entregar" no se ve la pantalla del paciente mientras se edita | P10/P11 | La vista previa solo existe como ruta aparte `/preview`. | Hito 4 | — | Pendiente |
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
