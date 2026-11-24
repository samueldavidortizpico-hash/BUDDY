# Fase 2 · Verificar los errores críticos

Responsable: Samuel (lógica y pruebas) · Laura (comprobación en celular) · Plan: `docs/PLAN_DE_TRABAJO.md`

Los errores que podían hacer daño a una persona (F-01, F-06, F-07) **ya están corregidos en el código y tienen prueba
automática** (ronda V4, `docs/AUDITORIA_V4.md`). Esta fase no los vuelve a programar: los comprueba en un celular y
cubre con pruebas los casos que todavía no las tienen.

## A. Comprobar en un celular (Laura)

Celular: _(marca, modelo, versión)_ · Fecha: _(aaaa-mm-dd)_. Si algo falla: issue **P0** con la plantilla "Error".

| Caso | Pasos | Esperado | Resultado |
|---|---|---|---|
| F-01 doble dosis | Medicamento a las 8:00 → confirmar "Tomé" → editar la hora a las 9:00 | No aparece otra toma pendiente hoy; mañana sale a las 9:00 | |
| F-06 existencias | Anotar existencias → "Tomé" → cambiar a "No tomé" | Las existencias vuelven exactamente al valor inicial | |
| F-07 eliminar | Medicamento con aviso en 2 min → eliminarlo | No suena ningún aviso ni queda alerta "sin confirmar" | |
| F-07 mover | Medicamento con aviso en 2 min → moverlo 1 hora | No suena a la hora vieja; sí a la nueva | |
| Doble toque | Tocar "Tomé" dos veces seguidas rápido | Se descuenta una sola pastilla | |
| Medianoche | Toma a las 23:50, no responder | La alerta queda en el día correcto | |
| Cerrar sesión | Como administrador, cerrar sesión | Nunca aparece la pantalla del adulto mayor | |
| Volver a abrir | Cerrar la app a la fuerza con cada rol y abrirla | Cada rol vuelve a su propia pantalla | |
| Contraseña temporal | Crear el acceso del adulto mayor | La contraseña se muestra una sola vez | |

## B. Pruebas automáticas (Samuel)

Ya cubiertos (no hay que escribirlos):

| Caso | Prueba |
|---|---|
| F-01, F-06, F-07, F-08 y reglas R1–R8 | `src/state/__tests__/dose-safety-v4.test.ts` |
| Confirmar dos veces descuenta una vez | `src/__tests__/v24/stock.test.tsx` |
| 23:50 y paso de medianoche | `src/__tests__/v4/recordatorios.test.ts` y R7 en `dose-safety-v4` |
| Al cerrar sesión no queda ningún aviso | `src/__tests__/v5/seguridad.test.tsx` |

Faltan (cada uno debe fallar si se rompe la lógica):

- [ ] Un medicamento de **un solo día por semana** siempre tiene su aviso dentro del plan de avisos (hallazgo Q-02 de
      `docs/AUDITORIA_BMAD.md`: la prueba actual solo valida el tope, no los días cubiertos).
- [ ] Cerrar sesión como administrador nunca lleva a la pantalla del adulto mayor.
- [ ] Al reabrir la app, cada rol (administrador, adulto mayor, enfermera) vuelve a su pantalla.
- [ ] La contraseña temporal del adulto mayor solo se puede ver una vez.

## C. Prueba inestable

Hubo una corrida con 731 de 732 pruebas por tiempo de espera. Correr la suite 10 veces seguidas:

```bash
for i in $(seq 10); do npx jest --silent 2>&1 | grep -E "^Tests:"; done
```

- [ ] Si alguna falla: anotar cuál, y decidir si es error real (issue P1) o prueba frágil (arreglar la prueba).

## Cierre de la Fase 2

- [ ] Tabla A completa, sin fallas abiertas
- [ ] Las 4 pruebas de la sección B escritas y en verde
- [ ] 10 de 10 corridas de la suite en verde
