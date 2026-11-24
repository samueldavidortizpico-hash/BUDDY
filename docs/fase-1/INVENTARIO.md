# Fase 1 · Inventario de funcionalidades

Responsable: Laura · Revisa: Samuel · Plan: `docs/PLAN_DE_TRABAJO.md`

**En esta fase nadie corrige nada: solo se mira y se anota.** Recorre la app en un celular real (no en el navegador),
primero como administrador y después como adulto mayor.

## Cómo llenarlo

- **Estado:** `Funciona`, `Falla`, `A medias`, `Simulada` (dice hacer algo que aún no hace, p. ej. lo que necesita
  servidor) o `Apagada` (no se puede abrir desde ningún lado).
- **Falla** o **A medias** → abre un issue con la plantilla "Error" y pon su número en la columna Issue.
- Una captura por pantalla en modo claro en `docs/fase-1/capturas/` con el nombre de la fila
  (`inicio-administrador.png`). El modo oscuro se revisa en la Fase 4.
- Celular usado: _(marca, modelo, Android/iOS)_ ·  Fecha: _(aaaa-mm-dd)_

## Administrador

| Pantalla o función | Archivo | Estado | Nota | Issue |
|---|---|---|---|---|
| Pantalla de carga | `src/features/boot/` | | | |
| Presentación (carrusel) | `src/app/(auth)/onboarding.tsx` | | | |
| Bienvenido | `src/app/(auth)/index.tsx` | | | |
| Crear cuenta | `src/app/(auth)/sign-up.tsx` | | | |
| Iniciar sesión | `src/app/(auth)/sign-in.tsx` | | | |
| Recuperar contraseña | `src/app/(auth)/forgot-password.tsx` | | | |
| Registro del adulto mayor | `src/app/(caregiver)/setup/index.tsx` | | | |
| Inicio (vista de un segundo) | `src/app/(caregiver)/(tabs)/summary.tsx` | | | |
| Medicamentos: crear | `src/app/(caregiver)/medication/new.tsx` | | | |
| Medicamentos: ficha y editar | `src/app/(caregiver)/medication/[id].tsx` | | | |
| Medicamentos: agregar con cámara | `src/app/(caregiver)/medication/scan.tsx` | | | |
| Existencias | ficha del medicamento | | | |
| Rutina | `src/app/(caregiver)/(tabs)/routine.tsx` | | | |
| Agua | `src/app/(caregiver)/routine/[section].tsx` | | | |
| Automatizaciones | `src/app/(caregiver)/routine/automations.tsx` | | | |
| Salud, sueño y ánimo | `src/app/(caregiver)/(tabs)/health.tsx` | | | |
| Detalle de una métrica | `src/app/(caregiver)/health/[metric].tsx` | | | |
| Chequeo diario | | | | |
| Chat de BUDDY | `src/app/(caregiver)/buddy.tsx` | | | |
| Novedades (campana) | `src/app/(caregiver)/alerts.tsx` | | | |
| Citas | | | | |
| Ubicación | `src/app/(caregiver)/(tabs)/location.tsx` | | | |
| Mis personas | `src/app/(caregiver)/family.tsx` | | | |
| Invitar a un familiar | `src/app/(caregiver)/settings/invite.tsx` | | | |
| Accesos de una persona | `src/app/(caregiver)/settings/access/[elderId].tsx` | | | |
| Ver la pantalla del adulto mayor | `src/app/(caregiver)/preview.tsx` | | | |
| Entregar el teléfono | `src/app/(caregiver)/handoff.tsx` | | | |
| Cambiar de cuenta | `src/app/(caregiver)/account-switch.tsx` | | | |
| Ajustes | `src/app/(caregiver)/settings/index.tsx` | | | |
| Ajustes: Apariencia, Mis avisos, Dispositivos | `src/app/(caregiver)/settings/[section].tsx` | | | |
| Recuperación de la cuenta | `src/app/(caregiver)/settings/recovery.tsx` | | | |
| BUDDY Plus | `src/app/(caregiver)/plus.tsx` | | | |
| Legal y permisos | `src/app/legal/[doc].tsx` | | | |
| Alimentación (debe estar **Apagada**) | `src/app/(caregiver)/food.tsx` | | | |
| Reloj (debe estar **Apagada** / "Pronto") | `src/app/(caregiver)/health/watch.tsx` | | | |

## Adulto mayor

| Pantalla o función | Archivo | Estado | Nota | Issue |
|---|---|---|---|---|
| Pantalla del adulto mayor | `src/app/elder/index.tsx` | | | |
| Confirmar toma (Tomé / No tomé) | `src/app/elder/index.tsx` | | | |
| Opciones | `src/app/elder/options.tsx` | | | |
| Permisos | `src/app/elder/permissions.tsx` | | | |
| Entrar como administrador | `src/app/elder/unlock.tsx` | | | |
| Pedir ayuda / Llamar a [nombre] | `src/app/elder/index.tsx` | | | |

## Enfermera

| Pantalla o función | Archivo | Estado | Nota | Issue |
|---|---|---|---|---|
| Pantalla de la enfermera | `src/app/nurse/index.tsx` | | | |

## Contradicciones con la documentación

Compara lo que viste con `docs/ROADMAP.md` y `docs/DECISIONS.md`. Anota aquí lo que el documento dice y la app no hace
(o al revés).

| Documento y línea | Qué dice | Qué hace la app |
|---|---|---|
| | | |

## Cierre de la Fase 1

- [ ] Todas las filas tienen estado
- [ ] Cada `Falla` y `A medias` tiene issue
- [ ] Capturas en `docs/fase-1/capturas/`
- [ ] Alimentación y reloj no se abren desde ningún lado
- [ ] Samuel revisó el inventario
