// Reanimated necesita módulos nativos: se usa su mock oficial, que no incluye useReducedMotion.
// Se completa el propio módulo del mock porque expo-router/testing-library también lo reutiliza.
const reanimatedMock = require('react-native-reanimated/mock');
reanimatedMock.useReducedMotion = () => false;
// Reanimated's default mock leaves interpolated native style values undefined.
// Identity interpolation preserves finite layout transforms in React component tests.
reanimatedMock.interpolate = (value: number) => value;

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-crypto con el módulo crypto de Node (mismos algoritmos, deterministas).
jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    CryptoEncoding: { HEX: 'hex' },
    randomUUID: () => nodeCrypto.randomUUID(),
    getRandomBytesAsync: async (n: number) => new Uint8Array(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_alg: string, data: string) => nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

// expo-secure-store en memoria.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: async (k: string) => store.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => {
      store.set(k, v);
    },
    deleteItemAsync: async (k: string) => {
      store.delete(k);
    },
    __store: store,
  };
});

// expo-notifications en memoria: registra lo programado para verificar el NotificationScheduler.
jest.mock('expo-notifications', () => {
  const scheduled: { identifier?: string; content: unknown; trigger: unknown }[] = [];
  return {
    __scheduled: scheduled,
    SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly', TIME_INTERVAL: 'timeInterval' },
    AndroidImportance: { HIGH: 4 },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    getPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    cancelAllScheduledNotificationsAsync: jest.fn(async () => {
      scheduled.length = 0;
    }),
    scheduleNotificationAsync: jest.fn(async (req: { identifier?: string; content: unknown; trigger: unknown }) => {
      scheduled.push(req);
      return req.identifier ?? String(scheduled.length);
    }),
  };
});

// Sin red real en las pruebas (buddy-testing): fetch falla salvo que una prueba lo simule con respuestas fijas.
globalThis.fetch = jest.fn(async () => {
  throw new Error('Sin red en las pruebas');
}) as unknown as typeof fetch;
