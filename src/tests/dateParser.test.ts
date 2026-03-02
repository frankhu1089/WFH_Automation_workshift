import { describe, it, expect } from "vitest";
import { parseDateCell, excelSerialToDate, monthFromFileName } from "../lib/parser/dateParser";

describe("monthFromFileName", () => {
  it("extracts YYYY-MM from 202603上半月V3.xlsx", () => {
    expect(monthFromFileName("202603上半月V3.xlsx")).toBe("2026-03");
  });

  it("extracts YYYY-MM from 202603下半月V3.xlsx", () => {
    expect(monthFromFileName("202603下半月V3.xlsx")).toBe("2026-03");
  });

  it("returns null for unrecognized filename", () => {
    expect(monthFromFileName("roster.xlsx")).toBeNull();
  });
});

describe("excelSerialToDate", () => {
  it("converts serial 45000 to a valid date", () => {
    const result = excelSerialToDate(45000);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("is monotonically increasing", () => {
    const d1 = excelSerialToDate(46071);
    const d2 = excelSerialToDate(46082);
    expect(d2 > d1).toBe(true);
  });
});

describe("parseDateCell", () => {
  it("parses '3/16' with year/month context", () => {
    expect(parseDateCell("3/16", 2026, 3)).toBe("2026-03-16");
  });

  it("parses '3/16(一)' stripping weekday", () => {
    expect(parseDateCell("3/16(一)", 2026, 3)).toBe("2026-03-16");
  });

  it("parses full date string 2026/3/16", () => {
    expect(parseDateCell("2026/3/16", 2026, 3)).toBe("2026-03-16");
  });

  it("parses ISO date string", () => {
    expect(parseDateCell("2026-03-16", 2026, 3)).toBe("2026-03-16");
  });

  it("parses Excel serial number to a valid date", () => {
    const result = parseDateCell(46071, 2026, 3);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns null for empty string", () => {
    expect(parseDateCell("", 2026, 3)).toBeNull();
  });

  it("returns null for null", () => {
    expect(parseDateCell(null, 2026, 3)).toBeNull();
  });

  it("parses day-only number", () => {
    expect(parseDateCell("16", 2026, 3)).toBe("2026-03-16");
  });
});
