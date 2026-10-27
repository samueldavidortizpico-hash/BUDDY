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
