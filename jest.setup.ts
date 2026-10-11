// Reanimated necesita módulos nativos: se usa su mock oficial, que no incluye useReducedMotion.
// Se completa el propio módulo del mock porque expo-router/testing-library también lo reutiliza.
const reanimatedMock = require('react-native-reanimated/mock');
reanimatedMock.useReducedMotion = () => false;

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
