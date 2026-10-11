# BUDDY — Decisiones

Registro de decisiones tomadas durante la Fase 1 (interfaz completa con datos ficticios locales).
Fuentes, en orden: `docs/CONTEXTO_BUDDY.md` (no estaba en el repositorio ni en el remoto durante este trabajo; se usaron las reglas del prompt y la Skill `buddy-medical-safety`), prototipo de Figma Make (`docs/figma-referencia/`, descargado con el conector de Figma) y el prompt de la fase.

## Producto y seguridad

| # | Decisión | Motivo |
|---|---|---|
| 1 | Seguridad de medicamentos muestra "Revisión farmacológica: próximamente", cómo funcionará (fuentes verificadas, revisión profesional, sin conclusiones automáticas) y el aviso orientativo. Se eliminaron las tarjetas ATENCIÓN / INDICACIÓN / TODO BIEN del Figma. | No se afirma ninguna interacción, contraindicación ni indicación, ni siquiera ficticia. |
| 2 | Salud: registros MANUALES con la leyenda "Registrado manualmente · sin dispositivos conectados". Sin "índice general 92": el resumen cuenta cuántos registros hay hoy. Tendencias: "Más alto / más bajo / igual que el anterior". | No hay dispositivos ni umbrales clínicos validados por un profesional. |
| 3 | Rangos de validación de registros de salud (p. ej. glucosa 20–600) | Solo detectan errores de escritura; no valoran la salud. |
| 4 | Estados de toma: pendiente, tomada, pospuesta, omitida (el usuario dijo "No lo tomé") y sin confirmar (60 min sin respuesta, calculado). | "Sin confirmar" nunca se llama omitida ni emergencia. |
| 5 | "Ya lo tomé" se guarda como `confirmedByUser` + `respondedAt`; la UI aclara que BUDDY no puede comprobarlo. | Confirmación declarada, no ingestión comprobada. |
| 6 | Concentración (valor + unidad) y dosis (cantidad + presentación) son campos separados. | El Figma los juntaba en un texto. |
| 7 | Alertas del cuidador = seguimiento (Pendiente / Importante / Atendida / Resuelto), con aviso "no son emergencias". | Separar seguimiento de alertas clínicas. |
| 8 | Chat: respuestas locales por reglas; ante "presión" muestra el último registro manual y dice que no puede interpretarlo; nunca da dosis; ante palabras de urgencia deriva al 123. | Sin IA real en esta fase. |
| 9 | Emergencia: hoja con contactos ficticios y la línea 123 marcada "Demostración: no se realizan llamadas". Llamar solo muestra un aviso. | No marcar números reales. |
| 10 | Mapa: dibujo con Views y etiqueta "Vista de ejemplo"; dirección "Calle 00 # 00-00, Barrio Ejemplo (dirección ficticia)". Pantalla de permisos y revocación con confirmación. | Sin GPS ni mapa real. |
| 11 | Sin "pasos" en el panel del cuidador (el Figma mostraba 1.250 pasos). Se usan tomas, sueño, ánimo y vasos de agua registrados. | No hay sensores: sería un dato de dispositivo inventado. |
| 12 | Reportes: el círculo muestra el % de tomas confirmadas, no un puntaje "89/100". | No inventar índices de salud. |
| 13 | Chequeo diario del primer prompt = Ánimo + Síntomas del Figma (no se creó un modal adicional). | El segundo prompt y el Figma mandan en la estructura. |
| 14 | "Iniciar sesión" muestra un aviso (inicio real próximamente) y abre la elección de perfil. | No hay autenticación en esta fase. |

## Diseño

| # | Decisión | Motivo |
|---|---|---|
| 15 | Tipografía Manrope 400–800 (`@expo-google-fonts/manrope`); se retiró Inter. | Es la del Figma. |
| 16 | Escala con mínimos: Display 32, H1 28, H2 22, H3 20, texto 18, secundario 16, auxiliar 14, metadatos 12. Tarjetas más altas que en el Figma con la misma estructura. | El Figma usa 7–12 px. |
| 17 | Tamaño de texto propio (Normal ×1, Grande ×1,15, Muy grande ×1,3) multiplicado sobre la escala del sistema (`allowFontScaling`, tope ×2 por texto). | Requisito de accesibilidad. |
| 18 | Colores de texto oscurecidos para AA (ver ACCESSIBILITY_AUDIT.md): slate → `#56657A`, menta texto → `#127A62`, coral texto → `#B9433D`, lavanda → `#5B4BD0`, cielo → `#1F6FAE`, amarillo → `#86620C`, rojo → `#C2413F`. | Los originales daban 2,4–4,4:1. |
| 19 | CTA coral: degradado `#C24E3B → #B84A3A` con texto blanco (4,7–5,2:1). | `#F28C7A → #FF776B` daba 2,4–2,6:1. |
| 20 | IconButton menta con fondo `#178C6F` (icono blanco 4,2:1). | `#21AD8B` daba 2,8:1 (<3:1 para iconos). |
| 21 | Iconos siempre con etiqueta visible (Atrás, Agregar, Menú, Cerrar, Opciones, Historial). Única excepción: Enviar del chat, junto al campo de texto rotulado y con nombre accesible. | Adultos mayores. |
| 22 | Pestañas del paciente: Inicio, Medicamentos, Chat, Bienestar; Perfil desde el avatar y desde el menú. Cuidador: Resumen, Seguimiento, Alertas, Cuenta. | Decisión del prompt. |
| 23 | Ánimo: Excelente, Bien, Regular, Cansado, Triste, Mal con los colores del Figma (amarillo, menta, cielo, lavanda, coral, rojo). | Decisión del prompt. |
| 24 | Selector de hora con botones (−1 h, −15 min, +15 min, +1 h) y de fecha (día anterior / siguiente) en lugar de `@react-native-community/datetimepicker`. | Botones grandes y fáciles; funciona en web; sin dependencia nueva. |
| 25 | Logo: el PNG del Figma dice "BUDY" (una D). Solo se usa el recorte del robot (centrado, 130 px de la imagen) y el nombre BUDDY se escribe como texto. | Nombre siempre BUDDY. |
| 26 | Iconos de app y splash PROVISIONALES generados del recorte del robot (`jimp-compact`) sobre `#F8FAF8`. | No hay arte final; se reemplazan los de Expo. |
| 27 | Foto de Carmen solo como avatar de la usuaria ficticia (con iniciales de respaldo); nunca en la portada. | Prompt. |
| 28 | Galería de componentes en `/dev/gallery`, accesible desde Perfil solo con `__DEV__`. | Revisión de componentes. |

## Técnica

| # | Decisión | Motivo |
|---|---|---|
| 29 | Rutas en `src/app` (no `app/`), con nombres en inglés para evitar choques: `/home`, `/medications`, `/summary`, `/tracking`… | Estructura real del repo; dos `index` en grupos distintos chocarían en `/`. |
| 30 | `Tabs` desde `expo-router/js-tabs` con barra propia; Stack con modales (`modal`, `fullScreenModal`, `transparentModal`). | `Tabs` de `expo-router` está deprecado en SDK 57. |
| 31 | Capas: pantalla → hook → caso de uso → contrato de repositorio → implementación local sobre Zustand persistido en AsyncStorage (`buddy-store-v1`). Solo `repositories/in-memory.ts` conoce el store. | Separación UI / lógica; Supabase podrá sustituir la implementación. |
| 32 | Datos ficticios en `src/features/*/demo-data.ts` con `demo: true`, generados relativos a la fecha de instalación. "Restablecer datos de ejemplo" en Privacidad. | La demo siempre tiene historial. |
| 33 | Horarios en hora local del dispositivo (`YYYY-MM-DD` + `HH:mm`). | Política simple para Fase 1; UTC en BD en Fase 2. |
| 34 | `web.output: "single"` | La web es solo apoyo de revisión; evita el render estático en Node con AsyncStorage. |
| 35 | Animaciones con Reanimated 4 usando `sv.set()` | Compatibles con React Compiler (regla `react-hooks/immutability`). |
| 36 | Recursos con rutas relativas (`../../assets/...`) | El alias `@/assets` no resuelve en Jest. |
| 37 | Identificadores `co.buddy.app` (Android e iOS) | Provisionales: confirmar antes de publicar. |
| 38 | `eslint.config.js` no se modificó (lo protege un hook) | `expo lint` igual termina sin errores. |
