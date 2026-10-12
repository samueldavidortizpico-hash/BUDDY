# Pruebas en dispositivo (iOS y Android)

Lista para una persona con un iPhone y un Android reales y Expo Go (SDK 57). El dueño arranca el servidor con `npx expo start --tunnel --clear` y abre el QR. Marca cada casilla al aprobar; si algo falla, anota modelo, versión del sistema y qué pasó.

Lo que **no** se puede comprobar en web y por eso está aquí: teclado real, gestos, hápticos, notificaciones, permisos, efecto glass, splash nativo, lector de pantalla y rendimiento.

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

## Pendiente de agregar en los hitos siguientes

Splash nativo y portada de carga (Hito 7).
