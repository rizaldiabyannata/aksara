import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/test-db-url.mts";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    // Nested git worktrees.
    exclude: [...configDefaults.exclude, ".claude/**"],
    globalSetup: "tests/global-setup.ts",
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      __NEXT_EXPERIMENTAL_AUTH_INTERRUPTS: "true",
      TZ: "UTC",
    },
  },
});
