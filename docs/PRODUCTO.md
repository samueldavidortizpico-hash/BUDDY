# BUDDY: definición del producto (V3.0)

Este documento guía todas las decisiones desde la ronda V3.0. Lo que no sirva al ciclo central se recorta o se pospone.

## Qué es

BUDDY es un asistente para el cuidado y monitoreo de adultos mayores que viven solos, pensado para los hijos que los
cuidan a distancia.

**Promesa:** "Aunque no estés a su lado, sabes que está bien. Y si algo no lo está, te enteras a tiempo."

BUDDY vende **tranquilidad y aviso temprano**, no recordatorios. El cliente que paga es el hijo o la hija; el usuario es
el adulto mayor.

## Ciclo central

**Configurar → recordar → confirmar → verificar → avisar → tranquilizar.**

| Paso | Quién | Qué hace BUDDY hoy (V3.0) |
|---|---|---|
| Configurar | Hijo | Registra a la persona con lo mínimo, un medicamento, la hora del chequeo y un contacto (Hito 6). |
| Recordar | Adulto mayor | Notificación local a la hora y pantalla con una sola cosa a la vez; voz opcional. |
| Confirmar | Adulto mayor | "Ya lo tomé / No lo tomé / En 10 minutos" con botones de 72. |
| Verificar | BUDDY | Aviso escalonado (T, T+10, "sin confirmar" a T+30) y detección de silencio ("No puedo verificar"). |
| Avisar | Hijo | Alerta de seguimiento con "Llamar a [nombre]" y "Ya lo confirmé por teléfono". |
| Tranquilizar | Hijo | Vista de un segundo ("Todo bien", "Atención", "Acción necesaria") y resumen diario de una línea. |

## Principios

1. **Nunca falla en silencio:** si no puede verificar, lo dice.
2. **Cero fricción para el adulto mayor:** una pantalla, voz, botones grandes; el hijo configura todo.
3. **Pocas alertas y todas con sentido.**
4. **Vista de un segundo para el hijo.**
5. **Registro de salud útil para el médico.**
6. **Respeto y consentimiento del adulto mayor.**
7. **BUDDY informa y nunca receta, diagnostica ni cambia dosis.**
8. **Calidad en celulares reales.**
9. **Invitación familiar como crecimiento.**

## Alcance

| Nivel | Contenido | Estado en la app |
|---|---|---|
| **Núcleo** | Medicamentos con horarios, confirmación, aviso escalonado, existencias, chequeo diario corto, botón de ayuda, resumen para el hijo, detección de silencio, cuentas y seguridad | Encendido |
| **Valor añadido** | Varios cuidadores (invitación), citas, reporte para el médico, mensajes de la familia, ubicación compartida | Encendido lo ya construido |
| **Futuro** | Análisis farmacológico verificado (nivel 2+), IA conversacional real, reloj, nutrición (análisis de alimentos), zonas seguras | Apagado en `src/config/features.ts`; fuera de la navegación principal |

El chat de BUDDY se mantiene como **asistente del administrador para configurar**, no como centro de la app.

## Metas a validar

- El adulto mayor completa su **primer recordatorio sin ayuda**.
- Recordatorios **confiables en las marcas más comunes** (Samsung, Xiaomi, iPhone): ver `docs/NOTIFICACIONES.md`.
- **Muy pocas falsas alarmas.**
- **Cuidador activo a las 8 semanas.**
- **Parte de los probadores paga.**

## Decisiones pendientes del dueño

Hasta que el dueño decida, la app usa la opción marcada como "por ahora".

| Decisión | Opciones | Por ahora |
|---|---|---|
| A quién perseguir primero | Hijos que viven en otra ciudad / hijos en la misma ciudad / cuidadores pagados | Hijos a distancia (la promesa) |
| Perfil del adulto mayor | Independiente / también con deterioro cognitivo | Independiente (lee, responde y llama solo) |
| Respaldo cuando la app no basta | Llamada automática / WhatsApp / ninguno | Ninguno automático: "Llamar a [nombre]" desde el celular del hijo |
| Posicionamiento | Tranquilidad familiar / salud y adherencia / seguridad | Tranquilidad y aviso temprano |
| Nivel de control del hijo | Solo ver / ver y configurar / configurar con permiso del adulto mayor | Ver y configurar; ubicación solo con consentimiento del adulto mayor |
| Backend | Supabase / AWS | Por decidir; nada conectado en V3.0 |
