import { execFileSync } from "node:child_process";
import { assertTestDatabaseUrl, TEST_DATABASE_URL } from "../tests/test-db-url.mts";

export default function setup() {
  assertTestDatabaseUrl(TEST_DATABASE_URL);
  const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL };
  execFileSync("bunx", ["prisma", "migrate", "deploy"], { env, stdio: "inherit" });
}
