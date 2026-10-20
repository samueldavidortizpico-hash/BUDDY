# Auditoría ronda V3.0: antes y después

Método: cada error se reproduce **antes** de corregirlo con una captura en web (Playwright, 390×844, 360×740, 360×640 y el
teclado simulado bajando el alto a 480) y una prueba automática que falla; se documenta la causa raíz y se demuestra la
corrección con la misma prueba. Datos de las capturas: sintéticos (`scripts/capture/seed.js`). Capturas en
`docs/capturas/v30/` con el prefijo `antes-` y `despues-`.

Reproducción del Hito 1: `npx expo export --platform web && node scripts/capture/v30-hito1.mjs [dist] docs/capturas/v30 [antes|despues]`.

## Hito 0: estado de partida (2026-10-20)

- `main` en `1d4c0d8` (V2.4 completada). Cambios locales del dueño sin publicar en `package.json`, `package-lock.json` y
  `.vscode/settings.json` (actualizaciones de parches de Expo): no se tocan ni se incluyen en los commits de la ronda.
- Base: `tsc` 0 errores. `v30-hito1.mjs` contra la versión de partida: **31 fallas** (abajo).

## Hito 1: correcciones críticas

| # | Error | Evidencia antes | Causa raíz | Corrección | Evidencia después |
|---|---|---|---|---|---|
| 1 | Chat: la barra de pestañas flota sobre el compositor y no hay flecha "Volver" | 24 fallas: "barra de pestañas visible en el chat" y "sin botón Volver" en 4 tamaños × 3 temas (`antes-chat-*.png`; con teclado simulado a 360×480 la barra ocupa el final de la pantalla bajo el campo) | El chat era una **pestaña** (`(tabs)/buddy.tsx`): la barra flotante (V2.4) vive encima de toda pestaña y el chat compensaba con un `paddingBottom` fijo que no cubría todos los casos; al ser raíz de pestaña no tenía `ScreenHeader` | El chat pasa a `src/app/(caregiver)/buddy.tsx`, ruta del **stack** sin barra (decisión 93). `ScreenHeader` con "Volver" (48 dp, a `/summary` si no hay historial), encabezado de 64. Compositor: alto mínimo 52, enviar 48, hasta 4 líneas, `minWidth: 0` en el campo, `paddingBottom` = safe area con el teclado cerrado y 0 con el teclado abierto; al abrir el teclado o enviar baja al último mensaje | 0 fallas (`despues-chat-*.png`); Jest `v30/hito1.test.tsx` ("Volver", enviar ≥ 48, sin `tablist`) |
| 2 | Ajustes > Mis personas: el nombre se aplasta a una letra por línea y "Acceso" se sale de la pantalla | `antes-ajustes-people-360x640-claro-max.png`: "Elis [PRUEBA]" en vertical; "botón Acceso fuera de pantalla"; también a 390×844 normal ("Activa" de 16 px de ancho) | Una sola fila con icono + nombre (`flex: 1`) + hasta 3 botones sin salto de línea: los botones no se encogen y el nombre queda con ancho casi 0 | Nombre arriba y acciones debajo en una fila con `flexWrap` | 0 fallas (`despues-ajustes-people-*.png`) |
| 3 | Ajustes > Acceso del adulto mayor: abre una hoja que se corta con texto grande | "Acceso abre una hoja, no una pantalla" (`antes-ajustes-people-*-acceso.png`: la hoja tapa el título y el formulario queda cortado) | `BottomSheet` con un formulario largo dentro | Ruta de pantalla completa `settings/access/[elderId]` con `ScreenHeader`, scroll y teclado | 0 fallas; Jest: "Acceso abre la ruta del acceso" |
| 4 | Ajustes > Cuenta con texto al 200 %: el botón "Mostrar contraseña" se sale de la pantalla | "botón Mostrar contraseña fuera de pantalla" a 360×640 en los 3 temas | En web un `TextInput` con `flex: 1` no se encoge por debajo de su ancho propio (atributo `size`), que crece con la letra | `minWidth: 0` en el campo de `Field` (sirve a todos los formularios) | 0 fallas |
| 5 | Título del encabezado partido y cortado con texto al 200 % ("Mis…") | `antes-ajustes-people-360x640-claro-max-acceso.png` | El título escalaba ×2 en 2 líneas dentro de un encabezado de ancho fijo | `maxScale` 1,5 en título y subtítulo de `ScreenHeader` | `despues-ajustes-*-max.png` |
| 6 | No se puede salir de la cuenta del adulto mayor | 3 fallas: "no hay botón Opciones visible (solo un gesto oculto de 2 s)" (`antes-adulto-*.png`) | La única salida era mantener presionado el saludo 2 s (no descubrible) y, con la entrega del teléfono, un candado sin texto | Botón "Opciones" etiquetado arriba a la derecha → hoja con "Entrar como administrador" (PIN con 5 intentos y espera creciente, o correo y contraseña) y "Cerrar sesión" con confirmación "Vas a salir de BUDDY en este celular…". En modo prueba, el banner fijo "Modo prueba" con "Volver a administrador" sin PIN | 0 fallas (`despues-adulto-*.png`); Jest: PIN y "Cerrar sesión" en `v22/roles.test.tsx` y prueba de extremo a extremo (entrar como adulto mayor → salir → entrar como administrador) |
| 7 | Tras "Cerrar sesión" la entrada volvía a mandar a la pantalla del adulto mayor (encontrado al escribir la prueba de extremo a extremo) | La prueba se quedaba en `/elder` | `sessionActions.signOut/signIn` dependían solo del oyente del proveedor de autenticación para actualizar la sesión; si aún no respondía, la entrada veía la sesión vieja y redirigía | `signOut` y `signIn` fijan la sesión al terminar (sin duplicar si el oyente ya lo hizo) | Prueba de extremo a extremo verde |
| 7b | Modo prueba: "Volver a administrador" se salía del banner (regresión de la corrección #6, encontrada por `scripts/check-overflow.mjs`) | `FALLA_elder-*.png` en 5 combinaciones | Etiqueta más larga en una fila sin salto | El banner pasa a dos líneas (texto arriba, botón a todo el ancho) | `check-overflow`: OK en 11 pantallas |
| 8 | Las burbujas del robot tapan filas de Ajustes (360×640, texto al 200 %) y bloquean el toque | Playwright: "subtree intercepts pointer events" sobre "Cuenta"; ver Hito 2 | El robot y sus burbujas flotan sobre todas las pestañas | Se corrige en el Hito 2 (las novedades viven en el Inicio) | Hito 2 |

Además (pedido del dueño en esta ronda):

| # | Error | Evidencia antes | Causa raíz | Corrección | Evidencia después |
|---|---|---|---|---|---|
| 9 | El aviso "Toma agua" del adulto mayor no se va con un vaso: a última hora exige registrar hasta 8 seguidos | Jest `now.test.ts` "un solo vaso cierra el aviso aunque vaya atrasado frente a la meta": falla con la regla anterior | `elderNow` pedía agua mientras `vasos de hoy < horas programadas ya pasadas`: a las 8:30 p. m. con 8 horas pasadas y 1 vaso seguía pidiendo 7 más | Un aviso por hora programada: se responde con **un** vaso tomado desde la última hora vencida; el siguiente aparece en la próxima hora; con la meta cumplida no pide más | Jest verde (4 casos nuevos) |

Sobre la contraseña del acceso del adulto mayor (1.2): **ya** se guardaba como hash con sal (16 bytes aleatorios, SHA-256
iterado 1000 veces, comparación en tiempo constante) en `src/infrastructure/local/auth.ts`; no había texto plano ni forma
reversible, así que no hay migración. Una prueba nueva lo fija (el valor guardado no contiene la contraseña y tiene
`salt`, `hash` e `iterations`). Como no se puede leer, "Restablecer" genera una contraseña temporal legible (sin 0/O/1/l/I)
que se muestra **una sola vez**.

Pendiente de comprobar en celular (no medible en web): el compositor justo encima del teclado real en iOS y Android
(`docs/PRUEBAS_EN_DISPOSITIVO.md`).
