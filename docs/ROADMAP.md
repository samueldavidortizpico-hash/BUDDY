# Hoja de ruta de BUDDY

Estado real al 2026-10-20 (ronda V3.0 completada: Hitos 1 a 6 y verificación final). Desde V3.0 la hoja de ruta se ordena por la definición del producto
(`docs/PRODUCTO.md`): **Núcleo**, **Valor añadido** y **Futuro**. "Hecho" significa implementado y probado en web y con
Jest; lo que necesita un dispositivo está en `docs/PRUEBAS_EN_DISPOSITIVO.md`; lo que necesita backend se marca como tal.

## Núcleo (encendido)

| Función | Estado | Falta |
|---|---|---|
| Medicamentos con horarios, confirmación ("tomé / no tomé / en 10 minutos") | Hecho | — |
| Aviso escalonado (T, T+10, "sin confirmar" a T+30, alerta de seguimiento) | Hecho (V3.0) | Alerta en el celular del hijo con la app del adulto mayor cerrada: **backend** |
| Existencias exactas con aviso a 3 días | Hecho (V2.4) | — |
| Chequeo diario corto (ánimo, sueño, "me siento mal") | Hecho | — |
| Botón de ayuda | Hecho | Aviso remoto al hijo: **backend** |
| Vista de un segundo y resumen diario para el hijo | Hecho (V3.0) | Resumen generado en el servidor: **backend** |
| Detección de silencio ("No puedo verificar") | Hecho en el mismo celular (V3.0) | Entre dos celulares: **backend** (`HeartbeatRepository`) |
| Cuentas y seguridad (administrador, acceso del adulto mayor, PIN, salir del modo adulto mayor) | Hecho (V3.0 Hito 1) | Cuentas en servidor: **backend** |

## Valor añadido (encendido lo construido)

| Función | Estado | Falta |
|---|---|---|
| Varios cuidadores (invitación familiar con permisos) | Hecho en local (V3.0); contrato `InviteRepository` | Aceptar la invitación en otro celular: **backend** |
| Citas con dirección y preguntas | Hecho | — |
| Reporte para el médico | Parcial (Salud) | Exportar PDF |
| Mensajes de la familia | Parcial (chat del administrador) | Entrega remota: **backend** |
| Ubicación compartida con consentimiento | Hecho (V2.4, primer plano) | Segundo plano: build instalable |
| Chat de BUDDY como asistente del administrador para configurar | Hecho (pantalla completa desde V3.0) | — |

## Futuro (apagado en `src/config/features.ts`, fuera de la navegación)

| Función | Interruptor | Requisitos para encenderla |
|---|---|---|
| Revisión farmacológica avanzada (nivel 2, clases ATC) | `level2Review` (apagado; `EXPO_PUBLIC_LEVEL2_REVIEW=on`) | Revisión de un profesional de salud (`docs/BASE_FARMACOLOGICA.md`) |
| Análisis farmacológico verificado (interacciones, nivel 3) | — | Base con licencia comercial y revisión profesional |
| IA conversacional real | — | Edge Function con la clave en el servidor (`docs/IA_BUDDY.md`) |
| Nutrición (análisis de etiquetas de alimentos) | `foodAnalysis` | Decisión del dueño; el evaluador queda en `/food` |
| Reloj y datos de salud | `watch` | Build instalable, HealthKit / Health Connect |
| Zonas seguras | — | Ubicación en segundo plano y consentimiento revocable |

## Fases técnicas siguientes

| Fase | Contenido | Requisitos |
|---|---|---|
| Backend (Supabase o AWS, por decidir) | Cuentas del adulto mayor creadas por el administrador en el servidor, sincronización entre los dos celulares, **envío de señales de vida (`HeartbeatRepository`)**, alertas remotas al hijo, invitaciones familiares | Decisión del dueño, RLS o equivalente probado, `docs/SUPABASE_PLAN.md` |
| Notificaciones remotas | Aviso al hijo cuando el adulto mayor no responde, con la app cerrada | Backend y build instalable |
| Seguridad y legal | Antes de la beta (`docs/SECURITY.md`) | Revisión legal en Colombia |
| Piloto con familias | Metas a validar de `docs/PRODUCTO.md` | Lo anterior |

## Historial

### Hasta V2.4

- **Fase 1 (prototipo local):** cuentas locales del administrador y del adulto mayor, rutina completa, chat de BUDDY con borrador y confirmación, pantalla del adulto mayor, vista previa y entrega con PIN, feed de alertas y recomendaciones con escalada, notificaciones locales.
- **V2.4 Hito 1:** chat guiado (tarjeta fija, respuestas tocables, menú de 8 acciones), comprensión del español medida con corpus (100 %) y conjunto reservado (95,8 %).
- **V2.4 Hito 2:** índice sin conexión del INVIMA, "agrega dolex" con presentaciones y fuente, "Para qué se usa" desde MedlinePlus en español, revisión por perfil con fuente (nivel 2 detrás de un indicador).

### V2.4 completada (2026-10-12)

Hitos 3 a 8: existencias exactas e idempotentes con avisos a 3 días, evaluador de alimentos con la norma vigente, robot arrastrable con burbujas, barra Liquid Glass con gesto, ubicación con consentimiento y mapa, portada de carga. Todo verificado en web y con Jest; lo nativo (teclado, vidrio de iOS 26, mapa, permisos, hápticos, splash) está en `docs/PRUEBAS_EN_DISPOSITIVO.md`.

### Pendiente antes de la Fase 2

- Ronda V2.3 (no ejecutada): persistencia cifrada, cola de sincronización visible, configuración nativa segura, minimización de datos.
- Splash nativo de marca: falta un PNG transparente de alta resolución.

### Fases previstas en V2.4 (sustituidas por las tablas de arriba)

| Fase | Contenido | Requisitos |
|---|---|---|
| 2 | Supabase: cuentas del adulto mayor creadas por el administrador **mediante Edge Function** (nunca desde la app), sincronización y Realtime entre los dos celulares | Proyecto de Supabase, RLS probada, `docs/SUPABASE_PLAN.md` |
| 3 | Notificaciones remotas (aviso al cuidador cuando el adulto mayor no responde) | Fase 2 y build instalable |
| 4 | Seguridad y legal antes de la beta (ver `docs/SECURITY.md`) | Revisión legal en Colombia |
| 5 | Ubicación en segundo plano y zonas seguras | Build instalable, consentimiento revocable |
| 6 | **IA con Edge Function** (`docs/IA_BUDDY.md`): asistente que propone acciones confirmadas por el cuidador y explica solo datos de fuentes verificadas; **lectura de fotos** de cajas y de tablas nutricionales como borrador sin confirmar | Clave solo en el servidor, consentimiento para IA, evaluación de 100 preguntas aprobada |
| 7 | **Base verificada de interacciones y contraindicaciones** (licencia comercial) y **revisión profesional** (médico y farmacéutico) de reglas, umbrales y textos; activar el nivel 2 para pacientes reales | Contrato con el proveedor, revisión regulatoria (`docs/BASE_FARMACOLOGICA.md`) |
| 8 | Reloj y datos de salud (HealthKit / Health Connect) | Build instalable |
| 9 | Planes premium | Fases 2 a 6 |
| 10 | Piloto con familias | Fase 4 completa |
