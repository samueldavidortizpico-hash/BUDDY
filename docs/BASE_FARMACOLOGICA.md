# Base farmacológica de BUDDY

Estado al 2026-10-12. Todo lo de este documento se verificó en las páginas oficiales o con llamadas reales a las APIs ese día (no de memoria). BUDDY **informa y advierte con fuente; nunca receta, no recomienda dosis ni cambios de tratamiento y nunca dice que algo es seguro**.

## Resumen

| Fuente | Para qué la usa BUDDY | Licencia y condiciones | Límites | Estado |
|---|---|---|---|---|
| **INVIMA: "Código Único de Medicamentos vigentes"** (datos.gov.co, conjunto `i7cb-raxc`) | Reconocer el medicamento por marca o principio activo: principios activos, concentración, forma, vía, ATC, titular y registro sanitario | **CC BY-SA 4.0**, atribución "Instituto Nacional de Vigilancia de Medicamentos y Alimentos - INVIMA". El índice derivado se distribuye con la misma licencia. | 155.807 filas (120.734 con CUM activo, 9.317 productos). Actualización **mensual** (datos al 2026-09-16). | **En uso**, sin conexión (`src/data/cum-index.json`, 1,4 MB) |
| **RxNorm API** (NLM) | Pasar del código ATC (o del nombre del principio activo) al RxCUI | Sin licencia para la API de RxNorm ("With one exception, no license is needed to use these APIs"). Atribución obligatoria de NLM (abajo). | Máximo 20 solicitudes por segundo por IP; NLM recomienda caché de 12–24 h. | **En uso** (en línea) |
| **MedlinePlus Connect** (NLM) | "Para qué se usa" en español y enlace a la página en español | Indicar que la información es de MedlinePlus.gov; **no usar su logotipo** ni insinuar respaldo. | Máximo 100 solicitudes por minuto por IP; caché de 12–24 h. **En español solo responde a RxCUI o NDC, no a texto.** | **En uso** (en línea) |
| **RxClass** (NLM) | Evaluada | Incluye contenido de SNOMED CT, sujeto a la licencia de afiliado de SNOMED CT. | Los códigos ATC de 5.º nivel no son clases: `classMembers?classId=N02BE01&relaSource=ATC` devolvió `{}`. | No se usa (la búsqueda directa `rxcui.json?idtype=ATC` resuelve lo mismo) |
| **DailyMed / openFDA** (FDA) | Posible fuente de advertencias de etiquetas oficiales (en inglés, de productos de EE. UU.) | openFDA: 240 solicitudes/min y 1.000/día por IP sin clave; con clave gratuita, 120.000/día. | Etiquetas de EE. UU., no del INVIMA: no equivalen a la ficha de un producto colombiano. | Fase 7, solo con revisión profesional |
| **API de interacciones de RxNav** | — | — | **Retirada** alrededor del 2 de enero de 2024. | **No se usa** |
| **Bases licenciadas de interacciones** (DrugBank, Lexicomp, Micromedex, First Databank, Medi-Span) | Interacciones y contraindicaciones (Fase 7) | Licencia comercial con contrato. DrugBank publica planes Academic, Team y Enterprise, "usage-based", **sin precio publicado** (cotización con ventas). | Costo y cobertura de nombres colombianos por confirmar con cada proveedor. | Pendiente (Fase 7) |

Atribución que BUDDY muestra en Ajustes > Acerca de BUDDY y en Legal > Fuentes y atribuciones:

> This product uses publicly available data from the U.S. National Library of Medicine (NLM), National Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and does not endorse or recommend this or any other product.

## Ruta de información en español (probada con llamadas reales)

`nombre escrito` → índice del INVIMA (marca o principio activo) → **ATC** del registro → `GET https://rxnav.nlm.nih.gov/REST/rxcui.json?idtype=ATC&id=<ATC>` → **RxCUI** → `GET https://connect.medlineplus.gov/service?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=<RxCUI>&knowledgeResponseType=application/json&informationRecipient.languageCode.c=es`

Resultados del 2026-10-12:
- `idtype=ATC&id=N02BE01` → RxCUI **161**; `C09CA01` → **52175**.
- MedlinePlus en español, RxCUI 52175 → "Losartán", resumen "El losartán se usa sola o en combinación con otros medicamentos para tratar la presión arterial alta…" y enlace `a695008-es.html`. RxCUI 161 → "Acetaminofeno".
- Alternativa para combinaciones o productos sin ATC de un componente: `approximateTerm.json?term=<principio activo>`. **Funciona con nombres en español**: "acetaminofen" → 161 (sinónimo de DrugBank en español), "losartan potasico" → 52175. Como es aproximada, BUDDY solo acepta el resultado si el título de MedlinePlus corresponde al mismo principio activo (si no, dice "No encontré información verificada").
- Se comparó con RxClass (no sirve para el 5.º nivel ATC) y con una tabla manual de sinónimos español-inglés: **no hizo falta**, porque el ATC del INVIMA y la coincidencia aproximada en español cubren la ruta.

## Índice sin conexión

- Script reproducible: `node scripts/build-cum-index.mjs` (descarga con la API de Socrata, filtra `estadocum = 'Activo'`, agrupa por expediente y guarda `src/data/cum-index.json` con diccionario de textos).
- **Actualización:** correrlo cada mes, después de la actualización del INVIMA; revisar el diff de `meta` (filas, productos y fecha) y correr `npx jest src/domain/__tests__/knowledge.test.ts`.
- Tamaño: 1,37 MB (9.317 productos, 11.658 textos únicos). Se carga de forma diferida la primera vez que se busca un medicamento.
- Búsqueda: tolera tildes y mayúsculas; por marca (Dolex → 8 presentaciones), por principio activo agrupado por concentración (losartán → 25, 50 y 100 mg), dentro de combinaciones (codeína, levodopa) y, si está mal escrito, **solo sugerencias** ("dolx" → "¿Quisiste decir Dolex?"). Nunca elige por el cuidador.

## Cobertura medida (100 medicamentos frecuentes en Colombia)

Lista escrita antes de medir: `tests/medicamentos-frecuentes.ts`. Prueba: `src/domain/__tests__/knowledge.test.ts`.

- **97/100 con coincidencia directa** en el índice.
- Sin coincidencia directa:
  - **atenolol:** 0 filas en el conjunto de vigentes (verificado con la API).
  - **digoxina:** 0 filas de digoxina (ATC C01AA05). Las 6 filas que contienen "digoxina" son **betametildigoxina** (C01AA08), un medicamento distinto que BUDDY no ofrece como coincidencia.
  - **donepezilo:** el registro lo escribe "Donepecilo" o "Donepezil"; BUDDY lo ofrece como sugerencia.
- La cobertura de "Para qué se usa" en español depende de MedlinePlus; se mide en dispositivo con red (pendiente).

## Qué se envía fuera del teléfono

Solo **códigos ATC, RxCUI o el nombre del principio activo**. Nunca nombres de personas, alergias, condiciones, horarios ni ningún dato del perfil. Lo verifica `src/__tests__/v24/knowledge-chat.test.tsx`, que revisa las URL consultadas.

## Niveles de alerta

1. **Nivel 1, administrativas (activas):** datos faltantes, horarios que se cruzan, formatos.
2. **Nivel 2, coincidencias deterministas (activas solo en desarrollo; `FEATURES.level2Review`):** alergia o "evitar" escritos frente al nombre o principio activo (con equivalencias editables y sinónimos acetaminofén/paracetamol); principio activo repetido, también dentro de combinaciones; alergia a una clase según el prefijo ATC (p. ej. penicilina ↔ J01C); misma clase ATC de 4.º nivel con principios distintos ("puede ser intencional"). Cada hallazgo guarda su fuente. **No se habilitan para pacientes reales sin revisión de un médico o farmacéutico** (en una build de producción están apagadas salvo `EXPO_PUBLIC_LEVEL2_REVIEW=on`).
3. **Nivel 3, interacciones y contraindicaciones por condición (desactivadas):** contrato `MedicationAnalysisService` que hoy responde `unavailable`, con la insignia "Pronto". Requieren una base licenciada, evaluación clínica, pruebas y revisión regulatoria (Fase 7). BUDDY no deriva contraindicaciones de códigos ATC.

Sin coincidencias, BUDDY dice "No encontré coincidencias con lo registrado (esta revisión solo compara los datos escritos)" y cierra siempre con "BUDDY advierte pero nunca receta ni cambia dosis. Por mayor seguridad, consulta con un médico o un farmacéutico."

## Incertidumbre y límites conocidos

- El índice tiene fecha de corte: un registro nuevo puede no aparecer hasta la siguiente actualización.
- Los textos del INVIMA son heterogéneos ("0,1 g" frente a "100 mg"; referencias como "por cada tableta recubierta contiene"). BUDDY normaliza solo para agrupar y muestra el texto de la fuente.
- "Qué debe saber" (precauciones, efectos secundarios) se muestra como enlace a la página de MedlinePlus: el servicio Connect solo devuelve el resumen de usos.
- MedlinePlus describe medicamentos de EE. UU.; el nombre comercial colombiano puede no coincidir. Por eso la ruta va por principio activo (RxCUI del ingrediente), no por marca.

## Preguntas para el abogado

1. ¿Mostrar información de un registro público y de MedlinePlus, y advertir coincidencias con alergias, convierte a BUDDY en software médico ante el INVIMA (Decreto 4725 de 2005 y normas de software como dispositivo médico)?
2. ¿La licencia CC BY-SA 4.0 del índice derivado obliga a algo más que la atribución y compartir el archivo de datos con la misma licencia?
3. ¿Consultar APIs de EE. UU. enviando solo nombres o códigos de medicamentos constituye transferencia internacional de datos personales o sensibles (Ley 1581 de 2012)?
4. ¿Qué textos de exención de responsabilidad son suficientes en la interfaz y en los términos de uso?
