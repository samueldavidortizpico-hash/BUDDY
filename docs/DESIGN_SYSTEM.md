# BUDDY — Sistema de diseño V4 (vigente: V4.3)

Fuente única: `src/theme/index.ts`. Ningún color, tamaño ni espacio suelto en pantallas. Galería: `/dev/gallery` (solo
desarrollo). Controles automáticos: `scripts/capture/v4-screens.mjs` (web, 360/375/390 × letra 1,0/1,3/2,0 × claro,
oscuro y alto contraste), `scripts/check-headers.ts` y las pruebas de `src/__tests__/v4/` y `layout-v31`.

## V4.3 · Nivel profesional (vigente; reemplaza las medidas de "Tokens V4" donde difieran)

Galería con todos los estados: `/dev/gallery` (capturas en `docs/capturas/v4_3/galeria/`). Capturas antes y después:
`scripts/capture/v4_3.mjs`. Desbordes: `scripts/check-overflow.mjs` (15 pantallas, 390 y 360, letra normal y 200 %).

**Color (claro / oscuro).** Fondo `#F4F7F6` / `#0B1622`; superficie `#FFFFFF` / `#13212E`; superficie 2 `#EDF3F2` /
`#1B2B3A`; borde `#DCE6E4` / blanco al 8 %. Texto `#102A33` · `#5B6B73` · `#8A99A0` (oscuro `#F3F6F8` · `#A7B4C2` ·
`#7D8B98`). Marca: petróleo `#174A59`, petróleo profundo `#0D3946`, turquesa `#1FA9A0` (oscuro `#2BC4B4`, solo acento),
menta `#5ED9B5`. Dominios (fuerte / suave): medicamentos coral `#E8735F` / `#FDEDE9`, salud mental lavanda `#7B6CF0` /
`#EFEDFE`, sueño índigo `#5B63D6` / `#ECEEFC`, agua `#3D9BEF` / `#E8F3FD`, actividad `#23A989` / `#E5F7F1`, corazón y
reloj `#E25C6B` / `#FCEAEC`, seguimiento ámbar `#C98A12` / `#FDF4DD`, éxito `#2E9E64`, peligro `#D64545`. En oscuro los
dominios usan su versión clara y su fondo es el mismo color al 14 % sobre la superficie. Regla 60/30/10: el color dice
el tipo de dato; las tarjetas son neutras y el color del dominio vive en el contenedor del icono, el número o el estado.

**Degradados (solo momentos de marca).** Principal turquesa → petróleo a 135° (botón principal, encabezado del login);
Plus petróleo profundo → turquesa con un brillo lavanda suave (BUDDY Plus). En alto contraste no hay degradados.

**Tipografía (Manrope, una familia).** Display 32/38 800 (−0,5) · H1 28/34 800 · H2 22/28 700 · H3 18/24 700 · cuerpo
17/24 500 · secundario 15/22 500 · auxiliar 13/18 600. Números grandes (`heroL` 40, `heroXL` 56) con cifras tabulares.

**Medidas.** Espaciado de 4: pantalla 20, entre secciones 28, dentro de tarjeta 16–20, entre elementos 8/12/16. Radios:
tarjeta 20, destacada 28, botón y campo 16, compacto 12, chip redondo, hoja 28 arriba. Elevación: nivel 1 tarjetas
(0 1 2 al 4 % + 0 4 12 al 6 % del petróleo), nivel 2 flotantes (0 8 24 al 10 %), nivel 3 hojas (0 16 40 al 14 %); en
oscuro la elevación es una superficie más clara, no sombra.

**Componentes y estados.**
- `Button`: principal 56 (72 en el adulto mayor) con el degradado; presionado 0,97 con resorte y oscurecido del 8 %;
  deshabilitado al 40 % sin sombra; cargando con spinner del mismo ancho; éxito con check ~600 ms. Variantes:
  secundario (superficie 2), borde 1,5 px, texto, peligro (fondo suave), compacto 40 de alto y radio 12 (área 48).
- `Field`: etiqueta arriba, 56 de alto, superficie 2; foco con borde turquesa de 2 y halo del 15 %; error con borde,
  icono, mensaje y temblor de 300 ms; check verde cuando el formato es válido; icono a la izquierda y acción a la derecha.
- `ListRow`, `Card`, `Chip`, `Segmented` (píldora que se desliza), `Toggle` animado, `Checkbox` con check que se dibuja,
  `BottomSheet` con asa, toast que entra desde arriba, `EmptyState` con una acción y `Skeleton` con brillo.
- `PlusLock` / `LockedPreview`: vista previa difuminada, candado, plan que la incluye y "Ver planes". Nunca sobre una
  función de seguridad.
- `Bars`: barras de 14 px sobre su riel (no bloques a todo el ancho).

**Movimiento (`motion`).** Todo lo tocable reacciona en el mismo cuadro (`PressableScale`): 0,97 botones, 0,98 tarjetas y
filas, resorte 15/300. Pantallas 280 ms, hojas 320 ms, pestañas 180 ms. Entradas escalonadas de 40 ms (máx. 6) con
fundido y subida de 12 px (`Appear`); números que cuentan en 600 ms (`CountUp`); barras que se llenan con curva de
salida. Vibración ligera en acciones principales, de éxito al confirmar y de advertencia en errores. Solo `transform` y
opacidad; con "reducir movimiento", fundidos de 150 ms y sin vibraciones decorativas.

**Pantallas.** Login, crear cuenta y recuperar comparten `AuthShell` (degradado, robot real de 72, tarjeta que sube y
se compacta con el teclado). BUDDY Plus: encabezado Plus, Mensual/Anual, tres planes con el recomendado de borde
degradado y brillo cada 4 s, comparación desplegable, confianza y botón fijo con plan y precio (`src/config/plans.ts`).

## Skills aplicadas

| Skill | Uso en V4 | Adaptación a React Native |
|---|---|---|
| `impeccable` | Dirección (modo *Operate*), piso de calidad, crítica antes y después; sin etiquetas en mayúsculas sobre títulos, sin texto en degradado, iconos de un solo trazo | El brief del dueño fijó paleta y composición: se siguió el camino "superficies dentro de un mundo establecido" (sin torneo de conceptos). Su detector es para web: se usó el control propio `v4-screens.mjs` |
| `frontend-design` | Jerarquía por pantalla (una idea, una acción principal) | — |
| `baseline-ui` | Espaciado de 4 pt, una acción protagonista, estados vacíos con una acción, números tabulares | Reglas de Tailwind/web no aplican |
| `fixing-accessibility` | Contraste medido (prueba), áreas táctiles 48 (compacto 44 + 4 de área), 64–72 en el adulto mayor, nombres accesibles, letra al 200 % | Sin foco de teclado web; lectores de pantalla pendientes en dispositivo |
| `fixing-motion-performance` | Solo `transform` y opacidad en el hilo de UI (barras de Salud, agua, chat) y movimiento reducido | Reanimated en lugar de CSS |

## Tokens V4

- **Tipografía (Manrope):** Display 32, H1 28, H2 22, H3 20, cuerpo 18, secundario 16, auxiliar 14, barra 13. Todo escala
  con la letra de la app y del sistema (tope ×2).
- **Espaciado:** base 4; margen de pantalla 20; separación entre secciones 24; relleno de tarjeta 20.
- **Botón:** altura mínima 56 (adulto mayor 72); relleno horizontal 20; radio 18; etiqueta 18 en negrita y centrada que
  puede ocupar dos líneas; icono de 22 a la izquierda. Variantes: principal (petróleo sólido, texto blanco ≥ 9:1), tonal
  por dominio, peligro, de texto y `ghost` (superficie con borde ≥ 3:1). Compacto: 44 visibles + área táctil de 48.
- **Fila (`Row`):** texto con `flex: 1` y `minWidth: 0`; la acción nunca se encoge pero no pasa de la mitad del ancho; si
  el ancho efectivo (px ÷ escala de letra) baja de 340, la acción baja a ancho completo.
- **Tarjeta:** radio 24, relleno 20, sombra suave, borde fino; variante de estado: menta (todo bien), ámbar suave
  (atención), coral (acción necesaria) y gris (sin datos), con texto ≥ 4,5:1 medido en prueba.
- **Encabezado:** flecha atrás de 48 en toda pantalla no raíz; título H2 centrado de hasta dos líneas; acción a la
  derecha; avatar opcional (chat).
- **Mosaicos de icono (`IconTile`):** colores vivos por dominio (medicamento coral, agua azul, ánimo violeta, sueño
  índigo, actividad menta, comida y seguimiento ámbar), glifo ≥ 3:1 medido en prueba. Con letra muy grande se ocultan
  para dejar el ancho al texto.
- **Barra del administrador:** Inicio, Salud, BUDDY, Ubicación y Rutina; BUDDY es un círculo menta de 64 elevado con la
  bolita roja de novedades que abre el chat a pantalla completa; etiquetas de 13 siempre visibles.

## Composición por pantalla (brief de 5 líneas)

| Pantalla | Para qué | Lo primero | Acción principal | Color | Movimiento |
|---|---|---|---|---|---|
| Inicio | Saber en un segundo si está bien | Estado héroe | Llamar (si no está bien) | Estado | Entrada suave |
| Adulto mayor | Hacer una sola cosa | Tarjeta "Ahora" | Ya lo tomé (72) | Dominio de la tarea | Robot que saluda o celebra |
| Detalle de medicamento | Revisar y corregir un medicamento | Datos y "Hoy" | Marcar como tomado | Coral | Ninguno |
| Chat | Configurar hablando | Saludo y 6 acciones | Enviar | Menta y petróleo | Entrada de burbujas, "escribiendo" |
| Rutina | Ver todo lo programado | Segmentos | + Agregar | Por dominio | Nuevo elemento se desliza |
| Salud | Ver tendencias | Medicamentos | Ver detalle | Por dominio | Barras y agua animadas |
| Ubicación | Saber dónde está | Mapa | Llamar | Menta | Ninguno |
| Ajustes | Cambiar preferencias | Lista agrupada | — | Neutro | Ninguno |

---

## Historial: sistema de diseño v2

Fuente única: `src/theme/index.ts`. Ningún componente nuevo usa colores, medidas ni sombras sueltas.
Estado: **incremento 1** (sistema visual + bienvenida + "Ahora") implementado y revisado con capturas.
El resto de pantallas hereda los tokens v2 y el modo oscuro, pero su recomposición es el incremento 2 y 3
(ver `docs/PANTALLAS_CHECKLIST.md`).

## Skills aplicadas (y cómo se adaptaron a React Native)

| Skill | Qué se tomó | Adaptación |
|---|---|---|
| `taste` | Formato de brief "decisión concreta → razón" y rechazo de adjetivos vacíos. | Su flujo necesita una URL; **no hay `docs/referencias/`**, así que no se analizó ningún sitio. Los briefs de abajo usan su formato. |
| `ui-skills-root` | Elegir el mínimo de skills por tarea (≤ 3). | No se ejecutó su CLI (`npx ui-skills`): habría que instalarla y las skills locales ya cubren el caso. |
| `baseline-ui` | Solo transform/opacidad; pausar bucles fuera de pantalla; `tabular-nums` en datos; una acción protagonista; estados vacíos con una acción; nada de sombras grises genéricas. | Sus reglas de stack web (Tailwind, `motion/react`, "sin degradados") **no aplican**: el stack es RN + Reanimated y el addendum pide degradados por dominio. |
| `fixing-motion-performance` | Mecanismo más barato; sin blur animado; one-shot antes que bucles; capas promovidas con mesura. | Todo en worklets de Reanimated (hilo de UI). Brillos con degradado radial SVG estático cuya opacidad se anima, nunca blur. |
| `fixing-accessibility` | Nombres accesibles, decorativos ocultos, contraste medido, movimiento reducido, toasts no como única vía. | Contraste verificado por prueba automática en ambos temas (84 pares). Robot decorativo oculto al lector salvo cuando comunica (preocupado). |
| `fixing-metadata` | — | Pendiente para el cierre (incremento 3); la app ya tiene `app.json` con nombre, descripción, idioma y color. |

## Color

Claro y oscuro están **diseñados por separado** (no invertidos). `palette.white` significa "superficie" en ambos temas;
`ink.inverse` es texto sobre color sólido. Así toda la app adopta el modo oscuro sin tocar cada pantalla.

| Token | Claro | Oscuro |
|---|---|---|
| Fondo (`warm`) | `#F8FAF8` | `#0A2630` |
| Superficie (`white`) | `#FFFFFF` | `#103340` |
| Superficie 2 (`slatePale`) | `#EEF3F3` | `#16424F` |
| Texto (`ink.text/title`) | `#0D3946` | `#F2F8F7` |
| Texto secundario (`ink.muted`) | `#56657A` ¹ | `#A9C0C6` |
| Borde (`line`) | petróleo 8 % | blanco 8 % |
| Menta / menta fuerte | `#5ED9B5` / `#21AD8B` | `#5ED9B5` / `#21AD8B` |
| Coral | `#F28C7A` | `#FF9C8A` |
| Lavanda | `#8B7CF6` | `#A99DFF` |
| Amarillo / ámbar | `#F4C95D` | `#F6D27A` |
| Azul cielo | `#63B3FF` | `#7CC2FF` |
| Éxito / alerta | `#33C27F` / `#E86C6C` | `#4AD395` / `#FF8585` |
| Acción principal (`gradients.primary`) | `#174A59 → #0D5E6D` | `#1F6E7E → #13808F` ² |

¹ El `#64748B` del addendum da 4.4:1 sobre lavanda pálida; se usa `#56657A` para texto (ajuste mínimo).
² El petróleo del addendum casi desaparece sobre el fondo oscuro; se aclaró lo mínimo para que el texto blanco mantenga ≥ 4.5:1.

**CTA coral:** el degradado `#F28C7A → #FF776B` con texto blanco da 2.4:1. En lugar de oscurecer el coral hasta perder
la marca, el texto pasa a petróleo profundo `ink.onCoral #0D3946` (≥ 5:1) y el extremo claro sube a `#F7A08F`.

**Lenguaje por dominio** (`domains` en el tema: degradado, acento, texto y tono):
agua azul, medicamento crema→coral, ánimo lavanda, sueño índigo, actividad menta, **seguimiento ámbar**
(sin confirmar, existencias, avisos). El rojo queda reservado a emergencias reales.
Las tarjetas héroe usan las dos primeras paradas del degradado (donde se apoya el texto); la tercera,
más intensa, se reserva para pantallas completas (agua).

**Contraste:** `src/theme/__tests__/contrast.test.ts` carga el tema en claro y en oscuro y mide 84 pares reales
(texto/fondo, botones, tonos, texto de cada dominio sobre sus paradas). Todos ≥ 4.5:1 (texto) o ≥ 3:1 (iconos).

**Cómo se aplica el modo oscuro:** el tema lee `Appearance.getColorScheme()` al arrancar, antes de crear los
`StyleSheet`, y todos los tokens toman su valor oscuro. Límite conocido: si el usuario cambia claro/oscuro con la app
abierta, se aplica al volver a abrirla. Para cambio en caliente habría que migrar los estilos a un hook `useTheme()`.

## Tipografía (Manrope)

| Variante | Tamaño / interlínea | Peso | Uso |
|---|---|---|---|
| heroXL | 56 / 60 | 800 | Hora del medicamento, vasos. Tope de escalado ×1.3 |
| heroL | 40 / 44 | 800 | Porcentajes. Tope ×1.4 |
| display | 32 / 38, −0.8 | 800 | Títulos de bienvenida y de la tarjeta héroe |
| h1 | 28 / 34 | 800 | Saludo |
| h2 | 22 / 28 | 700 | |
| h3 | 20 / 26 | 700 | Títulos de sección |
| body | 18 / 26 | 500 | |
| secondary | 16 / 22 | 500 | |
| caption | 14 / 20 | 600 | Auxiliar |
| eyebrow | 12 / 16, mayúsculas, +1.4 | 800 | Solo complementario |

Todo escala con el sistema (tope ×2) y con el tamaño elegido en Accesibilidad.

## Medidas

- **Espaciado (4 pt):** 4, 8, 12, 16, 20, 24, 32, 40. Margen lateral `screen` 24, separación entre secciones `section` 28.
- **Radios:** tarjeta 24, héroe 32, botón 20, input 18, hoja inferior 28, icono 16/20, chips redondos.
- **Alturas (`touch`):** principal 60, adulto mayor 72, secundario 52, chip 44, toque mínimo 48, fila de hora 56, barra de pestañas 72 + área segura.
- **Sombras:** `soft` = 0 2 6 petróleo 6 % + 0 10 28 petróleo 10 %; `hero` = 0 18 40 petróleo 18 %; brillo de botón del color de su dominio (0 10 20, 28 %). En oscuro la sombra es negra.
  Android: toda superficie lleva además `border.hairline` (1 px) para no depender de la sombra de color.

## Movimiento (`motion`)

Objetivos de diseño, **no mediciones**: feedback 160 ms, cambio de componente 280 ms, conteo 700 ms, resorte de presión
(16/260) y resorte suave de aterrizaje (11/140). Solo transform y opacidad, en el hilo de UI. Los bucles se detienen
fuera de foco (`useIsFocused`) y con "reducir movimiento".

`Appear` (entrada escalonada) se reescribió con un valor compartido: la versión anterior usaba una animación
`entering` personalizada que **Reanimated no soporta en web** (lo avisaba en consola) y aparecía sin retardo.

## El robot (`src/components/robot`) · V4.2

- **Siempre la imagen real** (`assets/branding/buddy-robot.png`, 792×887, transparente); el robot dibujado en código se
  eliminó. `BuddyRobot({ size, shape: 'circle' | 'square', accessibilityLabel })` lo pone dentro de un marco con
  degradado menta muy claro `#EFFCF7` → turquesa claro `#B9EEE4` (oscuro: `#1B3A4E` → `#12283A`); nunca sobre blanco puro.
  Ocupa el 78 % del alto del marco: nunca se corta.
- **Dónde aparece:** ícono de la app, splash nativo y portada de carga (`buddy-splash.png`), presentación 1 (dentro de su
  ilustración), botón central de BUDDY y encabezado del chat. Ajustes > Acerca de muestra el ícono. En el resto de
  pantallas (estados vacíos, registro, adulto mayor, permisos) lo reemplaza un `IconTile` del dominio.
- **Limitación:** el original del dueño es pequeño (≈ 112 px); a tamaño grande se ve suave. Falta la exportación en alta.

## Primera apertura · V4.2

| Pantalla | Fondo | Elementos | Movimiento |
| --- | --- | --- | --- |
| Carga | petróleo `#3F8676` → `#174B55` → `#082C3E` → `#052338` (diagonal) | 8 destellos de 4 puntas, ícono 188, "BUDDY" 42 negrita del sistema, "Siempre contigo" 19, barra 6 × 300 con relleno `#1E9FA6` → `#5ED9B5` y punta `#D9FFF4` | ícono con resorte 11/140 (rebote leve), destellos titilan 1,7–2,5 s, salida: ícono ×1,08 y fundido 300 ms |
| Presentaciones 1–4 | banda tintada izq → der (1 `#6FE6E2`→`#D4CBF9`, 2 `#A3EDCF`→`#C4C3F8`, 3 `#C6BBFB`→`#FBA694`, 4 `#9FB7DA`→`#A6CFEE`) fundida con el tono de arriba y de abajo | barra "Etiqueta n de 4" · "Omitir"; ilustración real; título 34/40 `#174A59`; texto 18 `#3E4F5C`; puntos; "Siguiente" | deslizar con el dedo; fondo que cambia por opacidad; paralaje ×0,42; flotación 2,6 s; título y texto escalonados (60 / 120 px); detalle propio (destellos, aviso que late, latido doble, mundo que se mece) |
| Bienvenido | encabezado `#1A4681` → `#1F72A2` → `#19A6A8`; pantalla `#ECF3FA` → `#E8FAF0` | "Bienvenido" 36 blanco; tarjeta radio 28 con la pregunta y 3 filas (icono en círculo de color, título, subtítulo) | tarjeta entra desde abajo (48 px, resorte suave); selección con borde y check que crece |

- **Botón turquesa (`variant="mint"`):** `#0C939B` → `#14A3A6`, texto **blanco** a 20 px en negrita (letra grande WCAG):
  3,1:1, sobre el mínimo de 3:1. El turquesa medido en la referencia (`#26B5BB`) daba 2,4:1 con texto blanco.
- **Oscuro:** las ilustraciones (de fondo claro) van en una tarjeta redondeada de radio 36 con borde blanco al 12 %.
- **Reducir movimiento:** sin rebote, flotación, paralaje ni titileo; solo fundidos.

## Modo oscuro · V4.2 (noche azul, sin verde de fondo)

| Token | Valor |
| --- | --- |
| Fondo | `#0B1622` |
| Superficie 1 / 2 | `#13212E` / `#1B2B3A` |
| Borde | blanco al 8 % |
| Texto principal / secundario | `#F3F6F8` / `#A7B4C2` |
| Acento principal (botón principal, BUDDY, "todo bien") | turquesa `#2BC4B4` con texto `#062A2A` (7:1) |
| Medicamentos · salud mental · sueño · agua · actividad | coral `#FF9C8A` · lavanda `#A99DFF` · índigo `#8C93FF` · cielo `#7CC2FF` · menta `#5ED9B5` |
| Alertas · éxito · peligro | ámbar `#F6D27A` · `#4AD395` · `#FF8585` |
| Fondos de tarjeta de dominio | el color del dominio al 16 % sobre la superficie (`mintPale` `#1F3E44`, `coralPale` `#39353D`, …) |
| Iconos blancos sobre menta | `mintStrong` `#1F9E91` (3,3:1), `mintDeep` `#178C6F` |
| Degradados | carga: petróleo propio; presentaciones: tintes oscuros por pantalla; Bienvenido: `#132A4D` → `#15405C` → `#0F6B70` |

El resto de botones usa superficie 2 con texto claro. Contraste verificado en `src/theme/__tests__/contrast.test.ts`.

## Modo oscuro · V5 (noche tinta, marca pervinca; reemplaza la tabla V4.2)

En V4.2 todo lo accionable seguía en turquesa y la app se veía verde. En V5 el verde queda **solo** para lo que significa
"bien" (`status.ok`, dominio de actividad, éxito); la marca es la luz azul de la noche.

| Token | Valor |
| --- | --- |
| Fondo / superficie 1 / 2 | `#0A0E1A` / `#131A2B` / `#1B2438` |
| Borde | pervinca `rgba(170,185,255,0.10)` |
| Texto principal / secundario / terciario | `#F2F4FA` (17,5:1) / `#A9B2C7` (8,2:1) / `#7F89A1` (4,9:1) |
| Marca (`primary`, `accent`, `focus`) | pervinca `#8C9EFF`; degradado principal `#8C9EFF` → lavanda `#A58BFF` con texto `#0B1030` (7,5:1 / 6,8:1) |
| Tono "mint" (chips, tonales, pestaña activa, checks) | ahora pervinca: fondo `#1E2747`, texto `#A9B8FF` (7,7:1); `mintStrong` `#5A68E0` y `mintDeep` `#4C5BD4` con blanco (4,7:1 / 5,6:1) |
| Enlaces (`ink.info`) | `#A9B8FF` (9,1:1 sobre superficie) |
| Contacto | `#8C9EFF` sobre `#1E2747` |
| Degradados | carga: luz índigo `#3D4FA3` sobre el mismo petróleo del splash (`#062639`); Bienvenido `#121A3E` → `#22286A` → `#3A2F7E`; cuenta `#1C2660` → `#0E1428`; Plus `#10153A` → `#4C3D9E` |

**Claro (V5):** el degradado principal pasa a turquesa → cobalto `#0E7C8A` → `#1F4C8F` (blanco 4,9:1 / 8,4:1) y el CTA
`mint` a `#0E8C99` → `#2367D1` (blanco 4,0:1 / 5,3:1, antes 3,1:1). En oscuro el CTA `mint` usa el degradado de marca.

**Movimiento V5:** hover en todo `PressableScale` (sube 1 px y se ilumina 6 % en oscuro / sombrea 4 % en claro, 150 ms);
flecha con empujoncito en el CTA del carrusel y rebote al pasar a "Empezar"; BUDDY flota sobre un halo en Bienvenido;
dos ondas salen del ícono mientras carga; los vacíos abren dos anillos una vez; enviar se enciende con resorte al escribir.
Con "reducir movimiento" nada de esto se mueve.

## Componentes nuevos o ampliados

`Button` (+ `tonal` por tono, `white`, tamaños `elder` 72 / `lg` 60 / `md` 52, `stacked`, `shine`, `textColor`) ·
`Card` (borde de 1 px por defecto, relleno 20) · `BottomTabBar` (barra flotante de vidrio translúcido, radio 28,
margen 16, píldora menta con resorte y rebote del icono; la usan ambos roles) · `Toast` (+ acción "Deshacer") ·
`Appear` (+ `delay`) · `ScreenContainer` (+ capa `background`) · `SoftEllipse` (brillo radial SVG) · `BuddyRobot`.

## Briefs (formato taste) y revisión

### Bienvenida
- **Sensación:** te reciben; alguien llega volando a acompañarte.
- **Héroe:** robot de 220–320 dp (34 % de la altura), solapando la zona del título.
- **Detalle firma:** estela de fantasmas y destello menta al aterrizar; orbes que derivan.
- **Color:** fondo menta `#FBFDFB → #E9FAF4`; CTA coral con texto petróleo.
- **Movimiento:** coreografía ~3.2 s, saltable; luego vaivén.

Rondas: (1) texto visible durante el vuelo (bug de `entering` en web), cabeza contra el borde, brillo del CTA como
franja dura, orbe coral manchando el texto, título en 1 línea → (2) corregido; verificado fotograma a fotograma
(`bienvenida-vuelo-a/b/c`). Prueba de 3 s (revisión de jerarquía, no prueba con usuarios): "Comenzar" es la única protagonista.

### Adulto mayor — "Ahora"
- **Sensación:** calma; una sola cosa que hacer, sin listas.
- **Acción principal:** botón de 72 dentro de la tarjeta héroe.
- **Héroe:** tarjeta ≥ 300 con degradado del dominio y el robot de 120 asomando arriba a la derecha.
- **Detalle firma:** hora o cantidad en numeral XL; "Más tarde hoy" como tira de chips con barra de color.
- **Movimiento:** entrada escalonada; el robot saluda, piensa, se preocupa (toma sin confirmar) o celebra (día completo).

Lógica en `src/features/now/pick.ts` (con prueba): medicamento en ≤ 60 min o sin confirmar → agua hasta la meta → chequeo
de ánimo → próxima toma → día completo. "Ya lo tomé" usa la misma acción que el recordatorio (`confirmedByUser`), sin
celebración para no incentivar registros incorrectos; "Ver opciones" abre posponer / no lo tomé. El vaso de agua se puede
deshacer desde el toast. "Llamar a Laura" es demostración y lo dice; "Pedir ayuda" abre la hoja de emergencia existente.

Rondas: (1) el robot pisaba el nombre, botones de ayuda en 2 líneas que tapaban el héroe en 360×740, barra de
pestañas blanca en oscuro (texto invisible), etiqueta demo apretada → (2) corregido, pero en 360×740 la acción principal
quedaba bajo el pliegue → (3) el título usa todo el ancho y el saludo se compacta en pantallas ≤ 780: acción visible.

## Capturas

`docs/capturas/antes/` (v1, mismo servidor, mismo día) y `docs/capturas/despues/` (v2): bienvenida y "Ahora" en
390×844 y 360×740, claro y oscuro, fotogramas del vuelo, toasts, "reducir movimiento" y barrido oscuro de las otras
15 pantallas (`despues/oscuro/`). La v1 no tenía modo oscuro: su captura "oscuro" se ve clara.

**No verificado aún:** texto al 200 % (en web no se puede forzar la escala de fuente del sistema; hay que probarlo en
el teléfono con el tamaño de letra al máximo), rendimiento real (FPS) y hápticos, que solo existen en el dispositivo.
