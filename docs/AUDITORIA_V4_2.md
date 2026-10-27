# Auditoría V4.2 · Primera apertura igual al diseño del dueño

Rama `v4`. Referencias: `docs/referencias/primera-apertura/` (siete capturas pequeñas, 121–155 px de ancho). Capturas de la app con `scripts/capture/v4_2-primera-apertura.mjs` (Playwright, 390×844, escala 2). Comparaciones lado a lado en `docs/capturas/v4_2/`.

Skills usadas en esta ronda: **playwright-cli** (capturas y comparaciones), **impeccable** (crítica visual frente a la referencia), **baseline-ui** (alineación, jerarquía y espaciado), **fixing-accessibility** (contraste, áreas táctiles, letra máxima, reducir movimiento), **fixing-motion-performance** (solo transform y opacidad) y **fixing-metadata** (ícono y splash nativo).

## Paso 0 · Lo que se ve en cada referencia

Colores medidos con Pillow sobre `pantalla.png` (promedio 3×3). Las capturas del dueño están comprimidas en horizontal (proporción 1 : 2,7 frente a 1 : 2,16 del iPhone), así que las posiciones se leen en % de alto.

### 00 · Ícono
- Cuadro redondeado (radio ≈ 22 % del lado) con el robot BUDDY completo: casco blanco, visor petróleo con ojos felices, orejas y brazos turquesa, corazón coral en el pecho, saludando con la mano derecha.
- En la referencia el cuadro es blanco; el README pide fondo **menta muy claro → turquesa claro**, no blanco.
- Debajo, en la captura de carga, "BUDDY" en blanco. No hay archivo independiente del ícono: se recortó de la pantalla de carga.

### 01 · Carga
- Fondo degradado petróleo oscuro: `#092A3D` arriba a la izquierda, `#438C79` (verde azulado) arriba a la derecha, `#062639` en el centro y abajo.
- Destellos de cuatro puntas blancos, pequeños, repartidos (6–8), más uno grande arriba a la derecha.
- Al 30–55 % de alto: el ícono (cuadro redondeado con el robot), de ≈ 45 % del ancho.
- "BUDDY" en blanco, muy grueso (≈ 34 pt), y "Siempre contigo" en blanco al 80 %, regular.
- Al 88 %: barra de progreso fina (≈ 6 pt) a 75 % del ancho, con relleno turquesa → menta y punta más clara.

### 02 · Compañía (presentación 1)
- Barra superior en una fila: "Compañía" y **"1 de 4" en negrita** a la izquierda; "Omitir" a la derecha. Nada encima.
- 14–55 %: ilustración a todo el ancho, robot BUDDY flotando sobre una base circular azul con haz de luz, destello grande blanco a la izquierda. Fondo: turquesa intenso a la izquierda (`#13E0E1`), lavanda a la derecha (`#C6BEFA`), menta pálido arriba (`#C6F6F4`).
- 57 %: "Tu compañero diario" en dos líneas, negro petróleo, muy grueso (≈ 32 pt).
- 66–80 %: párrafo gris oscuro (≈ 15 pt).
- 87 %: botón "Siguiente", píldora a casi todo el ancho, turquesa (`#26B5BB`) con brillo; texto oscuro en la captura (la ronda pide blanco).
- Fondo de la mitad inferior: `#E8F7F0` (menta casi blanco).

### 03 · Cuidado diario (presentación 2)
- Barra: "Cuidado diario **2 de 4**" · "Omitir".
- Ilustración: celular claro con 6 iconos de colores (píldora roja, gota azul, campana coral, pastillero verde, corazón con pulso, cápsula lila) y un reloj azul grande con burbuja de chat "···". Sin robot.
- Fondo: menta (`#A9EED2`) a la izquierda, lavanda claro (`#BDC4FB`) a la derecha, casi blanco arriba.
- "Tus rutinas bajo control", párrafo, "Siguiente". Fondo inferior `#E9F5F1`.

### 04 · Bienestar (presentación 3)
- Barra: "Bienestar **3 de 4**" · "Omitir".
- Ilustración: corazón degradado coral → morado con línea de pulso, planta en maceta, burbujas con caras (feliz amarilla, triste naranja) y luna turquesa, destello blanco. Sin robot.
- Fondo: lavanda (`#C3B7FD`) a la izquierda, durazno → coral (`#FCDED4` → `#FC937F`) a la derecha.
- "¿Cómo te sientes hoy?", párrafo, "Siguiente".

### 05 · Familia (presentación 4)
- Barra: "Familia **4 de 4**" · "Omitir".
- Ilustración: globo terráqueo azul con continentes verdes, casas, pines con corazón, círculo con dos personas, red de líneas y cinta coral con moño abajo. Sin robot.
- Fondo: azul (`#2C5CA1`, el propio globo) y azul claro → lavanda (`#ABC1DA`, `#9E96CD`), cielo `#AEE0FB` a la derecha.
- "Cerca de quienes más quieres" en tres líneas, párrafo, **"Siguiente"** (no "Crear cuenta").

### 06 · Bienvenido
- Encabezado (0–15 %) con degradado azul `#1A4681` → azul petróleo `#1F72A2` → turquesa `#19A6A8`; "Bienvenido" en blanco, muy grueso, centrado.
- Tarjeta blanca redondeada, superpuesta al final del encabezado: "¿Quién va a usar BUDDY en este celular?" centrado y en negrita; dos filas, cada una con icono en círculo de color pálido (personas turquesa; corazón rojo), título en negrita y subtítulo gris.
- Fondo de la tarjeta y la pantalla: azul muy pálido → menta (`#ECF3FA` → `#E8FAF0`).
- Abajo: "Crear cuenta" (píldora turquesa con brillo) e "Iniciar sesión" (píldora blanca con borde gris).

## Paso 0 · Diferencias de la versión actual (antes)

Capturas: `docs/capturas/v4_2/antes/` · comparación de las seis: `docs/capturas/v4_2/antes/todas-comparacion.png`.

| Pantalla | Diferencias con la referencia |
| --- | --- |
| 01 Carga | El cuadro con el robot es menta en vez de un ícono claro con degradado; robot vectorial "dormido" con "Zz"; "BUDDY" con letras espaciadas (en la referencia no); texto "Cargando las letras" bajo la barra (la referencia no tiene texto); barra más baja que en la referencia. |
| 02 Compañía | Robot dibujado en código, más pequeño y sin su base circular ni haz de luz; píldora verde plana debajo (no existe); fondo menta pálido sin turquesa ni lavanda; "1 de 4" centrado y sin negrita; título más pequeño y en una línea; texto oscuro en "Siguiente". |
| 03 Cuidado diario | Muestra el robot (debe mostrar el celular con iconos y el reloj); fichas de iconos inventadas (calendario, reloj, píldora); misma píldora verde; fondo sin degradado. |
| 04 Bienestar | Robot con ojos de corazón en vez del corazón con pulso, planta y burbujas; fichas inventadas; fondo menta en vez de lavanda y coral. |
| 05 Familia | Robot en vez del globo con casas y cinta; "Crear mi cuenta" (coral) y "Ya tengo cuenta" en lugar de "Siguiente", que debe llevar a Bienvenido. |
| 06 Bienvenido | Encabezado sin degradado azul → turquesa y "Bienvenido" en petróleo en vez de blanco; botón redondo de apariencia arriba a la derecha (no existe en la referencia); iconos de las opciones en cuadros en lugar de círculos; radios a la derecha (la referencia no los muestra); "Crear cuenta" con texto oscuro y flecha. |
| Todas | En el iPhone flota un botón azul de engranaje que tapa "Omitir": es el **botón de herramientas de Expo Go (SDK 58)**, no código de BUDDY (ver Paso 4). |

## Paso 1 · Recursos (imágenes reales, nunca dibujadas)

| Recurso | Origen | Tamaño | Estado |
| --- | --- | --- | --- |
| `assets/branding/buddy-robot.png` (+ `@max`) | `assets/images/splash-icon.png` (el mismo robot de `00-icono/robot.png`, pero 1024 px frente a 81 px) | 792 × 887 | **Provisional**: el original del dueño es pequeño (≈ 112 px ampliado); se ve suave de cerca. El borde superior derecho del casco era blanco sobre blanco y se completó con su elipse. |
| `assets/branding/buddy-icon-source.png` | robot sobre degradado menta `#E2FAF2` → turquesa `#A5E8DE`, con sombra suave | 1024 × 1024, sin alfa | Provisional (por el robot). |
| `assets/branding/buddy-icon-foreground.png` / `-background.png` | ícono adaptable de Android, robot dentro del 62 % central | 1024 × 1024 | Provisional (por el robot). |
| `assets/branding/buddy-splash.png` | el ícono con esquinas redondeadas (23 %) y fondo transparente, para el splash y la carga | 1024 × 1024 | Provisional (por el robot). |
| `assets/onboarding/companero.png` | banda completa de `02-companero/pantalla.png` (y 44–236), alfa que se funde arriba y abajo | 146 × 192 | **Provisional, baja resolución.** |
| `assets/onboarding/rutinas.png` | `03-rutinas` (y 42–221) | 151 × 179 | **Provisional, baja resolución.** |
| `assets/onboarding/bienestar.png` | `04-bienestar` (y 42–226) | 144 × 184 | **Provisional, baja resolución.** |
| `assets/onboarding/familia.png` | `05-familia` (y 42–224) | 146 × 182 | **Provisional, baja resolución.** |

Las ilustraciones se usan **con su propio fondo**, fundidas en el degradado de cada pantalla (quitarles el fondo a 150 px dejaba bordes sucios). No se ampliaron: el teléfono las escala al mostrarlas, por eso se ven suaves.

**Necesito del dueño, en alta resolución (PNG ≥ 1200 px de ancho, idealmente con fondo transparente):**
1. Robot BUDDY (el del ícono).
2. Ilustración de Compañía (robot sobre su base circular con haz de luz).
3. Ilustración de Cuidado diario (celular con iconos y reloj).
4. Ilustración de Bienestar (corazón con pulso, planta y burbujas).
5. Ilustración de Familia (mundo con casas, personas y cinta).

Comprobación sobre blanco, fondo de pantalla y `#0D3946`: `docs/diseno/comprobacion/`.

## Paso 2 · Dónde quedó el robot

Siempre la imagen real, dentro de un marco con degradado (nunca sobre blanco, nunca cortado):
ícono de la app y splash nativo, portada de carga, presentación 1 (dentro de su ilustración), botón central de BUDDY,
encabezado del chat y el ícono en Ajustes > Acerca de. Se eliminaron el robot vectorial (`vector.tsx`), el robot de las
pantallas de cuenta (`auth-robot.tsx`) y la galería `/dev/robot`. En estados vacíos, registro, permisos, escáner,
ubicación, Resumen sin datos y la pantalla del adulto mayor lo reemplaza un `IconTile` del dominio; las burbujas del chat
usan un destello; el lanzador flotante (que ya no se monta) usa una campana.

## Paso 3 · Las pantallas frente a la referencia (3 rondas)

| Ronda | Qué se vio | Qué se corrigió |
| --- | --- | --- |
| 1 (`ronda1/todas-comparacion.png`) | Presentaciones y Bienvenido ya coinciden en estructura, color e ilustración. La carga mostraba "BUDDY" en letra serif: la portada se dibuja **antes** de que carguen las fuentes (también en el iPhone). | Letra del sistema en negrita en la carga; ícono a 188 (igual que el splash nativo, para un paso continuo). |
| 2 (`ronda2/`, oscuro y letra máxima) | En oscuro las ilustraciones parecían recortes claros pegados sobre la noche. Con letra máxima, en Bienvenido "Soy administ-rador" se partía. | Oscuro: ilustración en tarjeta redondeada (radio 36). Letra muy grande: las opciones ocultan icono y check, y los textos tienen tope de escala. |
| 3 (`ronda3/`) | Oscuro intencional; ninguna palabra partida; la ilustración se achica con letra grande y el texto se puede desplazar dentro de la presentación. | — |

Comparaciones lado a lado: `docs/capturas/v4_2/ronda2/<pantalla>-comparacion.png` y `todas-comparacion.png`.

Diferencias que quedan, a propósito:
- El texto de "Siguiente" es blanco (lo pide la ronda); en la referencia es oscuro. Para que el blanco cumpla contraste
  el turquesa es un poco más profundo (`#0C939B` → `#14A3A6`) y la etiqueta va a 20 px en negrita.
- La carga muestra en letra pequeña la tarea real del arranque ("Cargando las letras"): BUDDY nunca falla en silencio.
- Las ilustraciones se ven suaves: son las de la referencia, de ≈ 150 px.

## Paso 4 · Engranaje flotante y personalización

- El botón azul de engranaje es la herramienta de **Expo Go (SDK 58)**, no código de BUDDY: no se puede quitar desde la
  app. Se oculta arrancando con `EXPO_NO_DEV_MENU=1 npx expo start …` (ver `docs/PRUEBAS_EN_DISPOSITIVO.md`); en una
  compilación de tienda no existe.
- Se quitó el botón de apariencia de Bienvenido. La personalización vive solo en Ajustes > Apariencia (tema automático,
  claro, oscuro, alto contraste y tamaño de letra con vista previa) y, para el adulto mayor, en Opciones > Apariencia.
- Nuevo: Ajustes > Acerca de > "Ver de nuevo la presentación".

## Paso 5 · Modo oscuro (noche azul)

Tokens en `docs/DESIGN_SYSTEM.md` (sección "Modo oscuro · V4.2"). Capturas de toda la app con
`scripts/capture/v4-screens.mjs` (antes: `docs/capturas/v4/v4_2-antes/`, después: `docs/capturas/v4/v4_2-despues/`, sin
subir al repositorio por tamaño) y comparación curada en `docs/capturas/v4_2/oscuro/antes-despues-1.png` y `-2.png`
(fila de arriba antes, abajo después: Inicio, Novedades, Rutina, Medicamento, Chat, Ubicación, Salud, Ajustes,
Apariencia, Vista de Elis, Adulto mayor, Opciones).

- Antes: fondo petróleo verdoso (`#0A2630`), superficies verde azuladas y botón principal petróleo apagado.
- Después: noche azul neutra (`#0B1622` / `#13212E` / `#1B2B3A`), texto `#F3F6F8` / `#A7B4C2`, turquesa `#2BC4B4` solo en
  el botón principal, BUDDY y "todo bien" (texto `#062A2A`, 7:1).
- Corrección tras revisar: al mezclar ámbar y coral al 16 % sobre la superficie azul las tarjetas de "Atención" y de
  medicamentos se veían grises; se mezclan sobre un oscuro neutro para conservar el tono cálido (`#3B321C`, `#3F2A2A`).
- El control automático no encontró fallas nuevas en oscuro; las que reporta (correo largo con letra 2,0, horas "08:00"
  en Salud con alto contraste y letra 1,3) ya existían antes de esta ronda.

## Paso 6 · Verificación

- `npx tsc --noEmit`: sin errores. `npx expo lint`: sin avisos. `npx jest`: 51 suites, 874 pruebas, todas pasan
  (las pruebas del robot vectorial se eliminaron con él; se agregó la del robot real).
- `npx expo-doctor`: 20/20.
- No se inició el servidor de desarrollo; las capturas usan la exportación web estática.
