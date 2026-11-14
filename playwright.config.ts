import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against its own SQLite file and port so it never touches dev.db.
 * Override with E2E_PORT / E2E_DB when running several suites side by side.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const DB = process.env.E2E_DB ?? "e2e.db";
const env = {
  DATABASE_URL: `file:./${DB}`,
  STORAGE_DIR: `./storage-${DB.replace(/\W/g, "")}`,
  NEXT_DIST_DIR: `.next-${PORT}`,
  DISABLE_RATE_LIMIT: "false",
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
};
for (const [k, v] of Object.entries(env)) process.env[k] = v;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "off", ...devices["Desktop Chrome"] },
  webServer: {
    command: `npx tsx tests/e2e/reset-db.ts && npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/currencies`,
    reuseExistingServer: false,
    timeout: 180_000,
    env,
  },
});
