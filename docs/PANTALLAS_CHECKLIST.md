# BUDDY — Checklist de pantallas

Estado real al 2026-10-10. "Verificado" significa:
- **Jest:** prueba de render o de interacción en `src/__tests__/` (rutas reales con `renderRouter`).
- **Web:** recorrida con Playwright en la versión web de Expo.
- **Expo Go:** pendiente de prueba en el teléfono (la hará el usuario).

| # | Pantalla del Figma (App.tsx) | Ruta | Estado | Verificado | Notas |
|---|---|---|---|---|---|
| 1 | Bienvenida (`welcome`) | `/` | Completa | Jest, Web | Robot flotando y orbes. Redirige si ya hay perfil. "Iniciar sesión" avisa que el inicio real llegará próximamente. |
| 2 | Onboarding (`onboarding`) | `/onboarding` | Completa | Jest | 3 pasos, puntos animados, Omitir, Continuar y "Elegir mi perfil". |
| 3 | Selección de perfil (`profile`) | `/profile-choice` | Completa | Jest (navegación) | Guarda el rol y lleva a `/home` o `/summary`. |
| 4 | Inicio (`home`) | `/home` | Completa | Jest, Web | Fecha y saludo reales, próxima toma real, progreso por franjas, ánimo, accesos, menú, Hablar con BUDDY y Emergencia. |
| 5 | Medicamentos (`medications`) | `/medications` | Completa | Jest | Filtros Todos, Hoy y Próximos reales (FlatList), agregar y acceso a seguridad. |
| 5b | Detalle de medicamento | `/medication/[id]` | Completa | Jest | Ficha completa e historial de tomas. Editar y eliminar: próximamente. |
| 6 | Agregar medicamento (`add-medication`) | `/modals/add-medication` | Completa | Jest (validación y guardado) | Concentración separada de la dosis, horas, fechas y éxito animado. Foto del envase: próximamente. |
| 7 | Recordatorio (`reminder`) | `/modals/reminder?doseId=` | Completa | Jest (confirmar) | Ya lo tomé, Posponer 10 min y No lo tomé cambian el estado. Notificaciones: próximamente. |
| 8 | Estado de ánimo (`mood`) | `/mood` | Completa | Jest (guardar) | Cuadrícula 3×2, nota, semana con puntos y enlace a síntomas. |
| 9 | Síntomas (`symptoms`) | `/symptoms` | Completa | Jest | Chips, intensidad 1–3, hora, fecha, notas, aviso y últimos registros. |
| 10 | Sueño (`sleep`) | `/sleep` | Completa | Jest | Resumen nocturno, horas editables, calidad, gráfico de 7 días y siesta. |
| 11 | Salud (`health`) | `/health` | Completa | Jest, Web | 6 registros manuales con sparkline y tendencia descriptiva, e hidratación. |
| 11b | Nuevo registro manual | `/modals/add-vital?type=` | Completa | Jest (validación) | Valida rangos de escritura; guarda con `source: manual`. |
| 12 | Bienestar (`wellness`) | `/wellness` | Completa | Jest (vaso y hábito) | Metas, 8 vasos que se llenan, hábitos y logro. |
| 13 | Chat (`chat`) | `/chat` | Completa | Jest, Web | Burbujas, sugerencias, escritura, respuestas locales y micrófono "próximamente". |
| 14 | Reportes (`reports`) | `/reports` (`?viewer=caregiver`) | Completa | Jest | Día, Semana y Mes con datos reales. Compartir: demostración. |
| 15 | Seguridad de medicamentos (`safety`) | `/safety` | Completa (contenido "próximamente") | Jest | Sin interacciones ni indicaciones (ver DECISIONS #1). |
| 16 | Panel del cuidador (`caregiver`) | `/summary` | Completa | Jest, Web | Llamar y Mensaje: demostración. |
| 17 | Ubicación y bienestar (`location`) | `/tracking` (`?tab=wellbeing`) | Completa | Jest (revocar) | Mapa de ejemplo, permisos y revocación con confirmación. |
| 18 | Alertas (`alerts`) | `/alerts` | Completa | Jest (marcar atendida) | "Medicamento sin confirmar", nunca emergencia. |
| 19 | Perfil y configuración (`settings`) | `/settings`, `/settings/[section]` | Completa | Jest | Tamaño de texto global, datos, contactos, privacidad, notificaciones, accesibilidad, emergencia, cambiar perfil y cerrar sesión. |
| — | Cuenta del cuidador | `/account` | Completa | Jest | Permisos compartidos, texto, avisos y cerrar sesión. |
| — | Emergencia | `/modals/emergency` | Completa | Jest | Contactos ficticios y 123; no marca. |
| — | Galería (solo desarrollo) | `/dev/gallery` | Completa | Jest | Redirige a `/` fuera de `__DEV__`. |

## Pendiente o "próximamente" (no presentado como real)
Notificaciones del teléfono, inicio de sesión real y cuentas, voz, foto del envase (y extracción), revisión farmacológica, GPS y mapa real, llamadas y mensajes reales, compartir reportes, editar y eliminar medicamentos, cambiar foto, invitar contactos y editar datos personales.
