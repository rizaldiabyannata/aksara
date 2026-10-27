import { describe, expect, it } from "vitest";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { assertTestDatabaseUrl } from "@/tests/test-db-url.mts";
import { makeClass, makeStudent } from "@/tests/factories";

describe("assertTestDatabaseUrl", () => {
  it("rejects a non-_test database", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://u:p@localhost:5433/aksara_dev"),
    ).toThrow('database "aksara_dev" does not end with "_test"');
  });
  it("accepts a _test database", () => {
    expect(() =>
      assertTestDatabaseUrl("postgresql://u:p@localhost:5433/aksara_test"),
    ).not.toThrow();
  });
});

async function expectP2002(p: Promise<unknown>) {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  expect((err as Prisma.PrismaClientKnownRequestError).code).toBe("P2002");
}

async function expectCheck(p: Promise<unknown>, constraint: string) {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(Error);
  expect((err as Error).message).toContain(constraint);
}

describe("schema constraints", () => {
  it("rejects a STUDENT without classId (User_role_fields_check)", async () => {
    await expectCheck(
      prisma.user.create({
        data: { role: "STUDENT", displayName: "A", loginName: "a" },
      }),
      "User_role_fields_check",
    );
  });

  it("rejects a TEACHER with classId (User_role_fields_check)", async () => {
    const c = await makeClass();
    await expectCheck(
      prisma.user.create({
        data: {
          role: "TEACHER",
          username: "guru",
          passwordHash: "x",
          displayName: "G",
          classId: c.id,
        },
      }),
      "User_role_fields_check",
    );
  });

  it("rejects a class code containing 0 (Class_code_format_check)", async () => {
    await expectCheck(
      prisma.class.create({ data: { name: "K", code: "ABCDE0" } }),
      "Class_code_format_check",
    );
  });

  it("rejects a malformed nis (User_nis_format_check)", async () => {
    const c = await makeClass();
    await expectCheck(
      makeStudent(c.id, { nis: "12ab" }),
      "User_nis_format_check",
    );
  });

  it("rejects the same loginName in the same class with P2002", async () => {
    const c = await makeClass();
    await makeStudent(c.id, { loginName: "budi" });
    await expectP2002(makeStudent(c.id, { loginName: "budi" }));
  });

  it("allows the same loginName in different classes", async () => {
    const [a, b] = [await makeClass(), await makeClass()];
    await makeStudent(a.id, { loginName: "budi" });
    await expect(makeStudent(b.id, { loginName: "budi" })).resolves.toMatchObject(
      { loginName: "budi", classId: b.id },
    );
  });

  it("rejects the same nis in two classes with P2002", async () => {
    const [a, b] = [await makeClass(), await makeClass()];
    await makeStudent(a.id, { nis: "12345" });
    await expectP2002(makeStudent(b.id, { nis: "12345" }));
  });
});
