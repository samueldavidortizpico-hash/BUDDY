# Auditoría v2.1 — los 16 problemas reportados

Capturas "antes" tomadas el 2026-10-11 sobre el commit `9c4e7b2` (web, 390×844 salvo indicación) en
`docs/auditoria/antes/`. Capturas "después" en `docs/auditoria/despues/`. Estado: **Corregido** (implementado y
verificado con captura), **En curso** (hito pendiente).

| # | Problema | Antes | Estado | Después |
|---|---|---|---|---|
| 1 | Robot pequeño, pixelado y poco visible | `01-03-bienvenida-robot-sin-login.png` | Corregido (Hito 1) | `01-robot-vectorial-vs-referencia.png` |
| 2 | Flota pero no vuela ni reacciona al tocar | `01-03-bienvenida-robot-sin-login.png` | En curso: vuelo entre anclas hecho (Hito 1); reacciones en el login en el Hito 2 | `02-robot-vuela-fotogramas.png` |
| 3 | Bienvenida sin "Iniciar sesión" ni "Crear cuenta" | `01-03-bienvenida-robot-sin-login.png` | En curso (Hito 2) | |
| 4 | No hay inicio de sesión real | `04-05-elegir-perfil-sin-registro.png` | En curso (Hito 2) | |
| 5 | Al elegir cuidador no pregunta por el adulto mayor | `04-05-elegir-perfil-sin-registro.png` | En curso (Hito 3) | |
| 6 | "Doña Carmen" y datos de ejemplo | `05-06-resumen-cuidador-datos-ejemplo.png`, `06-ahora-carmen.png` | En curso (Hito 2) | |
| 7 | Chat de BUDDY en el panel del adulto mayor | `07-08-chat-en-adulto-mayor.png` | En curso (Hitos 5 y 6) | |
| 8 | Chat flojo: no crea ni configura nada | `07-08-chat-en-adulto-mayor.png` | En curso (Hito 5) | |
| 9 | El chat no registra medicamentos con la cámara | `07-08-chat-en-adulto-mayor.png` | En curso (Hitos 4 y 5) | |
| 10 | Agregar medicamento sin cámara en el panel del cuidador | `09-10-agregar-medicamento-sin-camara.png` | En curso (Hito 4) | |
| 11 | Sin flecha de reversa; navegación atrapada | `11-reportes-sin-reversa-clara.png` | En curso: `ScreenHeader` nuevo y `npm run check:headers` (Hito 1); rutas viejas se eliminan en el Hito 2 | |
| 12 | Claro/oscuro no está en Ajustes; falta alto contraste | `12-ajustes-sin-apariencia.png` | En curso: 4 temas en tiempo real (Hito 1); pantalla de Apariencia en el Hito 7 | |
| 13 | Sin sección de salud con métricas ni reloj | `13-salud-sin-metricas.png` | En curso (Hito 6) | |
| 14 | Falta alimentación | `14-sin-alimentacion.png` | En curso (Hitos 3 y 6) | |
| 15 | Seguridad de medicamentos con texto corrido | `15-seguridad-texto-corrido-360.png` | En curso (Hito 4: se rehace como revisión limitada) | |
| 16 | Se siente de prueba, botones por todos lados | `05-06-resumen-cuidador-datos-ejemplo.png`, `16-alertas.png` | En curso (todos los hitos) | |

## Notas por problema

**1. Robot.** Se midieron todas las imágenes del robot: `assets/branding/buddy-logo.png` y
`docs/figma-referencia/public/buddy-logo.png` miden 358×147 (el robot ocupa 112×128); `assets/images/icon.png` y
`splash-icon.png` miden 1024×1024 pero son ampliaciones borrosas del mismo original (no hay carpeta `/image`). Ninguna
sirve sin pixelarse, así que se construyó `BuddyRobotVector` (react-native-svg, por capas: cabeza, pantalla facial,
ojos con 9 expresiones y parpadeo, antena, orejas, brazos, cuerpo, corazón con brillo, manos que tapan los ojos) y
se comparó lado a lado con la referencia en `/dev/robot` (2 rondas). `BuddyRobot` usará automáticamente un PNG si
el dueño aporta una exportación transparente a 4x (`HIGH_RES_PNG` en `src/components/robot/index.tsx`).
Tamaño mínimo 96 dp en toda la app (56 solo en el encabezado del chat); en oscuro lleva halo menta.

**2. Vuelo.** `RobotStage` (`src/components/robot/stage.tsx`) mantiene una sola instancia del robot por encima de
las pantallas y vuela entre anclas medidas (`<RobotPerch>`), con curva Bézier, inclinación por velocidad, cometa de
3 estelas, propulsor y aterrizaje con squash & stretch. Verificado en web con fotogramas.
