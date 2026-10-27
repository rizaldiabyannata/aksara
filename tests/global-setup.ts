import { execFileSync } from "node:child_process";
import { assertTestDatabaseUrl, TEST_DATABASE_URL } from "./test-db-url";

export default function setup() {
  assertTestDatabaseUrl(TEST_DATABASE_URL);
  execFileSync("bunx", ["prisma", "migrate", "deploy"], {
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });
}
