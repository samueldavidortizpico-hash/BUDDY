# Auditoría V4 de BUDDY

Ronda V4 (rama `v4`, desde `main` en `c3d5a5f`). Cada fallo se reproduce antes de corregirlo, con su causa raíz y la
evidencia del después. **Confirmado** = reproducido con prueba o captura. **Hipótesis** = mecanismo probable, sin reproducir.

Herramientas de esta máquina: Codex CLI 0.163 (alcanzó su límite de uso a mitad de la Fase 1; ver más abajo), OpenSpec
1.14, graphify. **No hay `adb` ni emulador de Android**, así que nada se verificó en Android; lo nativo queda en
`docs/PRUEBAS_EN_DISPOSITIVO.md`.

La auditoría BMAD no estaba en `docs/`. Se recuperó de la transcripción de la sesión de auditoría y se guardó sin cambios
de contenido en `docs/AUDITORIA_BMAD.md`.

"BUDY" (con una D) solo aparece en `docs/ARCHITECTURE.md:57` y `docs/DECISIONS.md:55`, donde describe el texto del PNG
antiguo del Figma. No son errores de escritura y se dejan como están.

## Fase 0: regresión urgente

**Skills:** `buddy-testing` (pruebas que fallan si falta un acceso), `graphify` (mapa de la navegación), `git log`/`git diff`.

### Qué commit lo rompió

| Síntoma | Commit | Causa raíz (confirmada en el diff) |
|---|---|---|
| Sin acceso a Ajustes ni a Apariencia | `0513d32` (V3.1 hito 3) | La pestaña Ajustes pasó a `href: null` (oculta). En su lugar, Inicio mostraba un icono de persona que abría **directamente** `settings/account`, nunca la lista, así que Apariencia quedó sin camino. Además el icono solo aparecía con la persona ya registrada (`ready ? … : null`). |
| No se puede cerrar sesión (administrador) | `0513d32` | "Cerrar sesión" vive en Ajustes > Cuenta. Antes del registro de la persona no había ningún camino a Cuenta; después, solo el icono de persona sin etiqueta visible. |
| Botones que "no se ven" | anterior a V3.1 (variante `ghost`) | `ghost` era **transparente** con un borde `#A8BDC2` de 1,5 px (contraste del borde ≈ 1,8:1, por debajo del 3:1 de WCAG 1.4.11). Sobre fondos claros no parecía un botón. Lo usan "Opciones" del adulto mayor, "Marcar como tomado", "Editar", "Ahora no", etc. |
| "Opciones" del adulto mayor poco visible | `24f16f3` + `ghost` | Botón `ghost` tamaño `sm` dentro de una fila con `flexWrap`. |
| Cerrar sesión del adulto mayor | — | El flujo existía (Opciones → Cerrar sesión → confirmar), pero dependía del botón "Opciones" de arriba. |

### Antes (prueba `src/__tests__/v4/fase0-regresion.test.tsx`, apuntando a la pestaña oculta)

```
× Inicio muestra "Ajustes" y abre la lista de Ajustes (con la persona registrada)
× Inicio muestra "Ajustes" también antes de registrar a la persona
× la lista de Ajustes tiene Cuenta y Apariencia, y vuelve atrás   (no había flecha "Volver")
√ Apariencia permite elegir tema y tamaño de letra                 (existía, pero sin camino)
√ Cuenta tiene "Cerrar sesión" visible                              (existía, pero sin camino)
√ "Opciones" … Cerrar sesión y Entrar como administrador
× el botón secundario tiene fondo propio y texto legible (light)   Expected: not "transparent"
× el botón secundario tiene fondo propio y texto legible (dark)    Expected: not "transparent"
Tests: 5 failed, 3 passed, 8 total
```

### Corrección (mínima; la Fase 7 rediseña estas pantallas)

- `src/app/(caregiver)/settings/index.tsx`: la lista de Ajustes deja de ser pestaña oculta y es una ruta del stack con
  `ScreenHeader` (flecha atrás, `fallback="/summary"`). Se quitó el caso especial de `settings` en la barra.
- Inicio: botón con engranaje "Ajustes" (círculo de 48, etiqueta accesible) **siempre visible**, también antes del
  registro, que abre `/settings`.
- `Button` `ghost`: superficie propia (`c.surface`), borde `#7E979E` / `#6F9099` (≥ 3:1 sobre el fondo) y sombra suave.
- "Opciones" del adulto mayor: engranaje y variante `secondary` (relleno menta pálido).
- `contrast()` se movió de un archivo de prueba a `src/theme/contrast.ts` para reutilizarlo sin ejecutar esas pruebas.

### Después

```
√ las 8 pruebas de fase0-regresion
Suites relacionadas (fase0, screens-smoke, navigation-v31, roles, contraste): 298 de 298
check:headers: OK, 34 rutas; todas las que no son raíz tienen "Volver"
```

**Verificado solo en Jest.** Falta verlo en el iPhone (`docs/PRUEBAS_EN_DISPOSITIVO.md`).

### Pendiente de la Fase 0 que pasa a fases siguientes

- **Textos letra por letra (error 4):** `24f16f3` agregó `{ minWidth: 0, flexShrink: 1 }` a **todo** `AppText`. En Yoga
  (iOS y Android) un texto que se encoge dentro de una fila cuyos vecinos no se encogen puede quedar con ancho casi cero:
  una letra por línea. En web no ocurre igual porque CSS respeta el ancho mínimo del contenido. **Hipótesis fuerte**, no
  reproducible sin dispositivo. Se corrige en la Fase 6 con el componente `Row` (texto con `flex: 1`, acción con
  `flexShrink: 0` que baja debajo cuando no cabe) en lugar de encoger todos los textos.
- **Recuadro amarillo "Cerrar" (error 7):** no hay en el código ningún "Cerrar" amarillo. Candidatos: la tarjeta "Ahora"
  con el degradado ámbar de seguimiento junto al botón "Cerrar" (×) de la hoja de opciones, o un aviso de desarrollo de
  Expo Go (LogBox). **Sin confirmar.** Se revisa al reconstruir la pantalla del adulto mayor (Fase 7).
