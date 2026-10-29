import { defineConfig, devices } from "@playwright/test";
import { TEST_DATABASE_URL } from "./tests/test-db-url.mts";

// E2E shares aksara_test with Vitest: run `bun run test` and `bun run test:e2e` one after the other, never together.
const env = { DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL };

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run build && bunx next start -p 3100",
    url: "http://localhost:3100/login",
    env,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
