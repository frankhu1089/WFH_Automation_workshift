/**
 * Integration tests using the real 202603 Excel files.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseFiles } from "../lib/parser/index";
import { ParseResult } from "../lib/types";

const ROOT = join(__dirname, "../..");

let result: ParseResult;

beforeAll(() => {
  const files = [
    {
      fileName: "202603上半月V3.xlsx",
      data: readFileSync(join(ROOT, "202603上半月V3.xlsx")),
    },
    {
      fileName: "202603下半月V3.xlsx",
      data: readFileSync(join(ROOT, "202603下半月V3.xlsx")),
    },
  ];
  result = parseFiles(files, { code: "中", month: "2026-03" });
});

describe("parser integration (202603)", () => {
  it("produces at least 1 event", () => {
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("all events have correct month", () => {
    for (const e of result.events) {
      expect(e.month).toBe("2026-03");
    }
  });

  it("all events have correct code", () => {
    for (const e of result.events) {
      expect(e.code).toBe("中");
    }
  });

  it("all events have required tags", () => {
    for (const e of result.events) {
      expect(e.tags).toContain("#wmfm-schedule");
      expect(e.tags).toContain("#code-中");
      expect(e.tags).toContain("#2026-03");
    }
  });

  it("all events have valid slot", () => {
    const validSlots = new Set(["morning", "afternoon", "weekend", "clinic"]);
    for (const e of result.events) {
      expect(validSlots.has(e.slot)).toBe(true);
    }
  });

  it("all events have valid date format (YYYY-MM-DD)", () => {
    for (const e of result.events) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all event dates are in March 2026", () => {
    for (const e of result.events) {
      expect(e.date).toMatch(/^2026-03-/);
    }
  });

  it("all events have non-empty title", () => {
    for (const e of result.events) {
      expect(e.title.trim().length).toBeGreaterThan(0);
    }
  });

  it("all events have stable unique dedupeKey", () => {
    const keys = result.events.map((e) => e.dedupeKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("no critical parse errors", () => {
    // Errors about missing blocks should not exist for real files
    const criticalErrors = result.diagnostics.errors.filter((e) =>
      e.includes("NO_DATE_HEADER")
    );
    expect(criticalErrors.length).toBe(0);
  });

  it("morning and afternoon blocks are found", () => {
    expect(result.diagnostics.blocksFound.morning).toBe(true);
    expect(result.diagnostics.blocksFound.afternoon).toBe(true);
  });

  it("clinic events are generated for Monday/Wednesday in March 2026", () => {
    const clinics = result.events.filter((e) => e.slot === "clinic");
    // March 2026: Mon/Wed count = (Mon: 2,9,16,23,30) + (Wed: 4,11,18,25) = 9 clinic events
    expect(clinics.length).toBeGreaterThanOrEqual(8);
  });

  it("events are sorted by date", () => {
    for (let i = 1; i < result.events.length; i++) {
      expect(result.events[i].date >= result.events[i - 1].date).toBe(true);
    }
  });

  it("conflicts (if any) have ⚠️CONFLICT in notes", () => {
    for (const conflict of result.diagnostics.conflicts) {
      // Find the events involved
      const conflictingEvents = result.events.filter(
        (e) => e.date === conflict.date && e.slot === conflict.slot
      );
      for (const e of conflictingEvents) {
        expect(e.notes).toContain("⚠️CONFLICT");
      }
    }
  });
});

describe("parser with wrong code", () => {
  it("produces 0 shift events for unknown code (only clinic events)", () => {
    const files = [
      {
        fileName: "202603上半月V3.xlsx",
        data: readFileSync(join(ROOT, "202603上半月V3.xlsx")),
      },
    ];
    const r = parseFiles(files, { code: "XXXXXX", month: "2026-03" });
    // Clinic events from rules will still be there, but no shift events
    const shiftEvents = r.events.filter((e) => e.slot !== "clinic");
    expect(shiftEvents.length).toBe(0);
  });
});
