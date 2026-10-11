# BUDDY — Sistema de diseño v2

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

## El robot (`src/components/robot`)

- Recurso: `assets/branding/buddy-robot.png` (896×1024, fondo transparente). Generado con un script de Pillow desde
  `buddy-logo.png`: silueta por cierre morfológico (para que el cuerpo blanco no se vacíe), color-a-alfa en el
  contorno y borrado de la sombra del suelo por color (gris neutro vs. blanco cálido). Revisado sobre claro y oscuro.
  **Limitación:** el robot original solo mide 112×128 px, así que a 300 dp se ve suave. Se necesita una exportación
  transparente de alta resolución (o por capas) del dueño.
- `BuddyRobot` props: `size, mood (idle|wave|think|talk|celebrate|worry), flying, glow, shadow, sparkles, entrance,
  skipEntrance, tapFlip, onPress, accessibilityLabel`. Punto único de reemplazo: `ROBOT_SOURCE` + `RobotArt`.
- Idle: vaivén en 2.8 s, deriva en 5 s, inclinación ±2.5° en 4.2 s desfasada, sombra que se achica al subir,
  propulsión menta .35–.6 en sincronía, latido coral 1→1.15 cada 1.6 s (coordenadas en `HEART`), 6 destellos de 4 puntas
  (1.6–2.4 s), saludo cada 7 s.
- Entrada de bienvenida (~3.2 s, una vez por sesión, saltable con un toque): vuelo curvo desde abajo a la derecha
  (x ease-out, y ease-in-out con arco), inclinación +18°→−6°, escala .6→1.05, 3 fantasmas (.25/.15/.08),
  aterrizaje con resorte 11/140, squash .94/1.04/1, destello menta; texto palabra a palabra desde 1.9 s.
- Estados: celebrate (salto + voltereta 360° en 700 ms + destellos + háptico), think (tres puntos), talk (anillo + ecualizador),
  worry (inclinación lenta y serena). Con imagen plana se mueve el conjunto; ojos y brazos no se animan.
- Movimiento reducido: sin vuelo ni bucles; aparición de 320 ms y latido muy leve.
- Rendimiento: `renderToHardwareTextureAndroid` y `shouldRasterizeIOS` en el contenedor; máximo 6 destellos y 3 fantasmas; sin blur.

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
