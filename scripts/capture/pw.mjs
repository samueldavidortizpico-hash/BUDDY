/**
 * Carga playwright-core: primero del proyecto y, si no está, del paquete global de playwright-cli
 * (npm i -g @playwright/cli). Los navegadores se instalan con `npx playwright install chromium`.
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const candidates = [
  'playwright-core',
  process.env.PLAYWRIGHT_CORE,
  join(process.env.APPDATA ?? '', 'npm', 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright-core'),
  '/usr/local/lib/node_modules/@playwright/cli/node_modules/playwright-core',
].filter(Boolean);

export function loadPlaywright() {
  for (const c of candidates) {
    try {
      return require(c);
    } catch {}
  }
  throw new Error('No encontré playwright-core. Instala @playwright/cli (npm i -g @playwright/cli) o define PLAYWRIGHT_CORE.');
}
