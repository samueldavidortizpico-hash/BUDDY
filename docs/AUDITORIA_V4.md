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

## Fase 1: seguridad de medicamentos (F-01, F-06, F-07, F-08, A-10)

**Skills:** `buddy-medical-safety` (nunca pedir otra dosis ante la duda; trazabilidad), `buddy-testing` (reloj simulado,
tres zonas horarias). **Codex** hizo la investigación, la propuesta OpenSpec y la mayor parte de la implementación hasta
que su cuenta alcanzó el límite de uso ("You've hit your usage limit … try again at 7:17 PM"); no alcanzó a escribir su
informe. Claude revisó todo el diff, corrigió unas 60 tildes que Codex escribió como `?` (PowerShell con la codificación
equivocada), ajustó una regla y agregó 9 pruebas.

### Antes (pruebas de reproducción contra el código original `f0c26e8`, TZ=America/Bogota)

```
× F-01: confirmar 08:00 y editar a 09:00 no crea otra dosis hoy        Expected length: 1, Received length: 2
   (la toma de las 08:00 "taken" y una nueva "pending" a las 09:00: doble dosis)
× F-06: Tomé → No tomé devuelve existencias exactamente una vez         Expected: 30, Received: 29
× F-07: mover una toma cierra su alerta antigua                          alerta "sin confirmar" de las 08:00 sigue pendiente
× F-07: mover una toma pospuesta elimina la clave antigua                la pospuesta y otra pendiente a las 09:00
× F-07: eliminar medicamento cierra todas sus alertas pendientes         la alerta sigue pendiente
× F-08: alerta de anteayer a las 23:50 Colombia no pertenece a ayer      Expected: false, Received: true
Tests: 6 failed, 6 total
```

### Causas raíz (confirmadas en el código)

| Hallazgo | Causa |
|---|---|
| F-01 doble dosis | `src/state/care.ts:70-79` (original) borraba las tomas **pendientes** de hoy y conservaba la tomada; `missingDoses` (`src/domain/schedule.ts:62`) deduplicaba por **hora** (`med@08:00`), así que la hora nueva (`med@09:00`) creaba otra toma. Lo mismo con una toma pospuesta. |
| F-06 inventario | `skip` (`care.ts:172`) no devolvía lo que `confirm` había descontado; solo `reset` lo hacía. |
| F-07 alertas y avisos | Al editar o eliminar se borraban tomas sin cerrar su alerta `dose_unconfirmed` ni cancelar sus avisos; los avisos solo se reprogramaban cuando la pantalla del adulto mayor estaba montada. |
| F-08 fecha UTC | `status.ts:79` y `feed.ts:48,90` comparaban `createdAt.slice(0,10)` (día UTC) con la fecha local: después de las 7 p. m. en Colombia el día no coincide. |
| A-10 carrera | `applyPlan` cancelaba y reprogramaba sin exclusión; dos planes seguidos podían terminar en desorden. |

### Corrección (sin cambiar la arquitectura)

- **Identidad por posición del día (R4):** `DoseEvent.slot` (opcional; en tomas antiguas se infiere por orden de hora,
  `src/domain/dose-safety.ts`). `missingDoses` deduplica por medicamento + posición y respeta el cupo `dayLimit` (R2).
- **Editar horario (R2, R3):** con una toma registrada hoy, la hora registrada se conserva y el horario nuevo rige mañana;
  las pendientes se mueven a su nueva hora el mismo día. Mover a una hora ya pasada deja la toma **retenida** (`safetyHold`):
  no se le pide al adulto mayor y no genera alertas (R8).
- **Historial (R1):** `DoseEvent.history` de solo agregar (`created`, `confirm`, `skip`, `snooze`, `reset`,
  `reschedule`, `schedule_changed`, `cancel`), cada evento con autor, rol, hora y estado antes/después. Cancelar es un
  marcador (`cancelledAt`), no un borrado.
- **Cancelación (R5):** mover, cancelar, pausar o eliminar cierra las alertas "sin confirmar" y cancela los avisos T y
  T+10 (`cancelDoseNotifications`), aunque la pantalla del adulto mayor no esté abierta. Eliminar el medicamento cancela
  todo lo suyo y su aviso de existencias.
- **Inventario (R6):** `reconcileStock` descuenta al marcar "Tomé" y devuelve exactamente lo descontado al pasar a
  "No tomé" o al corregir; repetir el mismo estado no mueve nada. Cada movimiento deja un asiento en `stock`.
- **Medianoche (R7, F-08):** fechas de `createdAt` convertidas al día local con `toISODate`.
- **R8:** `doseAmbiguity()` (puro) dice cuándo mostrar "Confirma con [nombre] antes de darle otra dosis"
  (`strings.doseSafety`). Se conecta en la interfaz en la Fase 7 (detalle del medicamento).
- **A-10:** cola exclusiva en `src/infrastructure/notifications.ts` para aplicar, cancelar y limpiar.
- **Ajuste de Claude:** sin ninguna toma registrada hoy, ampliar la frecuencia sí la aplica hoy (Codex la aplazaba a
  mañana y se perdía la toma recién agregada). Anotado en `docs/DECISIONS.md`.

Propuesta OpenSpec: `openspec/changes/corregir-edicion-horario-tomas/` (`openspec validate` → "Change … is valid").

### Después

```
Pruebas de seguridad de tomas (domain + state + escalation): 37 de 37 en TZ=America/Bogota, Europe/Madrid y UTC
Escenarios: cambio después de confirmar, antes de la dosis, tres tomas con la 1.ª tomada, subir y bajar la frecuencia,
eliminar, pausar, corrección Tomé↔No tomé repetida (asientos −1, +1, −1, +1), historial, medianoche 23:50/00:10,
avisos y alertas del horario anterior.
npx tsc --noEmit: sin errores · npx expo lint: sin errores
npx jest: 765 de 766; la única falla es "pliega los mensajes anteriores" (tiempo de espera, Q-01, Fase 2)
```

**Cambio de comportamiento a conocer:** después de "corregir" una toma (`doseActions.reset`, hoy sin uso en pantallas) la
toma queda retenida hasta que alguien responda explícitamente; ya no se puede posponer. Se actualizó la prueba de V3.0
que suponía lo contrario.

**Fuera de alcance (documentado):** zona horaria por paciente (A-07), cobertura de días del plan de avisos (F-02) y
alarmas exactas de Android (F-03).

## Fase 2: pruebas estables

**Skills:** `buddy-testing` (reloj simulado, esperas deterministas, tres zonas horarias).

### Prueba intermitente (Q-01)

Cinco corridas completas de `npx jest`:

```
Corrida 1: 1 failed, 765 passed  →  ● pliega los mensajes anteriores (Exceeded timeout of 5000 ms)
Corrida 2-5: 766 passed, 766 total   (la prueba ya estaba corregida cuando arrancaron)
```

**Causa:** `src/__tests__/v24/chat-guided.test.tsx:141` escribía "hola" 8 veces por la interfaz: 16 burbujas animadas y
8 renders completos del chat. Ya usaba reloj simulado; el límite de Jest (5 s) es de tiempo **real**. Sola tardaba
2,1 s; con los procesos de Jest en paralelo pasaba de 5 s. No era el reloj ni una carrera: era carga de CPU.

**Corrección:** el plegado solo depende de cuántos mensajes hay, así que la prueba siembra 12 mensajes `[PRUEBA]` en la
base y comprueba "Ver mensajes anteriores (2)" y que al tocarlo aparece el más antiguo. 2,1 s → 0,6 s, sin depender de
la carga.

### Recordatorios con reloj simulado (`src/__tests__/v4/recordatorios.test.ts`)

Secuencia completa en una sola prueba: aviso T y T+10 en el plan → a las 8:01 solo queda T+10 → a las 8:29 no hay
alerta → a las 8:30 "sin confirmar" con alerta y tarjeta en Novedades → al confirmar a las 8:40 se cierran la alerta, la
tarjeta y los avisos, y se descuenta la existencia. Más posponer (el "sin confirmar" pasa a 8:45) y dos casos de cambio
de día.

**Fallo nuevo encontrado (confirmado):** una toma de las 23:50 sin respuesta **nunca** avisaba al administrador.

```
× cambio de día: una toma de las 23:50 sin respuesta avisa al administrador a las 00:20
    Expected length: 1   Received length: 0
```

**Causa:** `evaluateAlerts` (`care.ts`), las Novedades (`recommendations/engine.ts:168`) y el estado del Inicio
(`status.ts:82`) solo revisaban las tomas con fecha de **hoy**; a las 00:20 la toma de las 23:50 ya es de ayer.
**Corrección:** `unconfirmedDay()` y `dueForReview()` en `src/domain/schedule.ts` (puras): se revisan las tomas de hoy y
las de ayer cuyo "sin confirmar" cae hoy. Lo que pasó a "sin confirmar" ayer no vuelve a avisar (prueba incluida).

### Después

```
recordatorios + escalation + status + dose-safety: 43 de 43 en TZ=America/Bogota, Europe/Madrid y UTC
npx jest: 770 de 770 (26,5 s) · --detectOpenHandles sin manejadores abiertos · tsc sin errores
```

## Fase 3: almacenamiento seguro

**Skills:** `buddy-medical-safety` (datos sensibles, nada en consola), `buddy-testing`. Codex intentó tomarla y volvió a
quedarse sin cuota antes de cambiar nada ("try again at Oct 24th, 12:32 AM"); la hizo Claude.

- `expo-crypto` instalado **sí trae AES-GCM** (`node_modules/expo-crypto/build/aes/index.d.ts`): sin dependencias nuevas.
- Opción elegida: cifrado autenticado sobre el AsyncStorage actual con la clave en el SecureStore (menor riesgo, funciona
  en Expo Go). Comparación con SQLite + SQLCipher en `docs/ALMACENAMIENTO_SEGURO.md`.
- Pruebas: 6 de 6 (ida y vuelta, manipulación, migración, clave perdida, interrupción, reversión).
- Bandera encendida solo en desarrollo. **Sin probar en dispositivo.**

## Fases 4, 5 y 10 (documentos)

`docs/SINCRONIZACION.md` (recomienda Supabase para el piloto con la contraparte de AWS; la decisión es del dueño),
`docs/NOTIFICACIONES_REMOTAS.md` (servidor detecta "sin confirmar" y "No puedo verificar", Expo Push con recibos,
reintentos idempotentes y lo que no se puede garantizar) y `docs/BUDDY_PLUS_REVISION.md` (sin cambiar el modelo).

## Fases 6 y 7: sistema de diseño V4 y rediseño

**Skills:** `impeccable` (contexto, piso de calidad, modo *Operate*; sin torneo de conceptos porque el brief fija paleta y
composición), `frontend-design`, `baseline-ui`, `fixing-accessibility`, `fixing-motion-performance`, `playwright-cli`
(capturas y controles). Detalle y tokens en `docs/DESIGN_SYSTEM.md`.

- Componentes: `Button` (56/72, compacto 44 + área 48, principal sólido, de texto), `Row`, `Card` de estado,
  `ScreenHeader` H2 de 2 líneas con avatar opcional, `IconTile`, barra con BUDDY de 64. Galería en `/dev/gallery`.
- Pantallas: Inicio, adulto mayor, Opciones y Permisos, detalle de medicamento, chat, Rutina, Salud, Ubicación, Ajustes y
  Vista de [nombre], según 8.1–8.10.
- Contraste: mosaicos ≥ 3:1 y tarjetas de estado ≥ 4,5:1 medidos en `src/theme/__tests__/contrast.test.ts` (214 pruebas).
- Capturas: `docs/capturas/v4/antes/` y `docs/capturas/v4/despues/` (390 con letra normal en claro, oscuro y alto
  contraste; 360 con letra 2,0 en claro; y cada combinación que falla). Informes `_informe.txt` y `informe-ronda1.txt`.

## Fase 8: chat que se entiende y actúa

- `docs/VOZ_DE_BUDDY.md` (reglas y 40 ejemplos) y `src/domain/assistant/voice.ts` (revisor automático).
- Plantillas revisadas: de `strings.buddy` solo incumplía la de urgencia (tres frases → dos). Las respuestas de
  preguntas programadas de `use-chat.ts` incumplían la guía: horas en 24 h ("20:00"), rutas técnicas ("Rutina >
  Automatizaciones", que además ya no existe), listas mecánicas ("Activa · ¿Cómo te sientes? · 20:00"). Reescritas.
- Intérprete: "es una emergencia" no se entendía; "quedan 10 pastillas" creaba un medicamento; resumen del día;
  saludo y gracias respondían "No entendí". En preguntas programadas, dos en un mensaje tomaban la misma hora; "cada noche
  a las 9" quedaba a las 9 a. m.; "al despertar a las 6" y "si ya cenó a las 7" quedaban al revés; "la pastilla
  losartán" se tomaba como nombre; sin hora no se entendía. Todo corregido.
- Resultado real: guía **39/40 (97,5 %)** (falla "que camine 5000 pasos al día": primero crea la meta de caminata; también
  crea la de pasos); preguntas programadas **40/40 (100 %)**; corpus anterior 100 % y reservado 95,8 %; revisión de voz
  de todas las plantillas y respuestas: 0 incumplimientos.
