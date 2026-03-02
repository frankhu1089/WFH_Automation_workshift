import { ParsedEvent, Slot, TimeTemplates } from "../types";
import { matchCode } from "./tokenMatcher";
import { parseDateCell, buildDateTime } from "./dateParser";
import { Grid, BlockBoundaries } from "./blockDetector";
import { makeDedupeKey, generateId, cellAddress } from "./utils";

interface GenerateOptions {
  code: string;
  month: string; // YYYY-MM
  fileName: string;
  sheetName: string;
  boundaries: BlockBoundaries;
  grid: Grid;
  // row offset of grid[0] in the original sheet (for cell address computation)
  gridRowOffset?: number;
  timeTemplates: TimeTemplates;
  parserVersion?: string;
}

function extractYear(month: string): number {
  return parseInt(month.split("-")[0], 10);
}

function extractMonth(month: string): number {
  return parseInt(month.split("-")[1], 10);
}

/**
 * Extract dates from the date header row.
 * Returns an array indexed by column (null if no date for that col).
 */
function extractDateHeaders(
  grid: Grid,
  dateHeaderRow: number,
  dateStartCol: number,
  year: number,
  month: number
): (string | null)[] {
  const row = grid[dateHeaderRow];
  const dates: (string | null)[] = new Array(row.length).fill(null);

  for (let c = dateStartCol; c < row.length; c++) {
    const parsed = parseDateCell(row[c], year, month);
    dates[c] = parsed;
  }
  return dates;
}

/**
 * Get the time range for a given slot from the templates.
 */
function slotTimes(
  slot: Slot,
  templates: TimeTemplates
): { start: string; end: string } {
  switch (slot) {
    case "morning":
      return templates.morning;
    case "afternoon":
      return templates.afternoon;
    case "weekend":
      return templates.weekend;
    case "clinic":
      return templates.clinic;
  }
}

/**
 * Build the event title from slot and taskLabel.
 */
function buildTitle(slot: Slot, taskLabel: string): string {
  const slotLabel = slot === "morning" ? "上午" : slot === "afternoon" ? "下午" : "週末";
  return `家醫-${slotLabel}-${taskLabel}`;
}

/**
 * Extract a clean task label from the first cell of a data row.
 * Strips leading/trailing whitespace, handles null.
 */
function extractTaskLabel(cellValue: unknown): string | null {
  if (cellValue === null || cellValue === undefined) return null;
  const s = String(cellValue).trim();
  return s || null;
}

/**
 * Generate ParsedEvents from a morning or afternoon block.
 */
export function generateBlockEvents(opts: GenerateOptions, slot: "morning" | "afternoon"): ParsedEvent[] {
  const {
    code, month, fileName, sheetName, boundaries, grid, timeTemplates, parserVersion,
    gridRowOffset = 0,
  } = opts;

  const year = extractYear(month);
  const monthNum = extractMonth(month);

  if (boundaries.dateHeaderRow === null || boundaries.dateStartCol === null) return [];

  const blockStart = slot === "morning" ? boundaries.morningStart : boundaries.afternoonStart;
  const blockEnd = slot === "morning" ? boundaries.morningEnd : boundaries.afternoonEnd;

  if (blockStart === null || blockEnd === null) return [];

  const dates = extractDateHeaders(
    grid,
    boundaries.dateHeaderRow,
    boundaries.dateStartCol,
    year,
    monthNum
  );

  const events: ParsedEvent[] = [];
  const times = slotTimes(slot, timeTemplates);
  const tags = ["#wmfm-schedule", `#code-${code}`, `#${month}`];

  for (let r = blockStart; r < blockEnd; r++) {
    const row = grid[r];
    if (!row) continue;

    const taskLabel = extractTaskLabel(row[boundaries.labelCol]);
    // Skip rows with no label or that look like section headers
    if (!taskLabel) continue;

    for (let c = boundaries.dateStartCol; c < row.length; c++) {
      const cellVal = row[c];
      if (!matchCode(cellVal, code)) continue;

      const date = dates[c];
      if (!date) continue;

      const dedupeKey = makeDedupeKey(date, slot, taskLabel, code);
      const absRow = r + gridRowOffset;
      const absRowForHeader = boundaries.dateHeaderRow + gridRowOffset;

      events.push({
        id: generateId(),
        code,
        month,
        date,
        slot,
        title: buildTitle(slot, taskLabel),
        location: inferLocation(taskLabel),
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

/**
 * Attempt to infer a location hint from the task label.
 */
function inferLocation(taskLabel: string): string | null {
  if (/2F/i.test(taskLabel)) return "2F";
  if (/13F|13樓/i.test(taskLabel)) return "13F";
  return null;
}
