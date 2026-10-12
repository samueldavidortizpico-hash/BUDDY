# Hoja de ruta de BUDDY

Estado real al 2026-10-12 (ronda V2.4 en curso). "Hecho" significa implementado y probado en web y con Jest; lo que necesita un dispositivo está en `docs/PRUEBAS_EN_DISPOSITIVO.md`.

## Hecho

- **Fase 1 (prototipo local):** cuentas locales del administrador y del adulto mayor, rutina completa, chat de BUDDY con borrador y confirmación, pantalla del adulto mayor, vista previa y entrega con PIN, feed de alertas y recomendaciones con escalada, notificaciones locales.
- **V2.4 Hito 1:** chat guiado (tarjeta fija, respuestas tocables, menú de 8 acciones), comprensión del español medida con corpus (100 %) y conjunto reservado (95,8 %).
- **V2.4 Hito 2:** índice sin conexión del INVIMA, "agrega dolex" con presentaciones y fuente, "Para qué se usa" desde MedlinePlus en español, revisión por perfil con fuente (nivel 2 detrás de un indicador).

## En curso (V2.4)

Hito 3 alimentos y existencias · Hito 4 robot arrastrable y burbujas · Hito 5 barra Liquid Glass · Hito 6 ubicación y mapa · Hito 7 portada de carga · Hito 8 pulido y verificación.

## Fases siguientes

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
