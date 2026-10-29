import { describe, expect, it } from "vitest";
import { readFlags, toggleFlag, type FlagStorage } from "./flag-store";

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
  it("toggling the same question twice leaves no flag", () => {
    const s = memoryStorage();
    toggleFlag(s, "A", "q1");
    toggleFlag(s, "A", "q1");
    expect(readFlags(s, "A").size).toBe(0);
  });

  it("flags are scoped per attempt", () => {
    const s = memoryStorage();
    toggleFlag(s, "A", "q1");
    expect(readFlags(s, "A")).toEqual(new Set(["q1"]));
    expect(readFlags(s, "B")).toEqual(new Set());
  });

  it("with null storage, toggleFlag still returns the new set", () => {
    expect(toggleFlag(null, "A", "q1")).toEqual(new Set(["q1"]));
    expect(readFlags(null, "A")).toEqual(new Set());
  });

  it("never throws when storage throws, and readFlags returns empty", () => {
    expect(() => readFlags(broken, "A")).not.toThrow();
    expect(readFlags(broken, "A")).toEqual(new Set());
    expect(() => toggleFlag(broken, "A", "q1")).not.toThrow();
    expect(toggleFlag(broken, "A", "q1")).toEqual(new Set(["q1"]));
  });

  it("corrupt JSON in storage reads as empty", () => {
    const s = memoryStorage();
    s.map.set("aksara:flags:A", "{not json");
    expect(readFlags(s, "A")).toEqual(new Set());
  });

  it("stores a JSON array under aksara:flags:<attemptId>", () => {
    const s = memoryStorage();
    toggleFlag(s, "A", "q1");
    toggleFlag(s, "A", "q2");
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
