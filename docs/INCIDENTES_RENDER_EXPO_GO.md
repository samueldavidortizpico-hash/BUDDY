# Incidentes de render y estabilidad — 2026-10-11

Auditoría estática y pruebas Jest del proyecto Expo SDK 57. Los errores de React se reprodujeron en el renderer de React Native de Jest con los stores de la aplicación. **Jest y Expo Doctor no son una ejecución en Expo Go; los resultados del dispositivo siguen pendientes.**

## Hallazgos y correcciones

| Incidente | Causa reproducida | Corrección | Evidencia y estado | Pendiente |
|---|---|---|---|---|
| ElderHome: `Maximum update depth exceeded` | `ElderScreen` devolvía un array `[]` nuevo desde el selector de Zustand 5 cuando faltaba `drafts[userId]['elder.seen']`. React 19 detectó snapshots nuevos durante `useSyncExternalStore` y entró en ciclo. | El selector devuelve `undefined`; un array estable a nivel de módulo sirve de fallback. | Reproducido con el selector original; ElderHome renderiza y resincroniza tomas una vez después de la corrección. | iOS y Android físicos. |
| Preview cuidador: el mismo ciclo y controles activos | Preview reutiliza `ElderScreen` y el mismo selector. `pointerEvents="none"` impedía el toque, pero no inhabilitaba semánticamente los controles ni protegía las acciones. | Pivotes del estado se estabilizan y las respuestas, llamadas, ayudas y confirmaciones quedan deshabilitadas o protegidas en `preview`. | La vista previa real de Expo Router renderiza. Una prueba verifica que el estado del paciente permanezca idéntico al pulsar un control deshabilitado; la pantalla normal conserva la confirmación y el descuento de existencias. | VoiceOver y TalkBack en dispositivo. |
| Redirección entre cuidador y adulto mayor | Los layouts resolvían el mismo `handoff` con reglas distintas: uno confiaba en la referencia almacenada; el otro exigía un paciente existente. Una entrega huérfana podía rebotar entre `/elder` y `/summary`. | Ambos guards y la ruta inicial comparten `selectValidHandoff`; solo se acepta el paciente existente, activo y propiedad del usuario. | Rutas reales de Expo Router pasan desde `/summary` y `/elder` con paciente ausente; también se prueban pacientes borrados o de otro usuario, sesión cerrada y entrega válida. | Prueba de navegación en dispositivos físicos. |
| Verificación del PIN | El teclado podía volver a enviar durante el borrado retardado; errores durante `unlock` dejaban `busy` activado; hash ausente eliminaba la entrega y trataba el PIN como correcto; cambiar sesión o entrega mientras se calculaba el hash podía mutar estado obsoleto. | Bloqueo sin temporizador entre envíos, limpieza asíncrona y desmontaje segura, errores visibles, verificación cerrada si falta el hash, sesión, entrega o credenciales cambian; alta de PIN valida que la cuenta siga siendo la misma. | PIN correcto/inválido, doble toque, error de hash, persistencia, bloqueo creciente, cambios de sesión/entrega, PIN malformado y alta fallida cubiertos. Flujo de alta y desbloqueo llega a las rutas reales con Expo Router. | Probar con el SecureStore real de iOS y Android. |
| ErrorBoundary: su fallback falla sin navegación | `ErrorBoundary` renderiza `ErrorState` → `EmptyState` → `BuddyRobot`, que invocaba `useIsFocused` sin contexto de ruta. El test original falló con `Couldn't find a navigation object`. | El robot mantiene la misma ilustración y movimiento con una prop explícita `navigationIndependent` en el fallback; elimina la suscripción al foco donde no hay ruta. | ErrorBoundary real renderiza, muestra reintento y soporta robot compacto sin navegador. | Confirmar la pantalla nativa de error y el botón Reintentar en dispositivo. |
| Pivotes vectoriales del robot | El parser de cadenas confundía el `%` decimal de los pivotes con la tercera coordenada. | Conservados los puntos y las animaciones; los seis orígenes usan `[x%, y%, 0]`. RobotStage y los indicadores de pensamiento detienen sus ciclos con movimiento reducido. | Regresión invoca el procesador instalado de React Native en nueve estados, tres escalas y modos animado/estático/reducido. | Comprobar rotación visual en ambas plataformas. |

## Revisión adicional y límites

- Los selectores de listas usan `useMemo` sobre referencias de colección; una regresión verifica que no se recree la lista ante un cambio ajeno y sí cambie ante datos propios. Tema normal, oscuro y alto contraste pasan pruebas de render en pantallas principales y secciones.
- `doseActions.sync` escribe únicamente al abrir la pantalla de paciente, no en preview. Las reglas de dosis, servicios clínicos, autenticación y datos remotos no se cambiaron. La prueba de interfaz confirma que la acción normal registra la toma y descuenta existencias.
- No hubo migraciones ni llamadas a Supabase. El proyecto local usa autenticación local salvo configuración explícita; la integración remota sigue fuera del alcance de estas pruebas. En el almacenamiento local general, `buddy.db` persiste mediante AsyncStorage: el PIN se guarda derivado con sal y hash, nunca en texto claro. Revisar almacenamiento cifrado del hash requeriría un cambio independiente de esquema y persistencia.
- No se observó un ciclo en onboarding, login, resumen, rutina, chat, salud o ajustes en las pruebas de montaje. Esos montajes no equivalen a recorrer todos los estados ni a un análisis estático exhaustivo de todas las interacciones.
- Se revisaron los scopes de los efectos de ElderScreen, bienvenida, resumen, onboarding, robot, tema y providers. El temporizador de agradecimiento ahora se limpia al desmontar. No se observaron escrituras durante render ni selectores de objeto nuevo adicionales en esas rutas.
- El mock oficial de Reanimated usado en Jest no implementa interpolación y devuelve `undefined`; el setup de Jest la convierte en identidad para que la medición de estilos mantenga números finitos. Esto valida valores y estructura de render. No simula el motor de animación nativo.
- Skills presentes y aplicadas: `buddy-testing` y `buddy-medical-safety`. `fixing-motion-performance`, `graphify`, `baseline-ui`, `fixing-accessibility`, `task-observer`, `playwright-cli`, Expo/React Native y Supabase no están instaladas entre las skills locales inspeccionadas. Se consultaron las referencias de SDK 57, React Native 0.86 y Expo Router.

## Validación local

| Comprobación | Resultado |
|---|---|
| `npm.cmd run typecheck` | Correcto |
| `npm.cmd run lint` | Correcto, sin advertencias |
| `npm.cmd run check:headers` | Correcto; 24 rutas revisadas |
| `npm.cmd test -- --runInBand` | Correcto; 13 suites, 415 pruebas aprobadas, 0 fallidas |
| `npx.cmd expo install --check` | Dependencias alineadas con SDK 57 |
| `npm.cmd ls --depth=0` | Dependencias instaladas; versiones principales React 19.2.3, RN 0.86.3, Zustand 5.0.15, Reanimated 4.5.1 |
| `npx.cmd --yes expo-doctor` | 21/21 verificaciones; sin problemas |
| iOS/Android Expo Go | No ejecutado; pendiente de dispositivo |

## Prueba física de Expo Go

Iniciar con `npm.cmd start -- --clear` y abrir el proyecto en Expo Go en cada plataforma. Validar: inicio de sesión y retorno; cuidador → Rutina → vista previa sin escrituras; alta de PIN de cuatro dígitos → modo adulto mayor → toma, agua y respuestas reales; PIN incorrecto, quinto intento y bloqueo; confirmar identidad y salida por PIN; tema claro/oscuro/alto contraste; ErrorBoundary y reintento; robot en idle, saludo, habla, celebración y reducción de movimiento. Confirmar que la consola nativa no muestre el error de profundidad de actualización, `transformOrigin` inválido ni errores de Reanimated. Registrar sistema operativo, dispositivo, versión de Expo Go y resultado por flujo.
