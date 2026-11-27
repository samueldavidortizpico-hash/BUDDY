# Tarea · Accesibilidad del adulto mayor en un celular real

Responsable: Laura · Revisa: Samuel · Adelanto de la Fase 6, solo en las pantallas del adulto mayor
Skills de Claude Code que aplican: `buddy-testing` y `frontend-design`.

## Por qué

El código ya trae lo básico: los botones tienen nombre para el lector de pantalla (`src/components/button.tsx:139`),
altura mínima y la letra crece con la del sistema. Pero `docs/ACCESSIBILITY_AUDIT.md` (sección "Pendiente") dice que
**nunca se probó en un celular**: ni con TalkBack, ni con VoiceOver, ni con la letra al 200 %. El adulto mayor es
quien más lo necesita y es la pantalla que confirma las tomas.

## Pantallas

`src/app/elder/index.tsx` (inicio y confirmar toma), `options.tsx`, `permissions.tsx` y `unlock.tsx`.

## Qué hacer

En un Android con TalkBack y, si hay, en un iPhone con VoiceOver. Letra del sistema al máximo.

| Revisión | index | options | permissions | unlock |
|---|---|---|---|---|
| Nada cortado, montado ni fuera de pantalla con letra máxima | | | | |
| Cada botón se lee con un nombre claro (no "botón" a secas) | | | | |
| El orden de lectura sigue el orden visual | | | | |
| Botones de al menos 48 dp (Android) / 44 pt (iPhone) | | | | |
| "Tomé" y "No tomé" se distinguen sin depender del color | | | | |
| Los modales (confirmar cerrar sesión) reciben el foco | | | | |

Por cada falla: issue P2 (P1 si impide confirmar una toma o pedir ayuda) y la corrección **en este mismo PR**.
Capturas antes y después en `docs/capturas/accesibilidad/`.

## Cierre

- [ ] Tabla completa en Android (y en iPhone si hay uno)
- [ ] Correcciones con `npx tsc --noEmit`, `npx expo lint` y `npx jest` en verde
- [ ] `docs/ACCESSIBILITY_AUDIT.md` actualizado: qué se probó, en qué celular y qué quedó pendiente
