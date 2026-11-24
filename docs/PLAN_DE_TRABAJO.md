# Plan de trabajo de BUDDY

Equipo: Samuel Ortiz (servidor, hosting y coordinación) y Laura (app, diseño y pruebas en dispositivos).
Versión 1.1 · 2026-11-24. Este documento manda sobre cómo trabajamos; el detalle de producto está en `docs/PRODUCTO.md`.

BUDDY todavía es nuevo: antes de montar el servidor hay que encontrar y corregir errores, revisar cada función y pulir
el diseño. El trabajo va en 18 fases y 4 etapas. **Una fase se cierra solo cuando se cumple su prueba de cierre.**

## Reglas que no cambian

- Ramas cortas (`feat/…`, `fix/…`, `docs/…`, `test/…`) y PR a `develop`. Aprueba alguien del equipo que no sea el autor.
- En el repositorio solo viven `develop` (integración) y `main` (versión estable). Las ramas se borran al unir el PR.
- Nada llega a `main` sin la prueba de humo (plantilla de PR) en un Android y un iPhone.
- Nunca se suben claves ni `.env`; nunca se fuerza un push; nunca se empuja directo a `main`.
- BUDDY no receta, no diagnostica y no cambia dosis. Ningún texto puede sonar a eso.
- Nunca se muestran datos de salud inventados: sin datos, la app lo dice.
- Cada error se reporta como issue con la plantilla "Error" (severidad P0 a P3).
- Antes de abrir un PR: `npx tsc --noEmit`, `npx expo lint` y `npx jest` en verde. El CI lo repite en cada PR.

## Estado de partida (2026-11-24)

- Expo SDK 58 (58.0.26), React Native 0.88. `expo-doctor` 20/20. Jest: 54 suites, 969 pruebas en verde.
- F-01, F-06 y F-07 (riesgo de doble dosis, existencias y alertas al editar) **ya están corregidos y con prueba**
  (`src/state/__tests__/dose-safety-v4.test.ts`). Falta comprobarlos en un celular.
- No hay servidor: todo lo que dependa de él (avisos al hijo, invitación entre dos celulares) es simulado.

## Mapa de fases

| # | Fase | Responsable | Se cierra cuando |
|---|---|---|---|
| **A** | **Estabilizar lo que ya existe** | | |
| 0 | Preparar al equipo y el entorno | Laura y Samuel | Los dos abren BUDDY en un Android y un iPhone, y cada uno abrió un issue de prueba. |
| 1 | Inventario de funcionalidades | Laura (Samuel revisa) | Inventario completo y revisado; cada falla tiene su issue. |
| 2 | Errores críticos | Samuel y Laura | F-01, F-06, F-07 comprobados en celular y los casos sin prueba ya la tienen. |
| 3 | Revisión funcional por módulo | Laura (Samuel corrige lógica) | Cada módulo con su lista marcada y ningún P0 o P1 abierto. |
| **B** | **Diseño, experiencia y calidad** | | |
| 4 | Diseño visual y sistema de diseño | Laura | Capturas coherentes en claro y oscuro. |
| 5 | Animaciones y rendimiento | Laura | Nada se traba en el celular más lento; el chat abre en < 1 s. |
| 6 | Accesibilidad para adultos mayores | Laura | Pantallas del adulto mayor pasan con letra máxima y lector de pantalla. |
| 7 | Tamaños de pantalla | Laura | Capturas aprobadas en 4 tamaños. |
| 8 | Casos límite | Laura y Samuel | Cada caso con comportamiento aceptado o issue. |
| 9 | Pruebas automáticas | Samuel (Laura aprende) | CI en todos los PR y verde en `develop`. |
| **C** | **Instalar y validar con personas** | | |
| 10 | Versión instalable de Android | Laura (Samuel acompaña) | El recordatorio suena con la app cerrada y tras reiniciar en 3 marcas. |
| 11 | Versión instalable de iPhone | Laura y Samuel | El recordatorio suena con la app cerrada en un iPhone. |
| 12 | Pruebas con personas reales | Laura y Samuel | 4 de 5 adultos mayores confirman su primera toma sin ayuda. |
| **D** | **Servidor y lanzamiento** (no empieza hasta cerrar la 12) | | |
| 13 | Hosting y servidor | Samuel (Laura aprende) | Desarrollo responde, despliegue desde GitHub, Laura lo revisa sola. |
| 14 | Conectar la app al servidor | Laura y Samuel | Dos celulares ven los mismos datos y la Fase 3 vuelve a pasar. |
| 15 | Avisos remotos al hijo | Samuel (Laura en pantallas) | El hijo recibe "sin confirmar" con la app del adulto mayor cerrada. |
| 16 | Seguridad, privacidad y legal | Samuel (Laura en pantallas) | La revisión externa no deja hallazgos críticos. |
| 17 | Beta cerrada y tiendas | Laura y Samuel | 6 semanas de piloto deciden el lanzamiento. |

**Cambio respecto a la versión 1.0:** la Fase 10 (APK de Android) se adelanta para hacerse justo después de la Fase 3. La
promesa central (el recordatorio suena con la app cerrada y tras reiniciar) no se puede comprobar bien en Expo Go.

## Primer bloque (2 semanas): lo único que hacemos ahora

Meta: saber con certeza qué funciona hoy en celulares reales. **No se toca diseño, servidor ni funciones nuevas.**

| Semana | Trabajo | Quién | PR |
|---|---|---|---|
| 1 | Plantillas de issue y PR, etiquetas, tablero | Laura y Samuel | `chore/plantillas-github` |
| 1 | Este plan, leído y aprobado por los dos | Laura y Samuel | `docs/plan-de-trabajo` |
| 1 | Matriz de dispositivos llena; app abierta en Android y iPhone | Laura y Samuel | `docs/fase-1-inventario` |
| 2 | Inventario de todas las pantallas con su estado | Laura | `docs/fase-1-inventario` |
| 2 | Comprobar F-01/F-06/F-07 en celular y escribir las pruebas que faltan | Samuel (Laura prueba en celular) | `test/fase-2-verificacion` |

**El bloque se cierra cuando** el inventario está completo, cada falla tiene su issue y no queda ningún P0 abierto.
Ahí se planea el siguiente bloque (Fase 3), con lo que haya salido del inventario.

## Reunión semanal (30 minutos)

1. Qué se cerró. 2. Qué se rompió (issues nuevos P0 y P1). 3. Qué sigue y quién lo toma.
