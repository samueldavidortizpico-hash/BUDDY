# Almacenamiento seguro (V4 Fase 3)

Hallazgos que resuelve: **S-01** (datos de salud sin cifrar en AsyncStorage) y parte de **S-02/S-03** de
`docs/AUDITORIA_BMAD.md`. Hoy toda la base es un JSON (`buddy.db`) en AsyncStorage (`src/infrastructure/local/db.ts`).

## Opciones comparadas (Expo SDK 57)

| | A. Cifrado autenticado sobre el almacenamiento actual | B. Base local cifrada (SQLite + SQLCipher) |
|---|---|---|
| Cómo | AES-256-GCM de `expo-crypto` (ya instalado: `aesEncryptAsync`, `AESEncryptionKey`, `node_modules/expo-crypto/build/aes/index.d.ts`); clave en `expo-secure-store` (Keychain/Keystore) | `expo-sqlite` con la opción de SQLCipher del plugin de configuración |
| Expo Go | Sí: `expo-crypto` y `expo-secure-store` vienen en Expo Go | No: SQLCipher exige build propia (development build) |
| Dependencias nuevas | Ninguna | Ninguna en `package.json`, pero sí cambio de `app.json` y build nativa |
| Cambio de código | Un envoltorio del `storage` de zustand (un archivo) | Reescribir la capa de datos a tablas (A-02) |
| Rendimiento | Igual que hoy (se cifra el JSON completo en cada escritura) | Mejor con mucho volumen: escribe solo lo que cambia |
| Riesgo | Bajo | Medio-alto: migración de esquema, build nueva, más superficie de error |

**Elegida: A (menor riesgo).** Cifra los datos de salud ya, sin dependencias ni build nueva, y funciona en Expo Go. B
sigue siendo la meta para cuando el volumen crezca (A-02) y se haga la build propia; la interfaz `Cipher` permite pasar
de una a otra sin tocar las pantallas.

## Implementación (`src/infrastructure/local/encrypted-storage.ts`)

- **Bandera:** `FEATURES.encryptedStorage` (`src/config/features.ts`): encendida en desarrollo, **apagada en producción**
  hasta probarla en dispositivo, y apagada en Jest.
- **Cifrado:** AES-256-GCM (autenticado). El nombre de la base va como dato asociado: un archivo no se puede cambiar por
  otro. La clave (256 bits) se genera una vez y vive en el SecureStore con el nombre `buddy.db.key`.
- **Migración sin pérdida:** lee el original en claro → guarda `buddy.db.bak` → cifra → escribe `buddy.db.enc` →
  **verifica descifrando** → solo entonces borra el original. El respaldo se borra en la **siguiente apertura exitosa**.
- **Reversión automática:** si algo falla al migrar, se borra el cifrado a medias y la app sigue leyendo y escribiendo el
  original (`health() = 'fallback'`).
- **Clave perdida o datos alterados:** no se finge que no hay datos. Se muestra el respaldo si existe; si no, la lectura
  falla y **no se escribe nada** (no se sobrescriben datos que no se pudieron leer). `health()` dice `key_lost` o
  `tampered` para que la interfaz lo explique.
- **Registros:** ningún dato de salud ni la clave se escriben en la consola.

## Pruebas (`src/infrastructure/__tests__/encrypted-storage.test.ts`, 6 de 6)

Cifrado y descifrado ida y vuelta; manipulación detectada (un byte cambiado) sin sobrescribir; migración desde datos en
claro con respaldo y borrado en la siguiente apertura; clave perdida; interrupción a mitad de migración (corte después de
escribir el cifrado y antes de borrar el original); reversión si cifrar falla. Usan AES-256-GCM real de Node con el mismo
formato (IV de 12 bytes + texto cifrado + etiqueta de 16) que `combined('base64')` de expo-crypto.

## Copias de seguridad y límites

- **AsyncStorage:** en Android, un valor muy grande (≈ 2 MB por fila del CursorWindow) puede no leerse; el cifrado
  agrega ~33 % por base64. Hoy la base es pequeña, pero crece con el registro de cambios (A-03). Por eso B es la meta.
- **Android `allowBackup`:** Expo lo deja activado. La copia en la nube de Google se llevaría `buddy.db.enc` pero **no**
  la clave del Keystore, así que en un celular nuevo esos datos no se pueden abrir (el código lo detecta como
  `key_lost`). Recomendación: `android.allowBackup: false` en `app.json` cuando se haga la build propia, y que la copia
  real sea la del servidor (docs/SINCRONIZACION.md). **No se cambió `app.json` en esta ronda** (requiere build y decisión).
- **iCloud:** el Keychain puede sincronizarse según la configuración del usuario; mismo criterio: la fuente de verdad será
  el servidor.

## Falta (dispositivo)

Probar en iPhone y Android con Expo Go: primera apertura con datos existentes (migración), reinicio, cambio de celular,
desinstalar y reinstalar, y medir el tiempo de escritura con una base grande. Hasta entonces la bandera queda apagada en
producción.
