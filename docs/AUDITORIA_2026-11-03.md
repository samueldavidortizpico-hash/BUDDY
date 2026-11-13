# Auditoría integral de BUDDY — 3 de noviembre de 2026

Revisión: `758efce`, rama `chore/arquitectura-buddy`. Código inicialmente sin cambios locales. Auditoría sin modificar código de la aplicación ni dependencias.

## Dictamen

BUDDY tiene una base visual coherente, una experiencia del adulto mayor bien enfocada y una cantidad considerable de lógica de dominio cubierta por pruebas. Su madurez visual es mayor que la de su infraestructura remota. No recomiendo presentarlo todavía como un servicio de cuidado entre teléfonos preparado para datos reales: hay un fallo reproducido de aislamiento entre cuentas locales, cifrado desactivado en producción y funciones remotas incompletas.

La prioridad es proteger los datos y hacer inequívoco qué funciona en este dispositivo. Después conviene corregir accesibilidad, simplificar Inicio y mejorar la explicación de las métricas. Añadir más animaciones o pantallas antes de resolver esto aumentaría el trabajo sin cerrar los riesgos principales.

## Alcance y evidencia

Se inspeccionaron componentes compartidos, temas, navegación, arranque, autenticación local y Supabase, persistencia, sincronización, sesiones, permisos, medicamentos, suscripciones, métricas y CI. Se generó una exportación web del código actual; no se usaron capturas antiguas como prueba del estado actual.

| Comprobación | Resultado observado |
|---|---|
| `npm run lint` | Sin errores reportados |
| `npm run typecheck` | Sin errores reportados |
| `npm test -- --runInBand` | 53 suites, 909 pruebas aprobadas; 120,615 s |
| `npx expo install --check` | Dependencies are up to date |
| `npm run check:headers` | 37 rutas; comprobación aprobada |
| Exportación web Expo 58 | Aprobada, 1790 módulos |
| Capturas actuales | 12: login, Inicio, Rutina, adulto mayor, Salud y chat; 390 × 844, solicitud de claro/oscuro |
| Pruebas dirigidas de navegador | Lectura cruzada entre cuentas reproducida; cinco rutas a 360 × 780; sin `pageerror` en esa ejecución |
| `npm audit --omit=dev` | 29 entradas afectadas: 28 moderadas y 1 baja; 0 altas/críticas |

Evidencias: [capturas](../.audit-2026-11-03/capturas/), [reproducción y textos](../.audit-2026-11-03/probes.json), [script reproducible](../.audit-2026-11-03/probes.mjs), [dependencias](../.audit-2026-11-03/dependencies.json). Exportación en `.audit-2026-11-03/web`.

La apariencia del adulto mayor tiene preferencias independientes: las capturas iniciales denominadas claro/oscuro muestran su configuración automática, no dos temas forzados. La prueba dirigida posterior configura `elder.screen.appearance` y `textScale` para evaluar su alto contraste y texto máximo.

**Límites:** inspección amplia basada en riesgos, no lectura exhaustiva de cada línea. No se midieron FPS, batería, memoria ni tiempos de respuesta en móviles. No se verificaron VoiceOver/TalkBack, teclado nativo, compras reales, permisos en dispositivo, notificaciones con app cerrada, políticas de un Supabase desplegado ni funcionamiento entre dos teléfonos. Las capturas son de React Native Web; no certifican iOS/Android. No se realizó pentest remoto ni revisión clínica/legal.

## Puntos fuertes que conviene conservar

1. **Identidad y consistencia.** Paleta petróleo/turquesa, superficies suaves, iconos por dominio y tipografía Manrope. Oscuro está diseñado con colores propios. Los tokens centralizan buena parte de colores, tamaños, radios y movimiento (`src/theme/index.ts`).
2. **Adulto mayor con una tarea principal.** Medicamento, hora, cantidad e instrucciones tienen jerarquía clara. Las acciones “Ya lo tomé”, “Más tarde” y “No lo tomé” se distinguen; llamada y ayuda permanecen accesibles en el pie. [Captura](../.audit-2026-11-03/capturas/adulto-mayor-390-claro.png).
3. **Controles compartidos cuidados.** Altura estándar de 56 dp y variante elder de 72; controles compactos amplían el toque con `hitSlop`. Botones conservan tamaño al cargar, deshabilitan nuevas pulsaciones y proporcionan nombre accesible.
4. **Movimiento con propósito.** `PressableScale`, `Appear` y botones de confirmación usan transformaciones/opacidad y contemplan reducir movimiento. La entrada escalonada está limitada. El chat usa `FlatList`.
5. **Separación de responsabilidades.** Carpetas de dominio, infraestructura, estado, componentes y funcionalidades; TypeScript estricto y proveedores intercambiables. Es una base que permite evolucionar sin reescribir toda la aplicación.
6. **Regresiones de dominio.** Existen pruebas específicas para dosis, existencias, autenticación, navegación, permisos, cifrado y contraste. El código distingue falta de confirmación de una toma realmente omitida y conserva historial de cambios de horario. Las pruebas no equivalen a validación clínica.
7. **CI y alcance explícito en varias pantallas.** CI ejecuta tipos, lint, encabezados y Jest con token de solo lectura. Existen explicaciones honestas sobre sincronización local, recuperación y límites del asistente. Hay que hacerlas consistentes desde la entrada.

## Hallazgos prioritarios

Prioridad: **P0** corregir antes de usar datos reales en cuentas compartidas; **P1** antes de producción o activar la capacidad afectada; **P2** siguiente ciclo de calidad. “Estático” significa demostrado en el código, sin reproducción del servicio o dispositivo implicado.

### S01 — P0: lectura de medicamentos de otra cuenta local

**Reproducido en web.** `src/state/data.ts`, función `useRecord`, devuelve por ID sin comprobar `ownerUserId`. `src/app/(caregiver)/medication/[id].tsx:40` consume ese registro. El layout comprueba sesión/rol, pero no pertenencia del medicamento.

Con datos sintéticos de la cuenta A persistidos, sesión de cuidador B y ruta `/medication/cap-m1`, se mostraron nombre, concentración, horario, instrucciones y existencias de A. No se necesitó modificar el registro del medicamento. La prueba sembró el estado para representar dos cuentas en el mismo almacenamiento; no demuestra un ataque remoto. [Captura](../.audit-2026-11-03/cross-account.png).

**Corrección:** resolver recursos dentro del ámbito de la cuenta y persona autorizadas; verificar también en los casos de uso de escritura. `medicationActions.update/remove` y `db.update` reciben IDs sin validar dueño: hay una vía de escritura que debe cerrarse, aunque esta auditoría solo reprodujo lectura. Añadir regresiones A/B, enlace directo, sesión cerrada y rol vinculado. Un UUID difícil de adivinar no sustituye autorización.

### S02 — P1: datos locales sin cifrado en producción

**Estático.** `src/config/features.ts` activa `encryptedStorage` únicamente bajo `__DEV__` y fuera de Jest. `src/infrastructure/local/db.ts:151` usa AsyncStorage sin esa bandera. La base incluye datos de cuidado de varias cuentas. Esto no significa que otras apps puedan leer libremente el sandbox del sistema, pero deja sin protección criptográfica propia una extracción del almacenamiento.

**Corrección:** completar la validación de migración, respaldo, reinstalación, pérdida de clave y recuperación antes de habilitar el cifrado en producción. No basta con cambiar una bandera: el envoltorio también contempla fallback en claro, que debe tener política explícita y estado visible. En web `secure-storage.ts` usa AsyncStorage; mantenerla como entorno de demostración hasta definir su seguridad.

### S03 — P1: roles remotos derivados de metadatos editables

**Estático; condicionado a activar Supabase.** `src/infrastructure/supabase/auth.ts:23` obtiene `role`, `ownerId` y `elderId` de `user_metadata`. Esos valores influyen en rutas y ámbito de datos del cliente. Supabase advierte que los metadatos modificables por el usuario no deben respaldar autorización ([documentación RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)). No se verificaron políticas remotas ni se afirma que permitan escalar privilegios.

**Corrección:** membresías/roles autorizados por servidor, políticas RLS y pruebas negativas de lectura/escritura entre usuarios y roles. Nunca confiar en un guard de navegación como única defensa.

### S04 — P1: hash de contraseña local personalizado

**Estático.** `src/infrastructure/local/auth.ts` usa 1000 iteraciones de SHA-256. Tiene sal aleatoria, comparación sin retorno temprano por contenido y bloqueo de intentos: son medidas positivas. Sin embargo, no usa una función estándar diseñada para contraseñas; el bloqueo no protege frente a descifrado por fuerza bruta fuera de la aplicación si se extraen hashes.

**Corrección:** usar autenticación remota validada o una KDF estándar mediante una implementación apropiada para la plataforma, con migración de hashes y costo medido. [OWASP recomienda algoritmos específicos de almacenamiento de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### S05 — P1: eliminación de cuenta local incompleta

**Estático.** `deleteAccount` en `local/auth.ts` elimina la cuenta principal y sesión; `sessionActions.deleteAccount` purga sus registros de dominio. No recorre las cuentas administradas ni sus índices `buddy.managed.*`/`buddy.owner.*`. Quedan credenciales y vínculos locales huérfanos.

**Corrección:** inventario y eliminación transaccional de credenciales, accesos vinculados, índices y recursos asociados; probar reinicio e intento de acceso de cada rol después de borrar al administrador. Revisar además que `getSession` revalide cuenta existente y revocación, en lugar de confiar únicamente en el JSON de sesión.

### R01 — P1: sincronización aún no es un servicio completo

**Estático.** `src/infrastructure/sync/engine.ts` declara `SYNC_ENABLED=false`; el proveedor Supabase deja gestión de cuentas vinculadas sin implementar. El otro camino, `supabase/sync.ts`, existe detrás de configuración. Son rutas distintas: activar variables no completa el motor de conflictos ni el producto entre teléfonos.

`src/state/session.ts:48` inicia `syncIfRemote` al establecer usuario y descarta el error con `.catch(() => undefined)`. No se encontró otra llamada productiva a esa fachada en `src`. Las modificaciones posteriores pueden permanecer locales sin una sincronización periódica o por eventos.

**Corrección:** escoger un único flujo de sincronización, outbox persistente, reintentos, estado pendiente/error visible y pruebas en dos dispositivos con desconexión, reconexión y cambios concurrentes.

### R02 — P1: posible pérdida de actualización durante push

**Estático, condicionado a Supabase.** `supabase/sync.ts:67` reintroduce la copia `pending` como sincronizada después del `await upsert`. Si el usuario modifica ese registro mientras la petición está en vuelo, la copia anterior puede sobrescribir el cambio más reciente y marcarlo sincronizado.

**Corrección:** confirmar solo la versión enviada si sigue siendo la actual, preservar nuevas modificaciones como pendientes y serializar las sincronizaciones por cuenta. Prueba necesaria: retrasar artificialmente el transporte, editar durante la espera y comprobar que la segunda edición sobrevive y se envía.

### R03 — P1: lectura remota sin paginación y cursor de reloj cliente

**Estático.** `supabase/sync.ts:70` hace `select('*')` sin paginar; al final avanza el cursor a `startedAt` generado en el dispositivo. Una respuesta limitada por el servidor o diferencias de reloj pueden omitir filas y dejar fuera eventos posteriores.

**Corrección:** cursor de servidor estable, orden total como `(updated_at,id)`, paginación hasta agotar resultados y avance solo después de aplicar el lote completo. Probar más filas que el límite configurado y dispositivos con horas distintas. No se midió el límite de un servidor real.

### M01 — P1: suscripción sin identidad de cuenta y override no limitado en lectura

**Estático; compras no ejecutadas.** `src/domain/entitlements.ts` configura Purchases solo con `apiKey`; `getPlan` ignora el usuario recibido y no hay `logIn/logOut`. En un teléfono con varias cuentas, el entitlement no se vincula explícitamente a la identidad BUDDY. [RevenueCat explica la diferencia entre identidad anónima y personalizada](https://www.revenuecat.com/docs/customers/identifying-customers).

Además, `src/state/entitlements.ts` consume `buddyPlan`/`buddyPlusTest` persistidos sin comprobar entorno. La interfaz de prueba sí usa `FEATURES.devTools`, pero la lectura confía en el valor guardado incluso fuera de esa interfaz.

**Corrección:** vincular compras a la cuenta autorizada, gestionar cambios de sesión y compartir derechos familiares mediante backend; ignorar overrides en producción. Validar compra/restauración/cambio A-B en sandbox antes de cobrar.

## Diseño, contenido y accesibilidad

### U01 — P1: el mensaje de entrada promete alcance remoto no disponible

La captura de login dice “Cuida a tu familia desde donde estés”; la selección de rol habla de cuidar a distancia (`src/i18n/es-CO.ts:92,157`). Otras pantallas explican correctamente que hoy los datos viven en el teléfono. El problema es la contradicción y el momento en que se descubre, no una ausencia total de avisos.

**Mejora:** indicar “En este dispositivo” o “Demostración local” en el recorrido inicial; explicar qué puede hacerse hoy antes de crear accesos. Presentar conexión y última sincronización junto a información remota cuando exista. Mantener la redacción prudente de ayuda: registrar una petición no equivale a haberla enviado ni atendido.

### U02 — P1: botón menta fuera del contraste de texto normal

`src/components/button.tsx` fija degradado `#0C939B → #14A3A6` con blanco, y usa variante tipográfica `h3`, que mide **18 px**, no los 20 que afirma el comentario. El contraste está aproximadamente entre **3,7:1 y 3,1:1**. En web, 18 px en negrita no alcanza el umbral de texto grande; corresponde 4,5:1 ([criterio W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).

Además, en alto contraste esta variante conserva degradado/blanco y solo agrega borde. Se usa en bienvenida y onboarding. Las pruebas de contraste cubren tokens, pero no esta pareja literal.

**Mejora:** usar los tokens de CTA accesible y colores planos en alto contraste; probar cada variante renderizada y sus tamaños reales, incluidos estados. Evitar justificar contraste con un tamaño que el componente no aplica.

### U03 — P2: barra inferior no acompaña el tamaño de letra

`bottom-tab-bar.tsx:196,209` fija `maxScale={1}`, con texto de 13 px que puede reducirse hasta 0,8. En la [captura a texto máximo](../.audit-2026-11-03/summary-360-hc-max.png), el contenido crece mucho y las etiquetas de navegación permanecen pequeñas.

**Mejora:** diseño alternativo para texto grande, altura adaptable y límites que prioricen lectura. Probar especialmente “Ubicación”, orientación permitida y escala del sistema. No es suficiente que el resto de la pantalla pueda llegar a 200 %.

### U04 — P2: Inicio dedica demasiado espacio a un aviso repetido

En la [captura actual](../.audit-2026-11-03/capturas/inicio-390-claro.png), la tarjeta “Atención” y la tarjeta “3 novedades” repiten el problema de existencias. La información siguiente baja cerca de la barra flotante. Con texto máximo, la primera alerta ocupa casi toda la vista.

**Mejora:** un bloque principal con mensaje y acción concreta (“Revisar existencias”), seguido por “Otras 2 novedades”. Priorizar próxima acción y estado verificable; reducir espacio decorativo antes de reducir fuente. La superposición visible durante scroll no demuestra que el contenido final sea inaccesible: el contenedor reserva padding inferior.

### U05 — P2: períodos y denominadores de Salud poco explícitos

La captura de Inicio muestra “0 de 2” y Salud “0 de 1” con la misma semilla. Esto puede responder a distintas reglas de cálculo; no se declara un error matemático sin reproducir ambos cálculos en un instante controlado. El usuario, sin embargo, no recibe una explicación del denominador.

`features/health/metrics.tsx` muestra barras de últimos siete días para ánimo/sueño incluso cuando el selector dice “Hoy”. También titula “Salud mental” una respuesta simple de ánimo.

**Mejora:** etiquetas explícitas: “Tomas programadas hoy”, “Tomas evaluadas hasta ahora”, “Ánimo reportado” y “Últimos 7 días”. Añadir leyenda textual de barras y distinguir sin registro de valor cero. Mantener carácter descriptivo, sin presentar estas respuestas como evaluación clínica.

### U06 — P2: categorías de Rutina parcialmente ocultas

La [captura de Rutina](../.audit-2026-11-03/capturas/rutina-390-claro.png) muestra Medicamentos, Agua, Preguntas y una cuarta categoría cortada. El desplazamiento horizontal puede funcionar, pero la capacidad de descubrir las demás categorías es débil.

**Mejora:** indicador de desplazamiento, menú “Más” o categorías que se adapten en filas con texto grande. Probar que cuidadores nuevos encuentran citas sin instrucciones.

### U07 — P2: chat e iconos requieren más explicación contextual

El chat ofrece acciones guiadas útiles y tiene buen orden visual. Los iconos de ojo, suma, cámara y galería dependen de aprendizaje visual. La interfaz de conversación puede generar expectativa de IA abierta aunque el motor sea de reglas locales.

**Mejora:** ayuda breve “Te ayudo a organizar recordatorios; revisa y confirma cada propuesta”, etiqueta visible para “Ver su pantalla” y explicación al adjuntar una imagen. Mantener las propuestas estructuradas y la confirmación antes de cambiar datos.

### U08 — P2: texto máximo desplaza la tarea principal del adulto mayor

Con sus preferencias propias en alto contraste y texto máximo, a 360 × 780, el saludo ocupa tres líneas y la fecha otras dos; la hora, cantidad y confirmación del medicamento quedan fuera de la primera vista. El pie de llamada/ayuda sigue visible. [Captura](../.audit-2026-11-03/elder-360-hc-max.png). No se afirma que los controles sean inaccesibles al desplazar.

**Mejora:** reducir elementos secundarios cuando crece el texto: saludo breve, fecha compacta y menos separación vertical; priorizar nombre, dosis y acción sin recortar ni reducir el texto solicitado. Validar con nombres largos y usuarios con baja visión, además de comprobar scroll y foco.

## Animaciones y rendimiento

La base de microinteracciones es adecuada: presión, aparición y confirmación proporcionan respuesta sin dominar la tarea. El robot actual es una imagen de marca (`components/robot/index.tsx`), no un personaje articulado; los efectos de sus contenedores no deben describirse como animación expresiva del personaje.

**A01 — P2:** `Sparkle` en `features/boot/boot-screen.tsx` inicia repetición infinita sin cancelación explícita en el cleanup, a diferencia de `Shine` en el botón. Añadir cancelación y comprobar ciclos montaje/desmontaje. Esto es una diferencia de ciclo de vida en el código, no una fuga de memoria medida.

**A02 — mejora:** reservar el brillo repetido cada cinco segundos para situaciones que realmente necesiten atraer atención. Medir si distrae en bienvenida/onboarding y suspender efectos decorativos fuera de foco. Mantener feedback de toque aun cuando se reduzca movimiento.

**A03 — pendiente de dispositivo:** medir arranque frío/caliente, navegación, teclado, scroll y animaciones con reducción de movimiento. Capturas y pruebas unitarias no permiten afirmar 60 FPS. Comparar Android de gama baja e iPhone; registrar frames lentos y memoria antes/después de navegar repetidamente.

## Escalabilidad y mantenimiento

**E01 — P1 antes de crecer el historial.** `local/db.ts` persiste un único estado JSON con todas las colecciones; no usa `partialize` para limitar ese volumen. Cada actualización puede serializar el conjunto, y `useRecords` filtra tablas completas. El changelog limita entradas sincronizadas, pero conserva pendientes; con sincronización desactivada estas crecen.

**Mejora:** medir primero con 30/90/365 días y varios adultos mayores; después usar almacenamiento incremental e índices por cuenta/persona/fecha, lotes transaccionales y política de retención. No se propone eliminar el historial clínicamente relevante ni los eventos pendientes para ganar rendimiento.

**E02 — P2.** La exportación produce un bundle común de aproximadamente 2 MB, entry de 1,1 MB y chat de 1,5 MB, sin compresión; hay carga por rutas. Son tamaños de archivos, no descarga inicial medida. Perfilar qué módulos y catálogos se necesitan para cada pantalla, y cargar los pesados bajo demanda. No extrapolar estos tamaños a un APK.

**E03 — P2.** La cobertura funcional es amplia, pero las 909 pruebas no descubrieron la lectura cruzada ni el contraste menta. La CI actual no ejecuta los recorridos visuales ni integra pruebas contra un backend real. Añadir regresiones de acceso, concurrencia y pares de contraste del componente; después pruebas de navegación con teclado/texto grande y una matriz nativa. No usar el número de pruebas como porcentaje de seguridad.

**E04 — P2.** Hay muchos documentos y scripts versionados por etapas. Consolidar una entrada de documentación con estado vigente, funciones locales/remotas y evidencias de la última compilación. Los comentarios deben describir la implementación: el botón de 18 px documentado como 20 demuestra por qué conviene verificar las afirmaciones.

**E05 — dependencia de producción por revisar.** `npm audit` detecta tres avisos de origen en `deepmerge`, `glob` y `minimatch`, propagados a 29 entradas del árbol. Buena parte aparece en herramientas Expo aunque esté bajo dependencias de producción. No son 29 vulnerabilidades independientes ni 29 ataques demostrados en la app. Revisar rutas de exposición y actualizar de forma compatible con Expo; no ejecutar `audit fix --force` indiscriminadamente. `expo install --check` aprobado significa compatibilidad declarada, no ausencia de vulnerabilidades.

## Orden de ejecución recomendado y aceptación

| Orden | Trabajo | Criterio para considerarlo resuelto |
|---|---|---|
| 1 | Aislamiento por cuenta/persona en lectura y escritura | Prueba A/B y enlaces directos no revelan ni alteran datos ajenos; todos los roles cubiertos |
| 2 | Cifrado y ciclo de vida de cuentas | Migración/reinicio/pérdida de clave comprobados en móvil; borrar cuenta revoca accesos vinculados |
| 3 | Contrato de producto local y remoto | Entrada, accesos, ayuda y estados indican lo que funciona sin servidor |
| 4 | Contraste menta, navegación grande, Inicio y métricas | Variantes verificadas; 360/390 px, texto máximo y lectores de pantalla; mensajes entendidos en prueba con usuarios |
| 5 | Backend y sincronización única | RLS negativa, paginación, conflictos, reintentos y cambio durante push probados en dos clientes |
| 6 | Compras por identidad | Compra/restauración/cambio de cuenta probados; override ignorado en build de producción |
| 7 | Volumen y movimiento | Matriz de rendimiento nativo con historial creciente; presupuestos acordados a partir de mediciones |

La auditoría entrega hallazgos y evidencia. No corrige el código, no publica y no convierte los pendientes nativos/remotos en resultados aprobados.
