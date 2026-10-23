# Pruebas en dispositivo (iOS y Android)

Lista para una persona con un iPhone y un Android reales y Expo Go (SDK 57). El dueño arranca el servidor con `npx expo start --tunnel --clear` y abre el QR. Marca cada casilla al aprobar; si algo falla, anota modelo, versión del sistema y qué pasó.

Lo que **no** se puede comprobar en web y por eso está aquí: teclado real, gestos, hápticos, notificaciones, permisos, efecto glass, splash nativo, lector de pantalla y rendimiento.

## Ronda V3.1 (2026-10-23): navegación nueva

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 3.1.1 | En Inicio toca el avatar arriba a la derecha. | Abre Ajustes > Cuenta; ya no hay un botón superior que abra BUDDY. | ☐ | ☐ |
| 3.1.2 | Revisa la barra inferior. | Orden: Inicio, Salud, BUDDY al centro con robot mint y contador rojo si hay novedades, Ubicación, Rutina. Todos los controles tienen objetivo de al menos 64 dp y VoiceOver/TalkBack anuncia sus nombres. | ☐ | ☐ |
| 3.1.3 | Toca Ubicación. | Abre “Dónde está [nombre]” con flecha atrás; solo presenta ubicaciones registradas y respeta el consentimiento. | ☐ | ☐ |
| 3.1.4 | Toca el botón central BUDDY y escribe algo. | Chat a pantalla completa, sin barra inferior; el compositor queda visible sobre el teclado. Flecha atrás vuelve a la pestaña anterior. | ☐ | ☐ |
| 3.1.5 | Activa “Reducir movimiento” del sistema y repite la navegación. | El indicador respeta movimiento reducido y ninguna transición bloquea el toque. | ☐ | ☐ |

La prueba automatizada de esta ronda cubre presencia y navegación lógica de las cinco posiciones. No sustituye esta comprobación con escalado de texto ni al lector de pantalla nativo.

### Hito 4 — chat y automatizaciones

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 4.1 | En BUDDY pide “agrégale losartán a las 6 y pregúntale cómo se siente a las 8”. | BUDDY crea la pregunta a las 8 y mantiene en el chat la tarjeta del medicamento; la hora de uno no se mezcla con la del otro. | ☐ | ☐ |
| 4.2 | Pide “en la mañana a las 7 pregúntale cómo durmió”. | Aparece en Rutina > Automatizaciones; el aviso local llega al teléfono del adulto mayor. | ☐ | ☐ |
| 4.3 | Abre ese aviso en el teléfono del adulto mayor y responde “Mal”. | BUDDY presenta respuesta en pantalla; Salud registra la respuesta exacta y normalizada, y aparece alerta de seguimiento para el administrador. | ☐ | ☐ |
| 4.4 | En BUDDY pregunta “¿qué automatizaciones tiene?”, pausa Sueño, cambia Ánimo a las 9 y luego reanúdala. | Responde según registros existentes y los cambios se ven en Rutina > Automatizaciones. | ☐ | ☐ |
| 4.5 | Con notificaciones del sistema apagadas, abre la app y revisa Rutina > Automatizaciones. | La automatización se conserva y aparece en la pantalla cuando vence mientras BUDDY está abierto; no se afirma que el sistema enviara un aviso local. | ☐ | ☐ |

## 0. Ronda V3.0 (2026-10-20): empieza por aquí

En V3.0 el chat dejó de ser una pestaña (las pruebas 1.1 y 1.5 de V2.4 que hablan de la "pestaña BUDDY" o de la barra
con el teclado ya no aplican: el chat se abre desde el robot, el botón ✦ del Inicio o Novedades y no tiene barra).

### 0.1 Chat con flecha y teclado

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 0.1.1 | En el Inicio toca el botón ✦ (BUDDY) de arriba. | Se abre el chat a pantalla completa, sin barra de pestañas, con la flecha "Volver" arriba a la izquierda. | ☐ | ☐ |
| 0.1.2 | Toca el campo "Escríbele a BUDDY…". | El compositor queda justo encima del teclado, sin saltos; la lista baja al último mensaje. Nada lo tapa. | ☐ | ☐ |
| 0.1.3 | Escribe 5 líneas seguidas. | El campo crece hasta 4 líneas y luego desplaza por dentro; el botón enviar (redondo, 48) sigue visible. | ☐ | ☐ |
| 0.1.4 | Cierra el teclado. | El compositor queda sobre la zona segura inferior (no pegado al borde ni bajo la barra de gestos). | ☐ | ☐ |
| 0.1.5 | Toca "Volver"; repite y usa el gesto de iOS / el botón atrás de Android. | Los tres vuelven al Inicio. Abriendo el chat desde una notificación o enlace sin historial, atrás lleva al Inicio y no cierra la app. | ☐ | ☐ |

### 0.2 Ajustes

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 0.2.1 | Abre cada opción de Ajustes (Cuenta, Apariencia, Pantalla de…, Mis avisos, Notificaciones, Mis personas, Dispositivos, Legal, Avanzado, Acerca de). | Cada una es una pantalla completa con "Volver", empieza arriba y se puede bajar hasta el final sin cortes. | ☐ | ☐ |
| 0.2.2 | Repite con el texto del sistema en el tamaño más grande. | Nada se sale por los lados; en Mis personas el nombre se lee completo y los botones bajan a otra línea. | ☐ | ☐ |
| 0.2.3 | Mis personas > Acceso. | Pantalla completa (no hoja) con el correo, "Copiar correo", el estado y "Restablecer contraseña", "Cambiar correo", "Revocar acceso". | ☐ | ☐ |
| 0.2.4 | "Restablecer contraseña" > confirmar. | Muestra una contraseña temporal una sola vez; con "Ya la anoté" desaparece y la anterior deja de servir. | ☐ | ☐ |
| 0.2.5 | Mis avisos: cambia "Segundo aviso" a 15 y "Sin confirmar" a 45, y la hora del resumen. | Se guardan; el segundo aviso nunca puede quedar después del "sin confirmar". | ☐ | ☐ |

### 0.3 Salir del modo adulto mayor

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 0.3.1 | Entra con la cuenta del adulto mayor. | Arriba a la derecha hay un botón "Opciones" visible. | ☐ | ☐ |
| 0.3.2 | Opciones > Cerrar sesión. | Pide confirmar ("Vas a salir de BUDDY en este celular…"); al confirmar vuelve a la entrada con la elección de rol. | ☐ | ☐ |
| 0.3.3 | Entra de nuevo como adulto mayor > Opciones > Entrar como administrador. | Pide el PIN (con 5 errores, espera creciente) o "Usar correo y contraseña del administrador"; termina en el inicio de sesión del administrador. | ☐ | ☐ |
| 0.3.4 | Como administrador, Entregar > "Probar como". | Banner "Modo prueba" arriba con "Volver a administrador" (sin PIN), que vuelve a Entregar. | ☐ | ☐ |

### 0.4 Aviso escalonado y silencio (requiere notificaciones activadas)

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 0.4.1 | Programa un medicamento a 3 minutos y abre "Probar como" una vez (para que el celular programe sus avisos). Cierra la app. | A la hora llega "Hora de tu medicamento"; a los 10 minutos, "¿Ya tomaste tu medicamento?". | ☐ | ☐ |
| 0.4.2 | Repite y toca "Ya lo tomé" antes del segundo aviso. | El segundo aviso NO llega. | ☐ | ☐ |
| 0.4.3 | Repite sin responder y espera 30 minutos; abre la app como administrador. | El Inicio dice "Atención" con la toma sin confirmar; en Novedades, "Llamar a [nombre]" y "Ya lo confirmé por teléfono". | ☐ | ☐ |
| 0.4.4 | Desactiva las notificaciones de Expo Go en el sistema y abre "Probar como". | El Inicio pasa a "Atención: No puedo verificar: Las notificaciones están desactivadas en el celular de…". | ☐ | ☐ |
| 0.4.5 | Samsung (ahorro de energía) y Xiaomi (sin "Inicio automático"): repite 0.4.1. | Anota si el aviso llega a tiempo, tarde o no llega (ver `docs/NOTIFICACIONES.md`). | ☐ | ☐ |
| 0.4.6 | Deja la hora del resumen 2 minutos después y espera con la app cerrada. | Llega "Resumen de hoy en BUDDY" con "datos hasta las…" y la línea del día. | ☐ | ☐ |

### 0.5 Adulto mayor e invitación

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 0.5.1 | Con la voz activada (Ajustes > Pantalla de…), abre "Probar como". | Lee en voz alta el aviso del momento; todos los botones de respuesta son grandes (72). | ☐ | ☐ |
| 0.5.2 | Mis personas > Invitar a un familiar > Administrar > Crear invitación > Compartir. | Se abre la hoja de compartir del sistema con el código y el enlace. | ☐ | ☐ |
| 0.5.3 | Registra a una persona nueva desde cero y cronometra. | 5 pantallas ("Paso 1 de 5"…); al terminar, el Inicio muestra "Aún no hay registros" hasta que su celular dé señales. | ☐ | ☐ |

## 1. Chat guiado y teclado (V2.4, Hito 1)

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 1.1 | Abre la pestaña BUDDY sin mensajes. | Se ven el título y las 8 acciones sin desplazar (en pantallas pequeñas puede requerir un leve desplazamiento). | ☐ | ☐ |
| 1.2 | Escribe "agrega losartán" y envía. | Aparece la tarjeta "Medicamento en preparación", "Paso 2 de 3" y la pregunta de la dosis con botones ½ · 1 · 1½ · 2. | ☐ | ☐ |
| 1.3 | Con el teclado abierto, toca "1 tableta". | El toque funciona a la primera (no solo cierra el teclado) y la tarjeta pasa a la hora. | ☐ | ☐ |
| 1.4 | Toca "Otra hora", elige 7:30 p. m. en la rueda y confirma. | La tarjeta muestra el resumen y "Confirmar y agregar" activo; nada queda tapado por el teclado ni por la barra inferior. | ☐ | ☐ |
| 1.5 | Toca el campo de texto para abrir el teclado otra vez. | La tarjeta y el compositor suben con el teclado, sin saltos ni espacios en blanco. En Android, la barra de pestañas se oculta mientras el teclado está abierto. | ☐ | ☐ |
| 1.6 | Arrastra la lista hacia abajo. | El teclado se cierra (iOS: de forma interactiva, siguiendo el dedo). | ☐ | ☐ |
| 1.7 | Confirma. | Aparece una sola línea "✓ Listo, agregué Losartán…" con Ver y Deshacer; Deshacer lo quita de Rutina. | ☐ | ☐ |
| 1.8 | Botón "+" > Cita médica > Médico general > Elegir fecha. | Se abre la hoja con los próximos 90 días en filas grandes; al elegir uno la tarjeta pasa a la hora. | ☐ | ☐ |
| 1.9 | Ajustes del sistema: texto en el tamaño más grande. Repite 1.2–1.4. | La tarjeta se puede desplazar por dentro y "Confirmar y agregar" y el compositor siguen visibles. | ☐ | ☐ |
| 1.10 | VoiceOver / TalkBack activo. Repite 1.2–1.3. | Lee "Paso 2 de 3", la pregunta y cada respuesta como botón. | ☐ | ☐ |

## 2. Notificaciones locales (V2.2)

Ver también `docs/NOTIFICACIONES.md`.

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 2.1 | Ajustes > Notificaciones > "Enviar notificación de prueba al adulto mayor". | Pide el permiso en ese momento (no al abrir la app) y a los 5 s llega "Hola, [nombre]". | ☐ | ☐ |
| 2.2 | Programa un medicamento para dentro de 3 minutos, entrega el teléfono y bloquéalo. | Llega "Hora de tu medicamento" sin mostrar el nombre en la pantalla bloqueada (salvo que el cuidador lo active). | ☐ | ☐ |
| 2.3 | Crea una cita para mañana con aviso el día anterior en 2 minutos. | Llega "Mañana tienes cita a las…" con la dirección. | ☐ | ☐ |
| 2.4 | Cierra BUDDY por completo y espera un aviso programado. | El aviso llega igual (es local, lo programa el propio teléfono). | ☐ | ☐ |
| 2.5 | Activa No molestar y espera un aviso. | Se comporta según la configuración del sistema (anotar qué pasó). | ☐ | ☐ |

## 3. Robot arrastrable y burbujas (V2.4, Hito 4)

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 3.1 | En Resumen, arrastra el robot hacia arriba y a la izquierda y suelta. | Sigue el dedo sin saltos, mira hacia donde va, da un saltito al soltar y se pega al borde izquierdo. No se abre el chat. | ☐ | ☐ |
| 3.2 | Cierra y abre BUDDY. | El robot está donde lo dejaste. | ☐ | ☐ |
| 3.3 | Toca el robot. | Se abre el chat con un zoom corto. | ☐ | ☐ |
| 3.4 | Con un medicamento con pocas unidades, mira la burbuja. | Burbuja grande con "Atención" o "Información", su texto y "Registrar compra"; vibración suave al aparecer. | ☐ | ☐ |
| 3.5 | Desliza la burbuja hacia un lado. | Se descarta y no vuelve hasta que la novedad cambie. | ☐ | ☐ |
| 3.6 | Abre el teclado en cualquier pantalla. | El robot se oculta mientras el teclado está abierto. | ☐ | ☐ |
| 3.7 | Ajustes > Apariencia > "Ocultar el robot por hoy" y luego "Restablecer posición del robot". | Desaparece hoy de todas las pestañas; al restablecer vuelve abajo a la derecha. | ☐ | ☐ |
| 3.8 | Activa "Reducir movimiento" en el sistema. | Sin rebotes, meneos ni zoom; el arrastre sigue funcionando. | ☐ | ☐ |

## 4. Barra Liquid Glass y gestos (V2.4, Hito 5)

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 4.1 | iPhone con iOS 26 o superior: abre Resumen y desplázate. | La barra es de vidrio líquido nativo y deja ver el contenido detrás. Anotar si en Expo Go se ve o no. | ☐ | — |
| 4.2 | iPhone con iOS 25 o anterior. | Barra desenfocada (blur) con reflejo arriba. | ☐ | — |
| 4.3 | Android. | Barra translúcida con reflejo, legible sobre cualquier contenido. | — | ☐ |
| 4.4 | Desliza el dedo sobre la barra de Resumen a Salud y suelta. | La gota sigue el dedo, vibra al pasar cada pestaña y abre Salud. | ☐ | ☐ |
| 4.5 | Toca Rutina y luego Ajustes (lejos). | La gota se estira hacia el destino y se asienta. | ☐ | ☐ |
| 4.6 | Activa "Reducir transparencia" (iOS) o "Quitar animaciones" (Android). | Barra sólida / sin estiramiento. | ☐ | ☐ |
| 4.7 | Ajustes > Apariencia: apaga "Deslizar el dedo sobre la barra". | El gesto ya no cambia de pestaña; tocar sigue funcionando. | ☐ | ☐ |
| 4.8 | Desplázate rápido en Resumen y Rutina. | Inercia natural, sin tirones ni cambios de pestaña accidentales. | ☐ | ☐ |

## 5. Ubicación y mapa (V2.4, Hito 6)

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 5.1 | Resumen > "Dónde está [nombre]" > "Solicitar ubicación". | Pasa a "Esperando la respuesta". | ☐ | ☐ |
| 5.2 | Entregar el teléfono (o "Probar como") y tocar "Aceptar" en la tarjeta. | El sistema pide permiso de ubicación "mientras se usa la app" con el texto en español. | ☐ | ☐ |
| 5.3 | Volver al administrador > "Dónde está". | Mapa nativo (Apple Maps / Google Maps) con marcador, hora y precisión; "Cómo llegar" abre la app de mapas. | ☐ | ☐ |
| 5.4 | Rechazar el permiso del sistema. | Aviso "El teléfono no dio permiso de ubicación"; no aparece ninguna ubicación. | ☐ | ☐ |
| 5.5 | En la pantalla del adulto mayor, "Dejar de compartir". | El administrador ve "dejó de compartir su ubicación" y no queda historial. | ☐ | ☐ |
| 5.6 | Cerrar BUDDY 40 minutos y volver a "Dónde está". | Aviso de ubicación desactualizada (no hay seguimiento en segundo plano). | ☐ | ☐ |

## 6. Portada de carga (V2.4, Hito 7)

| # | Pasos | Resultado esperado | iOS | Android |
|---|---|---|---|---|
| 6.1 | Cierra BUDDY por completo y ábrelo. | Tras el splash, la portada petróleo con BUDDY dormido que respira y "Zz"; la barra avanza con mensajes reales; BUDDY despierta y aparece la app (normalmente en menos de 3 s). | ☐ | ☐ |
| 6.2 | Activa "Reducir movimiento". | Sin respiración ni vuelo: solo un desvanecido corto. | ☐ | ☐ |
| 6.3 | Modo avión y teléfono lento. | Si tarda más de 4 s aparece "Está tardando un poco más de lo normal…". | ☐ | ☐ |

## Pendiente de agregar en los hitos siguientes

Verificación completa (Hito 8).

## V3.1 Hito 5 — Permisos (pendiente en dispositivo)

1. En la primera entrada de la cuenta adulta, comprueba la explicación “Para que BUDDY te avise, permite las notificaciones”. Actívalas o toca “Ahora no” para continuar. Luego abre **Opciones > Permisos** y confirma el estado del sistema.
2. Si Notificaciones está sin decidir, toca **Activar** y acepta. Si las negaste, toca **Abrir ajustes del celular**, habilítalas y vuelve; el estado debe actualizarse al regresar a primer plano.
3. En Inicio confirma que no hay solicitud ni botón “Dejar de compartir”; si comparte, solo aparece “Compartiendo ubicación”.
4. Solicita ubicación desde el administrador. Acepta desde Permisos y comprueba Dónde está. Revoca con confirmación y verifica que desaparezca el mapa y se borren los puntos locales.
5. Con notificaciones negadas, Inicio ofrece **Activar avisos** y el estado local del administrador pasa a “No puedo verificar”. En otro teléfono no se sincroniza hasta implementar backend.
6. Repite en iPhone y Android con letra de BUDDY al máximo, escalado del sistema 1.0/1.3/2.0 y VoiceOver/TalkBack; revisa textos y botones sin cortes.

## V3.1 Hito 6 — Agua e historiales (pendiente en dispositivo)

1. En Inicio, revisa **Vasos de agua hoy**: cada horario pasado debe tener check si hay registro cercano, X si no lo hay, y los horarios futuros quedan pendientes. Verifica que total y marcas coincidan con Salud > Agua.
2. Cambia el tamaño de texto de BUDDY por todos sus pasos y el escalado del sistema a 1.0, 1.3 y 2.0. Confirma que horarios, iconos y texto no se montan en 360, 375 y 390 puntos de ancho.
3. En Salud, confirma que Ánimo y Sueño se apilan a todo el ancho, que las barras se animan y que sin respuestas dice “Sin datos” con barras base vacías.
4. Revisa los estados de comida, medicamento y caminata: cada icono debe concordar con su registro, con VoiceOver/TalkBack y alto contraste.

## V3.1 Hito 7 — BUDDY Plus y pasos (pendiente en dispositivo)

1. En web, abre Salud > Conectar reloj y comprueba el bloqueo amable. Ajustes > Avanzado > BUDDY Plus de prueba activa Plus local; desactívalo y confirma que el acceso vuelve a estar bloqueado. Esto no compra ni cobra.
2. Abre BUDDY Plus: precios/prueba deben decir “por definir”, debe estar el enlace a términos y restaurar compras, y no debe aparecer formulario de tarjeta.
3. En Expo Go con iPhone físico, concede el permiso de movimiento y toca **Actualizar pasos**. Compara el valor de hoy y los últimos siete días con la app Salud. Si no hay sensor/permiso, debe decirlo y no mostrar ceros como medición.
4. En Android Expo Go, confirma que no aparece un total diario/semanal inventado; se informa que el histórico requiere Health Connect. La integración de Health Connect se prueba después en development build.
5. En un build instalable, configura productos de sandbox y claves públicas RevenueCat solo fuera del repositorio; prueba compra, cancelación, restauración y expiración. No usar claves secretas en el cliente.
6. Repite Plus y Conectar reloj con letra BUDDY máxima, fontScale 1.0/1.3/2.0, anchos 360/375/390 y VoiceOver/TalkBack. Estas comprobaciones físicas siguen pendientes.
