# Declaraciones de privacidad para las tiendas (borrador)

**Fecha:** 2026-11-15 · **Versión de la app:** 1.0.0, modo local (sin servidor) · **Origen:** auditoría de venta V-10 y tarea 3.3
del change `openspec/changes/preparar-buddy-para-venta`.

Este borrador debe coincidir con la política de privacidad de la app (`strings.legal.privacy` en `src/i18n/es-CO.ts`). Si cambia
una, cambian las tres. **Cuando se encienda el servidor (Fase B), todo este documento se rehace:** los datos dejarán de quedarse
solo en el teléfono.

> Orientativo. Antes de publicar, un abogado debe revisar la política y estas declaraciones (Ley 1581 de 2012, reglas de
> App Store y Google Play).

## Revisión cruzada

"Recopila" significa que sale del teléfono hacia BUDDY o un tercero. En modo local, los datos de salud **no salen del teléfono**:
ambas tiendas permiten declararlos como no recopilados. Igual se listan aquí, para que la revisión vea que se tuvieron en cuenta.

| Dato | Política de privacidad (párrafo) | Google Play: seguridad de los datos | Apple: etiquetas de privacidad |
|---|---|---|---|
| Nombre, correo y contraseña de la cuenta | "Qué datos guarda" (Cuenta) | No recopilado (solo en el teléfono) | No recopilado |
| Perfil de salud del adulto mayor (alergias, enfermedades, cirugías, peso, estatura) | "Qué datos guarda" (Perfil) | No recopilado (solo en el teléfono) | No recopilado |
| Medicamentos, dosis, horarios, tomas y existencias | "Qué datos guarda" (Cuidado diario) | No recopilado | No recopilado |
| Chequeo diario (ánimo, sueño), agua, comidas, actividades, citas | "Qué datos guarda" (Cuidado diario) | No recopilado | No recopilado |
| Ubicación precisa | "Qué datos guarda" (Ubicación): solo si el adulto mayor acepta, y con la app abierta | No recopilado (no sale del teléfono) | No recopilado |
| Fotos de envases | "Qué datos guarda" (Fotos) | No recopilado | No recopilado |
| Nombre o código de un medicamento enviado a RxNorm y MedlinePlus | "Con quién se comparte" | Sin vínculo a la persona ni a la cuenta: no es dato personal | No vinculado al usuario; no recopilado |
| Identificador de cuenta y compra (App Store, Google Play, RevenueCat) | "Con quién se comparte" | **Recopilado:** historial de compras e identificador de usuario, para gestionar la suscripción. No se comparte con fines publicitarios | **Compras** e **Identificador de usuario**, vinculados al usuario, uso "Funcionalidad de la app". Sin rastreo |
| Publicidad, analítica, inteligencia artificial | "Con quién se comparte": no se venden ni se usan para publicidad | Ninguno | Ninguno; sin rastreo (App Tracking Transparency no aplica) |

## Respuestas de Google Play (formulario de seguridad de los datos)

- ¿La app recopila o comparte datos de usuario? **Sí**, solo la compra y el identificador de cuenta cuando se compra un plan.
- ¿Los datos se cifran en tránsito? **Sí** (las tiendas y RevenueCat usan HTTPS).
- ¿Los usuarios pueden pedir que se borren sus datos? **Sí**: Ajustes > Cuenta > Eliminar cuenta, dentro de la app. Falta la
  página web para pedirlo sin la app (ambas tiendas la piden): **pendiente**, ver abajo.
- Categoría de la app: Salud y bienestar (Medical no aplica: BUDDY no diagnostica ni trata).

## Respuestas de Apple (App Privacy)

- Datos vinculados al usuario: **Compras** e **Identificador de usuario** (funcionalidad de la app).
- Datos usados para rastrear: **ninguno**.
- Datos de salud: **no recopilados** (quedan en el teléfono).

## Pendientes antes de enviar a revisión

1. Publicar la política en una URL pública (las dos tiendas la exigen) con el mismo texto de la app.
2. Página web para pedir la eliminación de la cuenta sin instalar la app (Google Play).
3. Correo de contacto del responsable del tratamiento en la política (decisión del dueño).
4. Cifrado propio de la base local (SEC-08) antes de cambiar el texto "BUDDY todavía no agrega un cifrado propio".
5. Revisión legal.
