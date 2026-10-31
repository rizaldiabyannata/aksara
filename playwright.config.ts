import { defineConfig, devices } from "@playwright/test";
import { assertTestDatabaseUrl, TEST_DATABASE_URL } from "./tests/test-db-url.mts";

assertTestDatabaseUrl(TEST_DATABASE_URL);

// E2E shares aksara_test with Vitest: run `bun run test` and `bun run test:e2e` one after the other, never together.
const env = {
  DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL,
  // Override inherited .env storage: E2E must never upload to a real bucket.
  S3_ENDPOINT: "http://127.0.0.1:3101", S3_REGION: "ap-southeast-1",
  S3_ACCESS_KEY_ID: "e2e-only", S3_SECRET_ACCESS_KEY: "e2e-only", S3_BUCKET: "aksara-test",
};

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  fullyParallel: false,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: [{
    command: "bun e2e/storage-server.ts",
    url: "http://127.0.0.1:3101/health",
    reuseExistingServer: false,
  }, {
    command: "bun run build && bunx next start -p 3100",
    url: "http://localhost:3100/login",
    env,
    reuseExistingServer: false,
    timeout: 300_000,
  }],
});
