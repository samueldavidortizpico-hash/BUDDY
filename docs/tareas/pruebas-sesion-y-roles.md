# Tarea · Pruebas de sesión y roles

Responsable: Laura · Revisa: Samuel · Fase 2 (toma los puntos 2 y 3 de la sección B de `docs/fase-2/VERIFICACION.md`)
Skills de Claude Code que aplican: `buddy-testing`.

## Por qué

Si al cerrar sesión o al reabrir la app alguien cae en la pantalla de otro rol, el adulto mayor puede ver opciones de
administrador, o el hijo puede quedar en la pantalla del adulto mayor sin saberlo. Hoy esa lógica no tiene prueba.

## Dónde está el código

- Redirección del administrador: `src/app/(caregiver)/_layout.tsx` (líneas 15-19: sin sesión → `/`, adulto mayor →
  `/elder`, enfermera → `/nurse`, teléfono entregado → `/elder`).
- Redirección del adulto mayor: `src/app/elder/_layout.tsx` (líneas 22-23).
- Cerrar sesión: `signOut` en `src/state/session.ts:120`.
- Ejemplos de pruebas con sesión: `src/__tests__/v5/seguridad.test.tsx` y `src/__tests__/v4/`.

## Qué hacer

Escribir `src/__tests__/v5/sesion-y-roles.test.tsx` con al menos estos casos:

- [ ] Administrador cierra sesión → termina en `/` (Bienvenido), nunca en `/elder`.
- [ ] Adulto mayor cierra sesión desde Opciones → termina en `/`.
- [ ] Con sesión de administrador guardada, al abrir la app → `/summary`.
- [ ] Con sesión de adulto mayor guardada → `/elder`. Con sesión de enfermera → `/nurse`.
- [ ] Con el teléfono entregado (handoff) y luego cerrar sesión → no queda en `/elder`.

Cada prueba debe **fallar si se rompe la redirección**: cámbiala a propósito una vez para comprobarlo y luego revierte.
Si alguna prueba descubre un error real, no lo arregles en silencio: abre un issue P1 y arréglalo en este mismo PR.

## Cierre

- [ ] Las pruebas pasan y `npx tsc --noEmit`, `npx expo lint` y `npx jest` están en verde
- [ ] Comprobado a mano en un celular (los mismos 5 casos)
