import { ParsedEvent, TimeTemplates } from "../types";
import { matchCode } from "./tokenMatcher";
import { parseDateCell, buildDateTime } from "./dateParser";
import { Grid, BlockBoundaries } from "./blockDetector";
import { makeDedupeKey, generateId, cellAddress } from "./utils";

interface WeekendOptions {
  code: string;
  month: string;
  fileName: string;
  sheetName: string;
  boundaries: BlockBoundaries;
  grid: Grid;
  gridRowOffset?: number;
  timeTemplates: TimeTemplates;
  parserVersion?: string;
}

/**
 * Parse weekend shift block.
 *
 * Structure (per spec):
 * - Each row: col 0 = date string like "2026/3/28(六)"
 * - Other cols: code cells (may have a header row for col names)
 * - First row in block might be a header row (labels for each column)
 */
export function generateWeekendEvents(opts: WeekendOptions): ParsedEvent[] {
  const {
    code, month, fileName, sheetName, boundaries, grid, timeTemplates, parserVersion,
    gridRowOffset = 0,
  } = opts;

  const { weekendRow, weekendStart, weekendEnd } = boundaries;
  if (weekendStart === null || weekendEnd === null) return [];

  const year = parseInt(month.split("-")[0], 10);
  const monthNum = parseInt(month.split("-")[1], 10);

  const times = timeTemplates.weekend;
  const tags = ["#wmfm-schedule", `#code-${code}`, `#${month}`];
  const events: ParsedEvent[] = [];

  // Extract col headers from the 週末班 anchor row (weekendRow)
  let colHeaders: (string | null)[] = [];
  if (weekendRow !== null && grid[weekendRow]) {
    colHeaders = grid[weekendRow].map((v) =>
      v !== null && v !== undefined && String(v).trim() ? String(v).trim() : null
    );
  }

  const dataStart = weekendStart;

  for (let r = dataStart; r < weekendEnd; r++) {
    const row = grid[r];
    if (!row) continue;

    const dateCell = row[0];
    if (dateCell === null || dateCell === undefined || String(dateCell).trim() === "") continue;

    const date = parseDateCell(dateCell, year, monthNum);
    if (!date) continue;

    // Check each column (skip col 0 which is the date, skip stats cols)
    for (let c = 1; c < row.length; c++) {
      const header = colHeaders[c] ?? "";
      // Skip statistics / summary columns (R總班數, 班數, and numeric-only headers)
      if (/班數|總班|^R/.test(header) || /^\d+$/.test(header)) continue;
      const cellVal = row[c];
      if (!matchCode(cellVal, code)) continue;

      const colLabel = colHeaders[c] ?? null;
      const taskLabel = colLabel ? `週末班-${colLabel}` : "週末班";
      const dedupeKey = makeDedupeKey(date, "weekend", taskLabel, code);
      const absRow = r + gridRowOffset;

      events.push({
        id: generateId(),
        code,
        month,
        date,
        slot: "weekend",
        title: `家醫-週末-${taskLabel}`,
        location: colLabel ? inferLocation(colLabel) : null,
        start: buildDateTime(date, times.start),
        end: buildDateTime(date, times.end),
        timezone: "Asia/Taipei",
        tags,
        dedupeKey,
        taskLabel,
        source: {
          fileName,
          sheetName,
          cell: cellAddress(absRow, c),
          parserVersion,
        },
        raw: String(cellVal),
        notes: null,
      });
    }
  }

  return events;
}

function inferLocation(label: string): string | null {
  if (/2F/i.test(label)) return "2F";
  if (/13F|13樓/i.test(label)) return "13F";
  return null;
}
