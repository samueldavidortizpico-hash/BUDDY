# Auditoría integral BMAD de BUDDY

> Recuperada el 2026-10-23 de la transcripción de la sesión de auditoría (solo lectura sobre `main` en `c3d5a5f`). El texto es el informe original sin cambios de contenido; se guardó aquí porque la sesión no lo había escrito en `docs/`.

**Escala de confianza:** **Alta** es comprobado en el código o ejecutado. **Media** es un mecanismo claro que no reproduje en un dispositivo. **Baja** es una hipótesis.

---

## 1. Diagnóstico ejecutivo

BUDDY es un **prototipo muy bien construido que funciona en un solo celular**. No es todavía un producto que cumpla su promesa. La lógica de dominio es pura, determinista y honesta (`no_data`, `cannot_verify`, "entregado no es visto, visto no es tomado"), y es lo mejor del proyecto. Pero:

1. **La promesa "te enteras a tiempo" no es posible hoy entre dos celulares.** Cuentas, datos y alertas viven en el teléfono donde se crearon. El hijo solo se entera si tiene el teléfono del adulto mayor en la mano.
2. **Hay riesgos de seguridad del medicamento** en casos límite que las 731 pruebas no cubren.
3. **El esquema de persistencia y el diseño de sincronización ya preparado van a fallar con el uso real** o al activar Supabase.
4. **BUDDY Plus vende funciones que dependen de un backend que no existe.**

**Veredicto:** el producto no está listo para una beta con familias reales. No hace falta reconstruirlo. La base de dominio se conserva y el trabajo se concentra en la infraestructura.

---

## 2. Arquitectura

| ID | P | Hallazgo | Evidencia | Consecuencia | Conf. | Recomendación |
|---|---|---|---|---|---|---|
| **A-01** | **P0** | Sin backend: cuentas y datos existen solo en un teléfono | `src/infrastructure/index.ts:12-13` (local por defecto), `src/infrastructure/sync/engine.ts:18` (`SYNC_ENABLED = false`), `src/infrastructure/local/auth.ts:2-4` (las cuentas del adulto mayor se guardan en el SecureStore del administrador) | El adulto mayor no puede usar su propio celular. El "Pedir ayuda", la toma sin confirmar y el silencio no llegan al hijo | Alta | Decidir el backend antes de cualquier otra cosa (ver D-1) |
| **A-02** | **P1** | Toda la base es **un solo JSON** en AsyncStorage y se reescribe completa en cada cambio | `src/infrastructure/local/db.ts:140-147` (`persist` con `name: 'buddy.db'`) | Rendimiento que empeora con el volumen. En Android, AsyncStorage tiene un límite práctico por valor (CursorWindow de unos 2 MB), lo que trae riesgo de no poder leer la base y perder datos | Media (umbral sin medir) | Pasar los datos de salud a `expo-sqlite`, que ya está instalado, con una tabla por colección |
| **A-03** | **P1** | El registro de cambios **crece sin límite**: las entradas pendientes nunca se descartan y la sincronización está apagada | `src/infrastructure/local/db.ts:107`, `:168-173` | Cada escritura agrega unos 250 B para siempre. Agrava A-02 en semanas o meses de uso real | Alta | Limitarlo o desactivarlo mientras la sincronización esté apagada |
| **A-04** | **P1** | **Dos implementaciones de sincronización.** La conectada (`sync.ts`) ignora las reglas de conflicto del motor (`engine.ts`) y del plan | `src/infrastructure/index.ts:11` usa `syncAccount`. `src/infrastructure/supabase/sync.ts:75` gana el `updatedAt` más reciente. `src/infrastructure/sync/engine.ts:30-41` (rol y versión) solo lo usan las pruebas | Al activar Supabase, el adulto mayor podría pisar la rutina y el reloj del cliente decide qué dato gana | Alta | Mantener una sola implementación |
| **A-05** | **P1** | Pérdida de cambios en `sync.ts`: marca como sincronizada la copia que tenía antes del `await` | `src/infrastructure/supabase/sync.ts:65-67` | Una edición hecha durante la sincronización se pierde | Alta (inactivo) | Comparar la versión antes de marcar |
| **A-06** | **P1** | La descarga usa `gt('updated_at', since)` con fechas que pone cada cliente | `src/infrastructure/supabase/sync.ts:70` | Un celular con la hora atrasada escribe filas que el otro nunca descarga | Alta (inactivo) | Que el servidor asigne `updated_at` o un número de secuencia |
| **A-07** | **P1** | **No hay modelo de zona horaria.** Las tomas usan la fecha local de cada dispositivo | `src/domain/schedule.ts:3`, `src/state/care.ts:145-149` | Con hijos en el exterior (muy común en Colombia), el celular del hijo crearía tomas con su propia fecha | Alta | Guardar la zona horaria de la persona y calcular siempre con ella |
| A-08 | P2 | El motor de sincronización no clasifica `locations` como evento ni como rutina | `src/infrastructure/sync/engine.ts:21-23` | `acceptsChange` rechazaría la ubicación enviada por el adulto mayor | Alta (inactivo) | Agregarla a los eventos |
| A-09 | P2 | Las alertas al hijo **se calculan solo cuando él abre Inicio** | `src/features/summary/today.tsx:59-60` (único llamador de `evaluateAlerts`) | El paso "Avisar" no avisa: hay que ir a mirar. Esto pasa incluso en el mismo celular | Alta | Que el servidor evalúe y envíe push |
| A-10 | P2 | La reprogramación cancela todo y vuelve a programar en serie, sin exclusión entre ejecuciones | `src/infrastructure/notifications.ts:66-69`. Se dispara con cada cambio de `doses` (`src/features/elder/screen.tsx:117-140`) | Puede perderse un aviso en esa ventana, o un plan viejo puede volver a programar el "¿Ya tomaste?" de una toma ya confirmada | Media | Exclusión entre ejecuciones y cambios incrementales |

**Lo que está bien:** las capas `app → features → state → domain → infrastructure` se respetan, el dominio recibe `now` desde fuera, los interruptores de funciones están centralizados y no se ven dependencias circulares en las rutas que revisé.

**Complejidad innecesaria:** 17 stores, dos mecanismos para salir del modo adulto mayor (el PIN antiguo y la contraseña) y dos motores de sincronización.

---

## 3. Programación y pruebas

| ID | P | Hallazgo | Evidencia | Conf. |
|---|---|---|---|---|
| **Q-01** | **P1** | **La suite no está en verde en HEAD: 731 de 732.** Falla `pliega los mensajes anteriores` por tiempo de espera (5 s) | `src/__tests__/v24/chat-guided.test.tsx:141`. Ejecución completa: 46 suites, 38,5 s | Alta (falló aquí). Media sobre si es inestable o una regresión |
| Q-02 | P1 | Faltan pruebas justo donde están los riesgos: editar horarios de un medicamento (F-01), `syncAccount`, cobertura de días del plan de avisos | La única prueba del presupuesto valida el tope, no los días cubiertos (`src/domain/__tests__/notifications.test.ts:144-147`) | Alta |
| Q-03 | P2 | Las pruebas de Jest no ejecutan Yoga, notificaciones del sistema, Doze ni el permiso real. Ningún hito de V3.1 tiene evidencia en dispositivo ni en web (los documentos lo reconocen) | `docs/AUDITORIA_V3_1.md` | Alta |
| Q-04 | P3 | `tsc --noEmit` sin errores. `npm audit`: 48 vulnerabilidades (45 altas), casi todas en herramientas de compilación (`braces`, `node-forge` vía `@expo/code-signing-certificates`). La única que llega a la app es `decode-uri-component` vía `expo-router`, un riesgo de bloqueo por un enlace mal formado | `npm audit --omit=dev` | Alta |

---

## 4. Seguridad

| ID | P | Hallazgo | Evidencia | Consecuencia | Conf. |
|---|---|---|---|---|---|
| **S-01** | **P0** | Datos de salud **sin cifrar** en AsyncStorage: medicamentos, ánimo, ubicación, mensajes | `src/infrastructure/local/db.ts:143-146` | Son datos sensibles según la Ley 1581. Se exponen con una copia del almacenamiento o un dispositivo con root | Alta |
| **S-02** | **P1** | `android.allowBackup` no está configurado (Expo lo activa por defecto) | `app.json` (android sin `allowBackup`) | La base de salud viajaría a la copia en la nube de Google, mientras el SecureStore no se restaura. Al cambiar de celular quedan **datos sin cuenta que pueda abrirlos** | Media (verificar el valor por defecto de SDK 57) |
| S-03 | P2 | El hash del PIN (4 dígitos, SHA-256 con 300 iteraciones) está en la base sin cifrar, no en el SecureStore | `src/domain/types.ts:310-311`, `src/state/handoff.ts:11` | Con acceso a los archivos, las 10.000 combinaciones se prueban en milisegundos | Alta |
| S-04 | P2 | La función para derivar la contraseña es débil: SHA-256 iterado 1.000 veces, con una llamada nativa por iteración | `src/infrastructure/local/auth.ts:21`, `:45-51` | Es débil frente a fuerza bruta y lenta en Android de gama baja. Desaparece si el servidor gestiona la autenticación | Alta |
| S-05 | P2 | "Eliminar cuenta" no borra las cuentas gestionadas del adulto mayor (`buddy.managed.*`) | `src/infrastructure/local/auth.ts:232-240` | Quedan credenciales huérfanas. El borrado es incompleto frente al derecho de supresión | Alta |
| S-06 | P2 | Los errores de sincronización se descartan en silencio | `src/state/session.ts:48` `.catch(() => undefined)` | Viola "nunca falla en silencio" en cuanto se active Supabase | Alta |
| S-07 | P2 | La sesión de Supabase se guardaría en texto plano (localStorage sobre SQLite) | `src/infrastructure/supabase/storage.native.ts` | Es aceptable según la guía de Expo, pero en una app de salud conviene SecureStore para el token de renovación | Alta |
| S-08 | P3 | BUDDY Plus se decide en el cliente, con una opción de prueba guardada localmente | `src/state/entitlements.ts:12` (lee `buddyPlusTest` sin `__DEV__`; la opción solo aparece en desarrollo: `src/app/(caregiver)/settings/[section].tsx:458`) | Bajo impacto hoy | Alta |

**Lo que está bien:** no hay secretos en el repositorio, `.env*` está en `.gitignore`, el cliente rechaza `service_role`, la comparación de contraseñas es en tiempo constante, el bloqueo aumenta con los intentos, la recuperación usa un código de 128 bits y revocar la ubicación borra las coordenadas.

---

## 5. Problemas funcionales y de experiencia (incluye la fase 4, seguridad funcional)

| ID | P | Hallazgo | Evidencia | Consecuencia | Conf. |
|---|---|---|---|---|---|
| **F-01** | **P0** | **Riesgo de doble dosis.** Si el hijo cambia la hora de un medicamento el mismo día, se borran las tomas *pendientes* pero se conserva la *tomada*, y se crea una toma nueva a la nueva hora | `src/state/care.ts:70-79` y `missingDoses` en `src/domain/schedule.ts` | Ejemplo: tomó la de las 8:00, el hijo cambia el horario a las 9:00 y el adulto mayor ve "9:00 pendiente", recibe dos avisos y la alerta "sin confirmar". Puede tomarla otra vez | Alta (lectura del código; sin prueba) |
| **F-02** | **P1** | Los avisos programados cubren unos **1 o 2 días** con varios medicamentos: tope de 44 y dos avisos por toma | `src/domain/notifications.ts:50-52`, `:77-117` | Con 5 medicamentos tres veces al día solo cubre el día actual. Si no abre BUDDY, solo llega "Abre BUDDY" | Alta |
| **F-03** | **P1** | En Android no se declara el permiso de alarma exacta. Los avisos con fecha pueden retrasarse en Doze, sobre todo en Samsung y Xiaomi | `app.json` (`permissions: []`), `docs/NOTIFICACIONES.md:40-41` | Recordatorios tarde | Media (verificar en dispositivo) |
| **F-04** | **P1** | "Pedir ayuda" solo queda registrado en el teléfono. El texto "Quedó registrado que pediste ayuda" puede hacer creer que la familia lo sabe | `src/state/care.ts:269`, `src/i18n/es-CO.ts:414` | Falsa tranquilidad en el botón más crítico. Lo atenúan los botones de llamar y el 123 | Alta |
| F-05 | P2 | La polaridad del Sí/No de la automatización emocional depende del título, que se puede editar | `src/state/care.ts:256`, `src/state/automations.ts:9` (por defecto "¿Te sientes mal…?") | Si se cambia a "¿Estás bien?", el "Sí" levanta una alerta roja | Media |
| F-06 | P2 | "No tomé" después de "Tomé" no devuelve la existencia descontada | `src/state/care.ts:157` frente a `:172-175` | Existencias falsas y aviso de compra equivocado | Alta |
| F-07 | P2 | Al editar un medicamento, la alerta "sin confirmar" de la toma borrada queda pendiente | `src/state/care.ts:76-77` | Alerta engañosa | Media |
| F-08 | P3 | Se compara la fecha UTC de `createdAt` con la fecha local | `src/domain/status.ts:79`, `src/state/feed.ts:48,90` | Desfase de alertas después de las 7 p. m. en Colombia | Alta |

**Escenarios límite, hoy:**

| Escenario | Qué pasa |
|---|---|
| Sin conexión | Todo funciona, porque todo es local |
| App cerrada | Los avisos locales llegan dentro de la cobertura de F-02, pero el hijo no recibe nada |
| Permiso revocado | Aparece "No puedo verificar", pero solo en el mismo celular |
| Falla una notificación | Nadie se entera fuera de la app |
| Cambio de celular | No hay migración, y se puede perder el acceso (S-02) |

**Accesibilidad para personas mayores:** las decisiones son buenas (botones de 72, una cosa a la vez, voz, alto contraste). No están validadas con fontScale 2.0 ni con lector de pantalla en un dispositivo real.

---

## 6. Evaluación de negocio

- **El problema es real y el comprador es correcto:** hijos a distancia, con una diáspora colombiana grande.
- **La competencia ya resolvió el núcleo remoto.** Medisafe avisa a un "Medfriend" cuando se omite una dosis, con plan premium de unos USD 5 al mes según reseñas. Snug avisa a los contactos si no hay check-in en unos 10 minutos, con versión básica gratis. Hay además MedReminder, DoseAlly y Caring Village ([Caring Village](https://caringvillage.com/2026/05/13/medication-reminder-apps/), [Savvy Senior, marzo 2026](https://gazette.com/2026/03/10/savvy-senior-is-your-aging-parent-safe-at-home/), [Snug](https://aiht.substack.com/p/snug-safety)). **El diferenciador de BUDDY no puede ser "avisa al hijo"**, porque eso ya es lo mínimo esperado y BUDDY aún no lo tiene. Los diferenciadores defendibles son: español colombiano, la experiencia del adulto mayor, la verificación honesta ("No puedo verificar") y el índice del INVIMA.
- **BUDDY Plus contradice el principio 9 ("invitación familiar como crecimiento").** Cobra por "varios cuidadores", que es el motor de crecimiento, y por "reloj", que es Futuro, sin backend y con el interruptor `watch` apagado. Además se instaló `react-native-purchases` (`package.json:42`) antes de decidir los precios. Mi recomendación es que el plan pago sea la **capa remota**: alertas push al hijo, historial en la nube y reporte para el médico. La invitación familiar debería ser gratis.
- **Costos:** Supabase y Expo Push son bajos a escala de piloto. La comisión de las tiendas (15 a 30 %) pesa más que la infraestructura.
- **Legal:**
  - Ley 1581: los datos de salud son sensibles y exigen autorización explícita, previa e informada. La transferencia internacional aplica si el servidor está fuera de Colombia. Esto es conocimiento general y conviene confirmarlo con un abogado.
  - INVIMA: un software es dispositivo médico según la *finalidad prevista* que declara el fabricante (Decreto 4725 de 2005, modificado por el 582 de 2017; hay un borrador de reemplazo de diciembre de 2025) ([INVIMA, preguntas frecuentes](https://www.invima.gov.co/productos-vigilados/dispositivos-medicos/preguntas-frecuentes-dispositivos), [MinSalud](https://www.minsalud.gov.co/Anexos_Normatividad_Nuevo/3%20Memoria%20Justificativa%20decerto%20nuevo%20dm.pdf)). Mantener `level2Review` apagado y no hacer afirmaciones clínicas es la decisión correcta.
- **Retención:** depende de que el adulto mayor abra la app, y F-02 lo castiga. No verifiqué datos de retención de la categoría.
- **El MVP es viable** con este alcance: medicamentos, confirmación, alerta remota, chequeo diario y resumen. Todo lo demás se puede posponer.

---

## 7. Contradicciones entre documentación y código (fase 6)

| ID | Documento dice | Código / realidad |
|---|---|---|
| C-01 | `sync.ts:8`: "tablas en supabase/migrations (borrador)" | No existe la carpeta ni ningún `.sql` |
| C-02 | `SUPABASE_PLAN.md`: reglas por rol y versión | `sync.ts` aplica "gana el último", según el reloj del cliente (A-04) |
| C-03 | ROADMAP: "Aviso escalonado: Hecho" | Al hijo no le llega ningún aviso; tiene que abrir Inicio (A-09) |
| C-04 | `features.ts`: `watch` es Futuro y está apagado | El hito 7 lo muestra en Salud detrás del candado de Plus |
| C-05 | Auditorías: "722/723 aprobadas" | En HEAD: 732 pruebas, **1 falla** (Q-01) |
| C-06 | `docs/ARQUITECTURA_ACTUAL.md` | Desactualizado: BUDDY aparece como pestaña y la salida como PIN |
| C-07 | `app.json`: "Versión de demostración con datos de ejemplo" | Ya no hay datos sembrados; el modo demostración está aislado |
| C-08 | Los hitos 1 a 7 figuran como "implementados" | Ninguno tiene verificación visual en web ni en dispositivo. Los propios documentos lo dicen, pero ROADMAP y PANTALLAS los marcan como hechos |

---

## 8. Bloqueadores de la beta

1. **A-01:** backend y push para las alertas al hijo.
2. **F-01:** doble dosis al editar horarios.
3. **S-01 y S-02:** datos de salud cifrados y fuera de las copias de seguridad.
4. **F-02 y F-03:** confiabilidad de los avisos con varios medicamentos y en Android real.
5. **A-07:** modelo de zona horaria, antes de sincronizar dos celulares.
6. **Consentimiento según la Ley 1581 y revisión legal.** Las pantallas legales en `src/app/legal/[doc].tsx` no las audité.
7. **Q-01:** la suite en verde y pruebas de los casos F-01 y F-02.

## 9. Conservar

- El dominio puro con `now` inyectado y las reglas de estado en orden fijo (`src/domain/status.ts`).
- La honestidad de los estados (`verify`, `doseStage`, `no_data`).
- La idempotencia de las existencias.
- `SyncMeta`, el borrado lógico y `db.subscribe`.
- La matriz `can()` de permisos.
- Las reglas de seguridad médica: no propone dosis, no corrige nombres de medicamentos por su cuenta, cita fuentes y fechas.
- El corpus del intérprete.
- Los interruptores de funciones.
- La higiene de secretos.
- La experiencia del adulto mayor.

## 10. Simplificar o eliminar

- **Dejar un solo motor de sincronización** y borrar el otro.
- **Dejar un solo mecanismo de salida** (contraseña) y retirar el PIN de entrega.
- **Sacar de V1** el reloj y podómetro, `react-native-purchases`, el evaluador de alimentos y la revisión de nivel 2. Se pueden conservar detrás de interruptores, pero no en la oferta comercial.
- **Llevar la documentación a OpenSpec:** hoy son 22 documentos, 6 auditorías y un `DECISIONS.md` de 40 KB. Así las reglas que no se pueden romper quedan como requisitos verificables.

## 11. Decisiones pendientes

| # | Decisión | Mi recomendación (y la contraparte) |
|---|---|---|
| D-1 | Supabase o AWS | Supabase: ya está el adaptador, RLS y Edge Functions, y es tecnología conocida. AWS da más control a cambio de mucho más trabajo |
| D-2 | ¿Dónde se evalúan las alertas? | En el servidor, con tareas programadas y push. En el cliente nunca podrá avisar con la app cerrada |
| D-3 | Persistencia local | SQLite con cifrado. Hay que evaluar la opción, porque el cifrado puede requerir build propia |
| D-4 | Qué incluye Plus | La capa remota. La invitación familiar, gratis |
| D-5 | Mercado | ¿Hijos en el exterior? Eso decide A-07 |
| D-6 | Respaldo de alertas | ¿SMS o WhatsApp si no hay respuesta? Agrega costo y complejidad legal |
| D-7 | Clasificación ante el INVIMA | Confirmar con un especialista que la finalidad declarada se mantiene como no médica |

## 12. Plan priorizado (sin implementar; cada punto puede ser un cambio de OpenSpec)

| Ola | Cambio sugerido | Hallazgos |
|---|---|---|
| **0 (días)** | `corregir-edicion-horario-tomas` | F-01, F-07, F-06 + pruebas |
| | `estabilizar-suite` | Q-01 |
| | `limitar-changelog-local` | A-03 |
| **1 (bloqueadores)** | `decidir-backend` (ADR) | D-1, D-2 |
| | `modelo-zona-horaria` | A-07, F-08 |
| | `persistencia-sqlite-cifrada` | A-02, S-01, S-02, S-03 |
| | `sincronizacion-unica` | A-04, A-05, A-06, A-08, S-06, C-01, C-02 |
| | `alertas-remotas-push` | A-01, A-09, F-04, C-03 |
| | `confiabilidad-recordatorios` | F-02, F-03 + prueba en dispositivo |
| | `consentimiento-ley-1581` | Legal |
| **2** | `borrado-completo-cuenta` | S-05 |
| | `automatizaciones-respuestas-tipadas` | F-05 |
| | `existencias-al-corregir` | F-06 |
| **3** | `redefinir-buddy-plus` | B, C-04 |
| | `simplificar-salida-y-stores` | Sección 10 |
| | `specs-base-del-nucleo` | C-06, C-08 |

