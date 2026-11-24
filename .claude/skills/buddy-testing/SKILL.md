---
name: buddy-testing
description: Estrategia y buenas prácticas de pruebas para BUDDY (React Native + Expo SDK 58 + TypeScript + Supabase). Usar al escribir, revisar o planear pruebas (Jest, React Native Testing Library, integración, E2E con Maestro), al implementar navegación, registro de medicamentos, alarmas/horarios/zonas horarias, permisos, autenticación o accesibilidad, y antes de dar por aprobada cualquier fase del proyecto.
---

# BUDDY — Pruebas

BUDDY cuida a adultos mayores. Un recordatorio de medicamento que no suena, suena dos veces o suena a la hora equivocada es un fallo de seguridad, no un bug cosmético. Prueba en proporción a ese riesgo.

## 0. Antes de instalar cualquier cosa

No instales dependencias de pruebas sin autorización explícita del usuario. Cuando la haya:

1. Lee la versión de `expo` en `package.json` (hoy: `~57.0.x`, RN `0.86.3`, React `19.2.3`).
2. Usa siempre `npx expo install <pkg>` para paquetes que Expo conoce; resuelve la versión compatible con el SDK.
3. Revalida con `npm view <pkg>@<rango> peerDependencies` y `npx expo-doctor` después de instalar.

Versiones verificadas el 2026-10-10 contra SDK 57 (revalidar antes de instalar):

| Paquete | Versión | Notas |
|---|---|---|
| `jest-expo` | `~57.0.5` | Indicado en `expo/bundledNativeModules.json`. Trae `react-test-renderer@19.2.3` y APIs de Jest 29. |
| `jest` | `^29.x` | `jest-expo@57` depende de `@jest/*@^29`; **no** usar Jest 30 hasta que jest-expo lo soporte. |
| `@types/jest` | `^29.x` | Alineado con Jest. |
| `@react-native/jest-preset` | `0.86.3` | Peer de `jest-expo@57`; debe coincidir con la versión de RN. |
| `@testing-library/react-native` | `^13.3.3` | Usa `react-test-renderer` (ya incluido por jest-expo). La v14 exige `test-renderer` aparte: no adoptarla sin comprobar compatibilidad. |
| Maestro | CLI externo | No es un paquete npm. Se instala en el sistema / se ejecuta en EAS Workflows o Maestro Cloud. |

Comando previsto (solo con autorización):
```bash
npx expo install jest-expo jest @types/jest @testing-library/react-native -- --save-dev
```
Config mínima en `package.json`: `"jest": { "preset": "jest-expo" }` y script `"test": "jest"`.

## 1. Pirámide de pruebas

| Nivel | Herramienta | Qué cubre | Dónde vive |
|---|---|---|---|
| Unitarias | Jest | Lógica pura: cálculo de horarios, dosis, validaciones, mapeos de datos | `src/**/__tests__/*.test.ts` junto al código |
| Componentes | RNTL | Render, interacción, estados de carga/error/vacío, accesibilidad | `src/**/__tests__/*.test.tsx` |
| Integración | Jest + RNTL + mocks de módulos nativos y Supabase | Flujos de varias pantallas/hooks con datos simulados | `src/__tests__/integration/` |
| E2E | Maestro | Flujos críticos en dispositivo/emulador real | `.maestro/*.yaml` |

Regla: la lógica de negocio (horarios, dosis, zonas horarias) se extrae a funciones puras para probarla en unitarias. No pruebes cálculo de fechas a través de la UI.

## 2. Pruebas unitarias (Jest)

- Una función, un comportamiento por `it`. Nombres en lenguaje de dominio: `it('no programa dosis después de la fecha de fin del tratamiento')`.
- Sin dependencia del reloj real: `jest.useFakeTimers()` + `jest.setSystemTime(new Date('2026-03-29T00:30:00Z'))`.
- Sin red real ni Supabase real en unitarias. Mockea en el límite (el módulo cliente de Supabase), no dentro de cada componente.
- Prueba casos límite explícitos: listas vacías, `null`/`undefined` de la BD, strings con espacios, dosis `0` o negativas, fechas inválidas.

## 3. Pruebas de componentes (RNTL)

- Consulta como lo haría el usuario, en este orden: `getByRole` → `getByLabelText` → `getByText` → `getByTestId` (último recurso).
- Usa `userEvent` (`const user = userEvent.setup()`) en lugar de `fireEvent` para interacciones.
- Usa `findBy*` / `waitFor` para lo asíncrono; nunca `setTimeout` en tests.
- Cubre siempre: estado de carga, error, vacío y éxito.
- Evita snapshots grandes; si se usan, que sean pequeños y revisados.

## 4. Pruebas de integración

- Mocks de módulos nativos de Expo en `jest.setup.ts` (`expo-notifications`, `expo-secure-store`, `expo-camera`, `expo-image-picker`, `expo-localization`) con implementaciones controlables por test.
- Supabase: mock del cliente con respuestas tipadas (usar los tipos generados de la BD). Probar errores de red, sesión expirada y respuestas parciales.
- Las políticas RLS se prueban aparte contra una base local (`supabase start`) o rama de desarrollo, **nunca** contra producción: un usuario no debe leer medicamentos de otro paciente salvo vínculo cuidador/paciente autorizado.

## 5. Navegación (Expo Router)

- Usa `renderRouter` de `expo-router/testing-library` con un mapa de rutas mock (confirmar la API en la documentación de Expo Router del SDK vigente).
- Verifica: ruta inicial según sesión (autenticado → home; no autenticado → login), redirecciones protegidas, deep links (`expo-linking`), parámetros con `useLocalSearchParams`, botón atrás que no devuelve a pantallas de auth tras login.
- Afirma con `expect(screen).toHavePathname('/...')`.

## 6. Registro de medicamentos

Casos mínimos:
- Campos obligatorios (nombre, dosis, unidad, frecuencia, fecha de inicio) con mensajes de error legibles.
- Unidades y formatos de dosis (decimales con coma y punto, `0,5`/`0.5`), rechazo de valores no positivos.
- Fecha de fin anterior a inicio → error.
- Duplicados: mismo medicamento activo dos veces → advertencia, no bloqueo silencioso.
- Editar/eliminar un medicamento reprograma o cancela sus alarmas (verificar llamadas al mock de notificaciones).
- Datos extraídos de foto/IA quedan como **borrador sin confirmar** hasta que el usuario los verifica (ver Skill `buddy-medical-safety`).
- Persistencia: lo que se guarda en Supabase coincide con lo mostrado; un fallo de red no pierde lo escrito.

## 7. Alarmas, horarios y zonas horarias

La lógica de programación debe ser una función pura `(medicamento, ahora, zonaHoraria) => Date[]` probada exhaustivamente.

Casos obligatorios:
- Frecuencias: cada N horas, horas fijas, días alternos, días de semana concretos, "según necesidad" (no programa alarmas).
- Cambio de horario de verano (DST): hora inexistente (salto adelante) y hora duplicada (salto atrás) → ni dosis perdida ni doble.
- Cambio de zona horaria del dispositivo (viaje): definir y probar la política (hora local del paciente vs hora de origen).
- Medianoche, fin de mes, 29 de febrero, cambio de año.
- Límite de notificaciones programadas por el SO (iOS ≈ 64 pendientes): la estrategia de reprogramación debe probarse.
- Reprogramación tras reinicio del dispositivo / reapertura de la app.
- Guardar instantes en UTC en la BD; mostrar en hora local. Probar ambas conversiones.
- Ejecutar la suite con varias zonas: `TZ=America/Bogota`, `TZ=Europe/Madrid`, `TZ=UTC` (scripts separados o `process.env.TZ` en `globalSetup`).

Mock de `expo-notifications`: verificar argumentos de `scheduleNotificationAsync` (trigger, contenido sin datos sensibles visibles en la pantalla de bloqueo) y llamadas a `cancelScheduledNotificationAsync`.

## 8. Permisos y autenticación

- Permisos (notificaciones, cámara, galería): probar `granted`, `denied`, `undetermined` y "denegado permanentemente" → la UI explica por qué se necesita y ofrece abrir ajustes; la app no se bloquea.
- Sin permiso de notificaciones, la pantalla de medicamentos muestra una advertencia visible: el usuario debe saber que no recibirá alarmas.
- Auth (Supabase): login correcto, credenciales inválidas, sesión expirada/refresh, logout limpia datos locales y cancela notificaciones del usuario, sesión almacenada en `expo-secure-store` (no tokens en claro en AsyncStorage).
- Roles: paciente vs cuidador; un cuidador solo ve pacientes vinculados.

## 9. Accesibilidad

Público objetivo: adultos mayores. Es requisito, no extra.

- Todo control interactivo tiene `accessibilityRole` y `accessibilityLabel` comprensible (probar con `getByRole('button', { name: '...' })`).
- Áreas táctiles ≥ 48×48 dp (Android) / 44×44 pt (iOS).
- Texto escalable: no fijar `allowFontScaling={false}`; probar con escala de fuente grande en E2E/manual.
- Contraste mínimo WCAG AA (4.5:1 texto normal); no transmitir información solo por color (dosis atrasada = color **y** texto/icono).
- Estados anunciados: `accessibilityState` (`disabled`, `checked`, `selected`), errores de formulario asociados al campo.
- Revisión manual con TalkBack y VoiceOver antes de aprobar fases con UI nueva.

## 10. E2E con Maestro

- Flujos en `.maestro/`, uno por journey crítico: `login.yaml`, `registrar-medicamento.yaml`, `confirmar-toma.yaml`, `permisos-notificaciones.yaml`.
- Selecciona por `id` (`testID`) o texto accesible; nunca por coordenadas.
- Ejecutar contra **build de desarrollo/preview**, no Expo Go, cuando haya módulos nativos.
- Datos: cuenta de pruebas en un proyecto Supabase de desarrollo con datos sembrados ficticios. Nunca datos reales de pacientes.
- CI: EAS Workflows con job de Maestro (consultar la documentación del SDK vigente antes de configurarlo).

## 11. Verificación antes de aprobar cada fase

Una fase **no** se aprueba hasta que todo esto se cumple y se reporta con salida real (no "debería pasar"):

- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npx expo lint` sin errores.
- [ ] `npm test` en verde; ningún `.skip`/`.only` sin justificación escrita.
- [ ] Cobertura de la lógica crítica (horarios, dosis, permisos, auth) ≥ 90 % en esos módulos; resto ≥ 70 %.
- [ ] Suite de zonas horarias ejecutada en al menos 3 `TZ`.
- [ ] `npx expo-doctor` sin problemas de versiones.
- [ ] Flujos Maestro de la fase pasan en Android e iOS (o se declara cuál no se ejecutó y por qué).
- [ ] Revisión de accesibilidad (automática + manual con lector de pantalla) para pantallas nuevas.
- [ ] Si la fase toca medicamentos, IA o salud: checklist de `buddy-medical-safety` completado.
- [ ] Resumen al usuario: qué se probó, qué no, riesgos conocidos. Esperar su aprobación.

Si algo falla, se informa tal cual con la salida del comando. No se aprueban fases por inferencia.
