# BUDDY — Checklist de pantallas

## V3.0 (2026-10-20)

"Web" = Playwright a 390×844 y 360×740 (360×640 y 480 de alto con teclado simulado donde aplica), claro, oscuro y alto
contraste; "Jest" = prueba automática; "Dispositivo" = `docs/PRUEBAS_EN_DISPOSITIVO.md` § 0.

| Pantalla | Estado | Validación |
|---|---|---|
| Inicio (vista de un segundo, tomas de hoy con su etapa, resumen diario) | Hecho | Web `hito5-summary-*`, recorrido; Jest `status.test.ts`; dispositivo 0.4 |
| Chat de BUDDY a pantalla completa con "Volver" y compositor anclado | Hecho | Web `v30-hito1.mjs` (12 combinaciones), recorrido con alto 480; Jest `hito1.test.tsx`; dispositivo 0.1 |
| Ajustes: 10 opciones como rutas completas | Hecho | Web `v30-hito1.mjs` (360×640 al 200 % en 3 temas y 390×844); Jest; dispositivo 0.2 |
| Ajustes > Mis personas > Acceso (pantalla) | Hecho | Web; Jest (contraseña temporal, correo, revocar) |
| Ajustes > Mis avisos (aviso escalonado, silencio, resumen) | Hecho | Web `hito5-settings_alerts-*`; dispositivo 0.2.5 |
| Invitar a un familiar | Hecho en local; aceptar requiere servidor | Web `hito6-settings_invite-*`; Jest `hito6.test.tsx` |
| Registro rápido (5 pantallas) | Hecho | Web `hito6-setup_new_1-*`, recorrido; Jest |
| Pantalla del adulto mayor (Opciones, respuestas de 72, modo prueba) | Hecho | Web `hito6-elder-*`, `despues-adulto-*`; Jest `roles.test.tsx`, `hito6.test.tsx`; dispositivo 0.3 y 0.5 |
| Nutrición (`/food`) y reloj (`/health/watch`) | Futuro: fuera de la navegación | `src/config/features.ts` |

## Adenda de diseño v2 — verificación cruzada (2026-10-11)

Estado: **Hecho** (implementado y revisado con captura), **Heredado** (tiene tokens v2 y modo oscuro, falta la recomposición
pedida), **Pendiente**, **No aplica / futuro** (no se muestra como funcional). "Web" = Playwright en 390×844 y 360×740;
"Nativo" = pendiente de revisar en Expo Go.

### Sistema
| Requisito | Estado | Archivo | Validación |
|---|---|---|---|
| Tokens exactos (tipo, espaciado, radios, alturas, sombras, bordes) | Hecho | `src/theme/index.ts` | tsc, capturas |
| Modo oscuro diseñado en toda la app | Hecho (se fija al abrir la app) | `src/theme/index.ts`, `app.json` | Barrido de 17 pantallas en oscuro |
| Contraste ≥ 4.5:1 en claro y oscuro | Hecho | `src/theme/__tests__/contrast.test.ts` | 84 pares en Jest |
| Degradados y lenguaje por dominio (agua, medicamento, ánimo, sueño, actividad, seguimiento ámbar) | Hecho (tokens) | `domains` | Usado en "Ahora" |
| Números héroe XL/L con tope de escala | Hecho | `type.heroXL/heroL`, `maxFontScale` | Captura "Ahora" |
| Texto al 200 % | Pendiente de revisión nativa | `AppText` (tope ×2) | No se puede forzar en web |
| Robot transparente | Hecho (baja resolución de origen) | `assets/branding/buddy-robot.png` | Revisado sobre claro y oscuro |
| `BuddyRobot` (idle, wave, think, talk, celebrate, worry; entrada; toque) | Hecho | `src/components/robot/index.tsx` | Web: vuelo, fantasmas, destellos, reposo. Nativo pendiente |
| Splash hasta fuentes listas | Hecho (ya existía; el robot se carga con la pantalla) | `src/app/_layout.tsx` | — |
| Button (primary, coral, secondary, danger, ghost, tonal, white; 72/60/52; pressed, disabled, loading, brillo) | Hecho | `button.tsx` | Capturas |
| Card (borde 1 px, héroe con degradado) | Hecho | `card.tsx`, héroe en `home.tsx` | Capturas |
| FloatingTabBar (vidrio translúcido, píldora con resorte, rebote, etiqueta visible) | Hecho (ambos roles) | `bottom-tab-bar.tsx` | Capturas claro/oscuro |
| Toast con acción (Deshacer) | Hecho | `feedback.tsx` | Captura |
| IconBubble 48/56/64, Chip/SegmentedControl con píldora deslizante, BottomSheet v2, StatBento, Timeline con punto pulsante, EmptyState con robot, Skeleton, Confetti | Pendiente (incrementos 2–3) | — | — |
| Transiciones de Expo Router (modales desde abajo, pestañas con fade) | Parcial (recordatorio desde abajo ya existía) | `_layout.tsx` | — |

### Pantallas clave
| # | Pantalla | Estado | Archivo | Validación |
|---|---|---|---|---|
| 1 | Bienvenida (orbes, robot volador, coreografía saltable, título palabra a palabra, CTA coral 64 con brillo) | Hecho | `src/app/(auth)/index.tsx` | Web claro/oscuro, 390/360, fotogramas, movimiento reducido |
| 3 | Adulto mayor "Ahora" (héroe por dominio, robot 120, numeral XL, 72/56, chips "Más tarde hoy", Llamar/Pedir ayuda) | Hecho | `src/app/(patient)/(tabs)/home.tsx`, `src/features/now/pick.ts` | Web claro/oscuro, 390/360, toasts; Jest `pick.test.ts` |
| 2 | Onboarding (arte a sangre 55 %, robot en arco entre diapositivas, puntos que se ensanchan) | Heredado | `(auth)/onboarding.tsx` | Captura oscura |
| 4 | Resumen del cuidador (bento asimétrico, "Última actualización", timeline, BUDDY te sugiere, existencias) | Heredado — **siguiente** | `(caregiver)/(tabs)/summary.tsx` | — |
| 5 | Rutina (segmentos, filas con barra de dominio, "+" flotante con hoja) | Pendiente — **siguiente** | — | — |
| 6 | Agua a pantalla completa (vaso con ondas SVG, burbujas, confeti de gotas) | Pendiente | — | — |
| 7 | Recordatorio de medicamento (cápsula con volumen, anillos, 72/56/52) | Heredado | `modals/reminder.tsx` | Captura oscura |
| 8 | Chequeo de 3 preguntas | Pendiente | — | — |
| 9 | TimeWheelPicker (con alternativa accesible) | Pendiente | — | — |
| 10 | Chat del cuidador | Heredado (el chat del paciente usa tokens v2) | `(patient)/(tabs)/chat.tsx` | Captura oscura |

### No se muestran como funcionales (futuro)
Escanear receta y "Con BUDDY" (IA) en añadir, cámara y micrófono del chat, llamadas reales, "En vivo" del cuidador
(no hay tiempo real: se mostrará "Última actualización"), voz de BUDDY (talk se conectará a `expo-speech` cuando exista),
paralaje con sensores (opcional, descartado por ahora: añade dependencia y coste sin aportar a la tarea).

## v1 (2026-10-10)

Estado real al 2026-10-10. "Verificado" significa:
- **Jest:** prueba de render o de interacción en `src/__tests__/` (rutas reales con `renderRouter`).
- **Web:** recorrida con Playwright en la versión web de Expo.
- **Expo Go:** pendiente de prueba en el teléfono (la hará el usuario).

| # | Pantalla del Figma (App.tsx) | Ruta | Estado | Verificado | Notas |
|---|---|---|---|---|---|
| 1 | Bienvenida (`welcome`) | `/` | Completa | Jest, Web | Robot flotando y orbes. Redirige si ya hay perfil. "Iniciar sesión" avisa que el inicio real llegará próximamente. |
| 2 | Onboarding (`onboarding`) | `/onboarding` | Completa | Jest | 3 pasos, puntos animados, Omitir, Continuar y "Elegir mi perfil". |
| 3 | Selección de perfil (`profile`) | `/profile-choice` | Completa | Jest (navegación) | Guarda el rol y lleva a `/home` o `/summary`. |
| 4 | Inicio (`home`) | `/home` | Completa | Jest, Web | Fecha y saludo reales, próxima toma real, progreso por franjas, ánimo, accesos, menú, Hablar con BUDDY y Emergencia. |
| 5 | Medicamentos (`medications`) | `/medications` | Completa | Jest | Filtros Todos, Hoy y Próximos reales (FlatList), agregar y acceso a seguridad. |
| 5b | Detalle de medicamento | `/medication/[id]` | Completa | Jest | Ficha completa e historial de tomas. Editar y eliminar: próximamente. |
| 6 | Agregar medicamento (`add-medication`) | `/modals/add-medication` | Completa | Jest (validación y guardado) | Concentración separada de la dosis, horas, fechas y éxito animado. Foto del envase: próximamente. |
| 7 | Recordatorio (`reminder`) | `/modals/reminder?doseId=` | Completa | Jest (confirmar) | Ya lo tomé, Posponer 10 min y No lo tomé cambian el estado. Notificaciones: próximamente. |
| 8 | Estado de ánimo (`mood`) | `/mood` | Completa | Jest (guardar) | Cuadrícula 3×2, nota, semana con puntos y enlace a síntomas. |
| 9 | Síntomas (`symptoms`) | `/symptoms` | Completa | Jest | Chips, intensidad 1–3, hora, fecha, notas, aviso y últimos registros. |
| 10 | Sueño (`sleep`) | `/sleep` | Completa | Jest | Resumen nocturno, horas editables, calidad, gráfico de 7 días y siesta. |
| 11 | Salud (`health`) | `/health` | Completa | Jest, Web | 6 registros manuales con sparkline y tendencia descriptiva, e hidratación. |
| 11b | Nuevo registro manual | `/modals/add-vital?type=` | Completa | Jest (validación) | Valida rangos de escritura; guarda con `source: manual`. |
| 12 | Bienestar (`wellness`) | `/wellness` | Completa | Jest (vaso y hábito) | Metas, 8 vasos que se llenan, hábitos y logro. |
| 13 | Chat (`chat`) | `/chat` | Completa | Jest, Web | Burbujas, sugerencias, escritura, respuestas locales y micrófono "próximamente". |
| 14 | Reportes (`reports`) | `/reports` (`?viewer=caregiver`) | Completa | Jest | Día, Semana y Mes con datos reales. Compartir: demostración. |
| 15 | Seguridad de medicamentos (`safety`) | `/safety` | Completa (contenido "próximamente") | Jest | Sin interacciones ni indicaciones (ver DECISIONS #1). |
| 16 | Panel del cuidador (`caregiver`) | `/summary` | Completa | Jest, Web | Llamar y Mensaje: demostración. |
| 17 | Ubicación y bienestar (`location`) | `/tracking` (`?tab=wellbeing`) | Completa | Jest (revocar) | Mapa de ejemplo, permisos y revocación con confirmación. |
| 18 | Alertas (`alerts`) | `/alerts` | Completa | Jest (marcar atendida) | "Medicamento sin confirmar", nunca emergencia. |
| 19 | Perfil y configuración (`settings`) | `/settings`, `/settings/[section]` | Completa | Jest | Tamaño de texto global, datos, contactos, privacidad, notificaciones, accesibilidad, emergencia, cambiar perfil y cerrar sesión. |
| — | Cuenta del cuidador | `/account` | Completa | Jest | Permisos compartidos, texto, avisos y cerrar sesión. |
| — | Emergencia | `/modals/emergency` | Completa | Jest | Contactos ficticios y 123; no marca. |
| — | Galería (solo desarrollo) | `/dev/gallery` | Completa | Jest | Redirige a `/` fuera de `__DEV__`. |

## Pendiente o "próximamente" (no presentado como real)
Notificaciones del teléfono, inicio de sesión real y cuentas, voz, foto del envase (y extracción), revisión farmacológica, GPS y mapa real, llamadas y mensajes reales, compartir reportes, editar y eliminar medicamentos, cambiar foto, invitar contactos y editar datos personales.


## V2.4 (2026-10-12)

| Pantalla o pieza | Estado | Verificado en |
|---|---|---|
| Chat de BUDDY (tarjeta fija, menú de 8 acciones, respuestas tocables) | Hecho | Jest + capturas web 390/360, claro, oscuro, alto contraste, 200 % |
| "Agrega dolex" con presentaciones del INVIMA y tarjeta de información | Hecho | Jest (red simulada) + web con consulta real a NLM |
| Analizar un alimento (`/food`) | Hecho | Jest + detector de desbordes |
| Existencias (descuento exacto, avisos a 3 días, "Registrar compra") | Hecho | Jest con reloj simulado |
| Robot lanzador arrastrable y burbujas | Hecho | Jest + Playwright (arrastre, imán, persistencia) |
| Barra de pestañas flotante con vidrio y gesto | Hecho en web; vidrio nativo pendiente de iOS 26 | Playwright (arrastre y toque) |
| Dónde está [nombre] (`/location`) y consentimiento del adulto mayor | Hecho en web; mapa nativo pendiente de dispositivo | Jest + Playwright con geolocalización simulada |
| Portada de carga | Hecho | Jest + capturas web |
| Selector de Rutina (palabras largas) | Corregido (fila desplazable) | Captura web |
# Ronda V3.1 — estado de implementación (2026-10-23)

- [x] Hito 1: base de textos y botones con reglas de encogimiento; verificar aún en iPhone con 360/375/390 dp, fontScale 1/1.3/2.0 y cada tamaño de letra de la app.
- [x] Hito 2: vista de la persona y cambio/retorno de cuenta con contraseña; recorrido Jest aprobado, falta recorrido visual en teléfono.
- [x] Hito 3: barra Inicio, Salud, BUDDY, Ubicación, Rutina; avatar abre Cuenta y chat sin barra; prueba focal aprobada.
- [x] Hito 4: chat y automatizaciones implementados y probados en Jest; falta validación visual y nativa.
- [x] Hito 5: permisos del adulto mayor (falta verificación física).
- [x] Hito 6: historiales y Salud visuales (falta verificación física).
- [x] Hito 7: planes y BUDDY Plus implementados (compras reales y dispositivos pendientes).

Pasos manuales de navegación: `docs/PRUEBAS_EN_DISPOSITIVO.md`, sección “Ronda V3.1”.
# Ronda V3.1 — hito 5: permisos

- [x] Inicio del adulto mayor: sin controles de decisión de ubicación; solo indicador cuando comparte.
- [x] Opciones: entrada Permisos junto a cerrar sesión y entrar como administrador.
- [x] Ruta Permisos con flecha atrás, estado real de notificaciones, activar/abrir ajustes y compartir/revocar ubicación con confirmación.
- [x] Primer ingreso de cuenta adulta: explicar y solicitar permiso de notificaciones, con opción para continuar sin activarlo.
- [ ] Revisar VoiceOver/TalkBack, alto contraste y letra máxima en dispositivos físicos.
- [ ] Probar fontScale 1.0/1.3/2.0 y anchos 360/375/390 en iPhone y Android.

## Hito 6 — Historiales y Salud

- [x] Resumen: un vaso por horario, estado derivado de marcas de tiempo reales y total de registros de hoy.
- [x] Salud: ánimo y sueño apilados a ancho completo y con barras visibles aunque no haya registros.
- [x] Actividad, comidas y tomas muestran iconos de estado en la línea de tiempo.
- [ ] Auditar en iPhone con todos los tamaños de letra de BUDDY y fontScale del sistema 1.0/1.3/2.0.
- [ ] Repetir en anchos 360/375/390 y lector de pantalla/alto contraste.

## Hito 7 — BUDDY Plus y actividad

- [x] Salud muestra acceso bloqueado de reloj con texto accesible y abre la pantalla Plus.
- [x] Ajustes > Avanzado expone el entitlement local solo en desarrollo; probar activar/desactivar y abrir de nuevo Salud.
- [x] La pantalla Plus declara precios pendientes, términos y restauración; no recoge tarjetas ni afirma una prueba activa.
- [x] El podómetro no presenta valores de ejemplo; el conteo aparece solo cuando el sistema devuelve una lectura.
- [ ] Revisar lector de pantalla y texto al 200 % en Plus y Conectar reloj.

## Ronda V4

| Pantalla | Brief V4 | Web (Jest + control visual) | iPhone |
|---|---|---|---|
| Inicio | Saludo, campana, Ajustes; persona; estado héroe; una fila de novedades; Hoy en 3 mosaicos; próximo y última señal | Hecho | Pendiente |
| Adulto mayor | Saludo H1 y fecha; Opciones con palabra; "Ahora" centrado (96/28/40, botones 72 y 56); Más tarde hoy; Llamar y Pedir ayuda de 64 | Hecho | Pendiente |
| Opciones y Permisos | Ruta completa; permisos (avisos, ubicación, cámara); letra y apariencia; entrar como administrador; cerrar sesión con confirmación | Hecho | Pendiente |
| Detalle de medicamento | Nombre en el encabezado, Editar compacto, datos, Hoy con filas que bajan el botón, aviso R8, existencias apiladas, historial con iconos | Hecho | Pendiente |
| Chat | Avatar, "Asistente de [nombre]", 6 acciones, burbujas, escribiendo, tarjeta fija, compositor anclado | Hecho | Pendiente (teclado) |
| Rutina | Medicamentos, Agua, Preguntas, Citas, Contactos; chips de horas; + Agregar | Hecho | Pendiente |
| Salud | Tarjetas a ancho completo; adherencia; 7 días de ánimo y sueño; vasos de agua animados; pasos y reloj | Hecho | Pendiente |
| Ubicación | Mapa arriba; Llamar principal y Cómo llegar; vacío con el robot | Hecho | Pendiente (mapa nativo) |
| Ajustes | Lista agrupada; Cuenta; Personas; Apariencia; Avisos para mí; Plan; Privacidad y legal; Avanzado; Acerca de | Hecho | Pendiente |
| Vista de [nombre] | Banner, flecha atrás, Cambiar a la cuenta de [nombre] | Hecho | Pendiente |
