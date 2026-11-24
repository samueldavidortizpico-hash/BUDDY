# Tarea · Primera versión instalable de Android (APK de prueba)

Responsables: Samuel (configuración de EAS) y Laura (instalación y pruebas) · Fase 10, adelantada en el plan

## Por qué

La promesa de BUDDY es que el recordatorio suene **con la app cerrada y después de reiniciar**. En Expo Go eso no se
puede comprobar de forma fiable. Además, dos cosas solo se pueden probar en una versión instalada:

- El cifrado de la base local (`encryptedStorage` en `src/config/features.ts:21`) está **apagado en producción**
  hasta probarlo en un dispositivo (`docs/ALMACENAMIENTO_SEGURO.md`). Sin él, los datos de salud quedan sin cifrar:
  es un bloqueo P0 para el piloto (`arquitectura_buddy.md`, sección 9).
- El canal "Medicamentos" (PR `feat/canal-medicamentos`).

## Qué hacer

**Samuel**
- [ ] Revisar `eas.json`: el perfil `preview` ya genera APK con distribución interna.
- [ ] Generar la primera versión: `npx eas-cli@latest build --profile preview --platform android`.
- [ ] Compartir el enlace de instalación con el equipo (nunca en un issue público).
- [ ] Anotar en `docs/DECISIONS.md` si hace falta un perfil o un canal de actualización nuevo.

**Laura**
- [ ] Instalar el APK en todos los Android de `docs/fase-1/MATRIZ_DISPOSITIVOS.md`.
- [ ] Llenar el paso 2 de la matriz: aviso a 2 minutos con la app abierta, en segundo plano, cerrada y tras reiniciar.
- [ ] Para Samsung, Xiaomi, Motorola y Huawei: anotar los pasos para quitar el ahorro de batería a BUDDY.

**Los dos: cifrado**
- [ ] Con una versión que tenga `encryptedStorage` encendido: crear datos, cerrar, reiniciar el celular y abrir. Los
      datos siguen ahí y no se pierde nada al actualizar la app.
- [ ] Si pasa en 2 marcas distintas, abrir un PR que lo encienda en producción.

## Cierre

- [ ] El recordatorio suena con la app cerrada y tras reiniciar en 3 marcas de Android
- [ ] Matriz de dispositivos (paso 2) completa
- [ ] Decisión escrita sobre el cifrado en producción
