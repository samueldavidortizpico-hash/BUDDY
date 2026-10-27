# Auditoría V4.3 · Diseño de nivel profesional

Rama `v4`. Capturas con `scripts/capture/v4_3.mjs` (Playwright, 390×844 a escala 2; el conjunto `completo` agrega 375 y 360,
alto contraste y letra máxima). Antes: `docs/capturas/v4_3/antes/`. Después: `docs/capturas/v4_3/despues/`.
No existen `docs/referencias/login/` ni `docs/referencias/plus/`: el criterio de fidelidad no aplica a estas pantallas.

Skills por fase: **impeccable** (dirección, crítica y pulido), **playwright-cli** (capturas y comparaciones),
**baseline-ui** (espaciado, alineación, jerarquía y estados), **fixing-accessibility** (contraste, áreas táctiles,
etiquetas, lector de pantalla), **fixing-motion-performance** (solo transform y opacidad) y **graphify** (duplicados).

## Rúbrica (Paso 7)

De 1 a 5: **J** jerarquía (lo principal se entiende en 3 s) · **E** espaciado y alineación · **C** color con significado ·
**T** tipografía · **M** reacciones y movimiento · **A** accesibilidad (contraste y tamaños). Mínimo 4 en cada criterio.

## Paso 0 · Diagnóstico honesto (antes)

| Pantalla | Qué se ve poco profesional y por qué | J | E | C | T | M | A |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Iniciar sesión | Formulario genérico sin presencia de marca; encabezado centrado de herramienta ("Inicia sesión / Soy administrador"); tres botones a todo el ancho con el mismo peso ("Olvidé mi contraseña" como botón grande, "Crear una cuenta nueva" tonal); la mitad inferior vacía; campos sin estado de foco visible ni validación; sin reacción de error. | 2 | 3 | 2 | 3 | 2 | 4 |
| Crear cuenta | Formulario largo sin pasos ni medidor de fortaleza; "Leer términos" y "Leer privacidad" como dos botones pesados; "Ya tengo cuenta" compite con "Crear cuenta"; casilla genérica. | 2 | 3 | 2 | 3 | 2 | 4 |
| Recuperar contraseña | Tres botones apilados (el principal deshabilitado en gris parece roto); "Crear una cuenta nueva" no pertenece a esta tarea; sin estado de confirmación diseñado. | 2 | 3 | 2 | 3 | 2 | 3 |
| BUDDY Plus | No hay planes: viñetas "•" de texto, precios "Por definir", ningún botón de elegir; tarjeta menta plana; no invita a pagar ni explica lo gratuito. | 1 | 3 | 2 | 3 | 1 | 4 |
| Inicio | La organización es buena, pero la tarjeta "Atención" es amarillo saturado de fondo completo; "No quedan tomas hoy" queda tapado por el botón central. | 4 | 3 | 3 | 4 | 3 | 4 |
| Rutina | Pantalla muy vacía; botón flotante "Agregar" petróleo grande que pesa más que el contenido. | 3 | 3 | 3 | 4 | 3 | 4 |
| Detalle de medicamento | Título partido en dos líneas centrado con "Editar" apretado; "Existencias" con fondo ámbar completo. | 3 | 3 | 3 | 3 | 3 | 4 |
| Salud | Barras de ánimo lavanda saturadas todas al máximo (decoran sin informar); tarjetas sin héroe. | 3 | 4 | 3 | 4 | 3 | 4 |
| Ubicación | Correcta pero plana; icono lavanda grande sin relación con el dominio de ubicación. | 3 | 4 | 3 | 4 | 3 | 4 |
| Chat | Chips de acciones con bordes de seis colores distintos (arcoíris); la bienvenida no tiene jerarquía. | 3 | 4 | 2 | 4 | 3 | 4 |
| Ajustes | Lista ordenada y clara (lo que le gusta al dueño); iconos de colores vivos sin contenedor de fondo suave. | 4 | 4 | 3 | 4 | 3 | 4 |
| Adulto mayor | Clara y grande; la tarjeta ámbar de fondo completo es demasiado fuerte para todo el día. | 4 | 4 | 3 | 4 | 3 | 4 |

Reacciones en general: los botones escalan, pero no se oscurecen al presionar, no tienen estado de éxito y el cargando
cambia el ancho; los campos no tienen halo de foco, temblor de error ni check de formato válido; no hay control segmentado
con píldora deslizante ni interruptor animado propio.

### Planes y rol de enfermera (estado real)

- `src/domain/entitlements.ts` solo conoce `free | plus`, sin precios ni planes Salud y Familiar.
- `EntitlementService` y el adaptador de RevenueCat existen (solo claves públicas; sin productos configurados).
- Hay un interruptor de prueba "Plus" en Ajustes > Avanzado.
- **Rol de enfermera: no existe.** `Role = 'caregiver' | 'elder'`; Bienvenido muestra la opción, pero entra como cuidador.
- **Plan Familiar** (varios familiares con roles, turnos, notas, vista de familia): no existe. Solo hay invitaciones de
  "ver" o "administrar" en `src/domain/invites.ts`.
- La Fase 4 de V4.1 no está escrita en `docs/` ni en `DECISIONS.md`: se implementa según lo que describe este prompt.

## Paso 7 · Puerta de calidad (después)

Capturas en `docs/capturas/v4_3/despues/` (390 × 844, claro y oscuro). Desbordes: `scripts/check-overflow.mjs` sin
fallas en 15 pantallas a 390 y 360, letra normal y 200 %, claro, oscuro y alto contraste. "Antes → después" por criterio.
La fidelidad a referencias no aplica (no hay `docs/referencias/login/` ni `plus/`).

| Pantalla | Qué se corrigió | J | E | C | T | M | A |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Iniciar sesión | `AuthShell`: degradado con dos luces, robot real de 72, "BUDDY" Display y línea por rol; tarjeta que sube con chip de rol y "Cambiar"; "¿Olvidaste tu contraseña?" a la derecha, "Entrar", separador "o" y "Crear cuenta" de borde; espera visible tras varios intentos. Ronda 2: ya no asoma una franja petróleo bajo la tarjeta. | 2→5 | 3→4 | 2→4 | 3→5 | 2→4 | 4→4 |
| Crear cuenta | Indicador de pasos, campos con icono, medidor de fortaleza animado, casilla propia con enlace. | 2→4 | 3→4 | 2→4 | 3→5 | 2→4 | 4→4 |
| Recuperar contraseña | Un campo y un botón; confirmación diseñada con "Volver a iniciar sesión"; sin "Crear cuenta". | 2→5 | 3→4 | 2→4 | 3→5 | 2→4 | 3→4 |
| BUDDY Plus | Encabezado Plus, Mensual/Anual, tres planes con precio tabular y beneficios con ejemplos reales, recomendado con borde degradado y brillo, comparación, confianza y botón fijo. Ronda 2: el aviso del plan de prueba ya no se dispara tras cerrar la pantalla. | 1→5 | 3→4 | 2→4 | 3→5 | 1→5 | 4→4 |
| Inicio | Héroe de estado con el fondo suave del estado (no amarillo saturado); una fila de novedades. | 4→4 | 3→4 | 3→4 | 4→4 | 3→4 | 4→4 |
| Rutina | Sin franja lateral; fila que escala 0,98 y oscurece 4 %; "Agregar medicamento" secundario en lugar del botón petróleo grande. | 3→4 | 3→4 | 3→4 | 4→4 | 3→4 | 4→4 |
| Detalle de medicamento | El nombre es el héroe de la tarjeta (ya no se parte junto a "Editar"); Existencias neutra con el ámbar en el icono y el estimado; "Ya lo tomó" en una línea. | 3→4 | 3→4 | 3→4 | 3→4 | 3→4 | 4→4 |
| Salud | Barras de 14 px sobre su riel en lugar de bloques lavanda a todo el ancho. | 3→4 | 4→4 | 3→4 | 4→4 | 3→4 | 4→4 |
| Ubicación | Icono en el dominio de ubicación; textos sin "(Fase 5)" ni "(Fase 2)". | 3→4 | 4→4 | 3→4 | 4→4 | 3→4 | 4→4 |
| Chat | Seis acciones en una tarjeta neutra con filas; el color de cada dominio en su icono (sin arcoíris); saludo alineado como título. | 3→4 | 4→4 | 2→4 | 4→4 | 3→4 | 4→4 |
| Ajustes | Iconos en su contenedor suave; Cuenta sin "Supabase". | 4→5 | 4→4 | 3→4 | 4→4 | 3→4 | 4→4 |
| Adulto mayor | "Ahora" con el fondo suave de medicamentos; botones de 72 y 64. | 4→5 | 4→4 | 3→4 | 4→5 | 3→4 | 4→5 |
| Plan · Familia · Enfermera (nuevas) | Enfermera, ronda 2: el botón "Administrada" baja bajo el nombre (antes lo partía en tres líneas) y "Sin avisos" usa check menta en vez de campana ámbar. | —→4 | —→4 | —→4 | —→4 | —→4 | —→4 |

**Límites honestos.** "M" (movimiento) se verificó en código y pruebas (`PressableScale`, `Appear`, `CountUp`, resorte
15/300, solo transform y opacidad), no a 60 fps en un celular de gama media: queda en `docs/PRUEBAS_EN_DISPOSITIVO.md`.
El lector de pantalla se revisó por etiquetas y roles en pruebas, no con VoiceOver o TalkBack reales.
