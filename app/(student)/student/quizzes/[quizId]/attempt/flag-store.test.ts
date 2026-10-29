import { describe, expect, it } from "vitest";
import { readFlags, writeFlags, type FlagStorage } from "./flag-store";

const memoryStorage = (): FlagStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
};

const broken: FlagStorage = {
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("denied");
  },
};

describe("flag-store", () => {
  it("writing an empty set clears the flags", () => {
    const s = memoryStorage();
    writeFlags(s, "A", new Set(["q1"]));
    writeFlags(s, "A", new Set());
    expect(readFlags(s, "A").size).toBe(0);
  });

  it("flags are scoped per attempt", () => {
    const s = memoryStorage();
    writeFlags(s, "A", new Set(["q1"]));
    expect(readFlags(s, "A")).toEqual(new Set(["q1"]));
    expect(readFlags(s, "B")).toEqual(new Set());
  });

  it("with null storage, writeFlags is a no-op", () => {
    expect(() => writeFlags(null, "A", new Set(["q1"]))).not.toThrow();
    expect(readFlags(null, "A")).toEqual(new Set());
  });

  it("never throws when storage throws, and readFlags returns empty", () => {
    expect(() => readFlags(broken, "A")).not.toThrow();
    expect(readFlags(broken, "A")).toEqual(new Set());
    expect(() => writeFlags(broken, "A", new Set(["q1"]))).not.toThrow();
  });

  it("corrupt JSON in storage reads as empty", () => {
    const s = memoryStorage();
    s.map.set("aksara:flags:A", "{not json");
    expect(readFlags(s, "A")).toEqual(new Set());
  });

  it("stores a JSON array under aksara:flags:<attemptId>", () => {
    const s = memoryStorage();
    writeFlags(s, "A", new Set(["q1", "q2"]));
    expect(JSON.parse(s.map.get("aksara:flags:A") ?? "null")).toEqual(["q1", "q2"]);
  });

  it("non-array or non-string JSON reads as empty", () => {
    const s = memoryStorage();
    s.map.set("aksara:flags:A", '{"q1":true}');
    expect(readFlags(s, "A")).toEqual(new Set());
    s.map.set("aksara:flags:A", "[1,2]");
    expect(readFlags(s, "A")).toEqual(new Set());
  });
});
