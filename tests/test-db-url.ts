export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://aksara:aksara@localhost:5433/aksara_test";

// Guard: global-setup resets the DB, so refuse anything not named *_test.
export function assertTestDatabaseUrl(url: string): void {
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests: database "${dbName}" does not end with "_test"`,
    );
  }
}
