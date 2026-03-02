import { describe, it, expect } from "vitest";
import { matchCode, extractMatchContext } from "../lib/parser/tokenMatcher";

describe("matchCode", () => {
  it("matches single token", () => {
    expect(matchCode("中", "中")).toBe(true);
  });

  it("matches in slash-separated list", () => {
    expect(matchCode("清/徐/宇/中", "中")).toBe(true);
  });

  it("matches with colon separator", () => {
    expect(matchCode("深坑:中", "中")).toBe(true);
  });

  it("matches with 、separator", () => {
    expect(matchCode("清、中、宇", "中")).toBe(true);
  });

  it("matches with space separator", () => {
    expect(matchCode("清 中 宇", "中")).toBe(true);
  });

  it("does NOT match partial token '中心'", () => {
    expect(matchCode("中心", "中")).toBe(false);
  });

  it("does NOT match '清中' (no separator)", () => {
    expect(matchCode("清中", "中")).toBe(false);
  });

  it("handles null/undefined", () => {
    expect(matchCode(null, "中")).toBe(false);
    expect(matchCode(undefined, "中")).toBe(false);
    expect(matchCode("", "中")).toBe(false);
  });

  it("matches other codes", () => {
    expect(matchCode("清/徐/宇/中", "清")).toBe(true);
    expect(matchCode("清/徐/宇/中", "徐")).toBe(true);
    expect(matchCode("清/徐/宇/中", "宇")).toBe(true);
  });

  it("does not match different code", () => {
    expect(matchCode("清/徐/宇", "中")).toBe(false);
  });

  it("handles full-width separators", () => {
    expect(matchCode("清，中，宇", "中")).toBe(true);
  });
});
