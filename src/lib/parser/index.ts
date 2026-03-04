import * as XLSX from "xlsx";
import {
  ParseResult,
  ParseOptions,
  ParseFileInput,
  DEFAULT_TIME_TEMPLATES,
  DEFAULT_CLINIC_RULES,
  ParseDiagnostics,
  ParsedEvent,
} from "../types";
import { monthFromFileName } from "./dateParser";
import { detectBlocks, Grid } from "./blockDetector";
import { generateBlockEvents } from "./eventGenerator";
import { generateWeekendEvents } from "./weekendParser";
import { generateClinicEvents } from "./clinicGenerator";
import { detectConflicts } from "./conflictDetector";

export const PARSER_VERSION = "1.0.0";

/**
 * Convert a worksheet to a 2D grid of raw values.
 * Handles merged cells by propagating the master cell value.
 */
function worksheetToGrid(ws: XLSX.WorkSheet): Grid {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const rows = range.e.r - range.s.r + 1;
  const cols = range.e.c - range.s.c + 1;

  // Initialize grid with nulls
  const grid: Grid = Array.from({ length: rows }, () => new Array(cols).fill(null));

  // Fill in cell values
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) continue;

      const ri = r - range.s.r;
      const ci = c - range.s.c;

      // Prefer formatted text (w) for display, fall back to raw value (v)
      // For dates use the raw number so we can convert properly
      if (cell.t === "n" && cell.v !== undefined) {
        // Could be a date serial — keep as number if it looks like one
        grid[ri][ci] = cell.v;
      } else if (cell.w) {
        grid[ri][ci] = cell.w;
      } else if (cell.v !== undefined) {
        grid[ri][ci] = cell.v;
      }
    }
  }

  // Expand merged cells: copy master value to all cells in merge range
  const merges = ws["!merges"] ?? [];
  for (const merge of merges) {
    const masterR = merge.s.r - range.s.r;
    const masterC = merge.s.c - range.s.c;
    const masterVal = grid[masterR]?.[masterC];

    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const ri = r - range.s.r;
        const ci = c - range.s.c;
        if (ri >= 0 && ci >= 0 && ri < rows && ci < cols) {
          if (grid[ri][ci] === null || grid[ri][ci] === undefined) {
            grid[ri][ci] = masterVal;
          }
        }
      }
    }
  }

  return grid;
}

/**
 * Parse a single file input into events.
 */
function parseOneFile(
  file: ParseFileInput,
  opts: Required<ParseOptions>,
  diagnostics: ParseDiagnostics
): ParsedEvent[] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(file.data, {
      type: "array",
      cellDates: false, // keep as serial numbers so we control conversion
      cellNF: true,
      cellText: true,
    });
  } catch (err) {
    diagnostics.errors.push(`Failed to read ${file.fileName}: ${err}`);
    return [];
  }

  const events: ParsedEvent[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws["!ref"]) continue;

    const grid = worksheetToGrid(ws);
    const boundaries = detectBlocks(grid);

    if (boundaries.dateHeaderRow === null) {
      diagnostics.errors.push(
        `${file.fileName}/${sheetName}: NO_DATE_HEADER — could not find 日期 row`
      );
      continue;
    }

    if (boundaries.dateStartCol === null) {
      diagnostics.errors.push(
        `${file.fileName}/${sheetName}: NO_PARSABLE_DATES — could not find date columns`
      );
      continue;
    }

    diagnostics.blocksFound.morning = diagnostics.blocksFound.morning || boundaries.morningStart !== null;
    diagnostics.blocksFound.afternoon = diagnostics.blocksFound.afternoon || boundaries.afternoonStart !== null;
    diagnostics.blocksFound.weekend = diagnostics.blocksFound.weekend || boundaries.weekendStart !== null;

    const baseOpts = {
      code: opts.code,
      month: opts.month,
      fileName: file.fileName,
      sheetName,
      boundaries,
      grid,
      timeTemplates: opts.timeTemplates,
      parserVersion: opts.parserVersion,
    };

    const morningEvents = generateBlockEvents(baseOpts, "morning");
    const afternoonEvents = generateBlockEvents(baseOpts, "afternoon");
    const weekendEvents = generateWeekendEvents(baseOpts);

    events.push(...morningEvents, ...afternoonEvents, ...weekendEvents);
  }

  return events;
}

/**
 * Main entry point.
 * Accepts 1 or 2 files (上半月 + 下半月), returns merged event list + diagnostics.
 */
export function parseFiles(
  files: ParseFileInput[],
  options: ParseOptions
): ParseResult {
  const diagnostics: ParseDiagnostics = {
    warnings: [],
    errors: [],
    conflicts: [],
    blocksFound: { morning: false, afternoon: false, weekend: false },
    eventCount: 0,
  };

  // Determine month: explicit > from first filename
  let month = options.month;
  if (!month) {
    for (const f of files) {
      const detected = monthFromFileName(f.fileName);
      if (detected) {
        month = detected;
        break;
      }
    }
  }
  if (!month) {
    diagnostics.warnings.push("NEED_USER_MONTH: Could not detect month from filenames");
    month = "0000-00";
  }

  const opts: Required<ParseOptions> = {
    code: options.code,
    month,
    timeTemplates: options.timeTemplates ?? DEFAULT_TIME_TEMPLATES,
    clinicRules: options.clinicRules ?? DEFAULT_CLINIC_RULES,
    parserVersion: options.parserVersion ?? PARSER_VERSION,
  };

  // Parse each file
  let allEvents: ParsedEvent[] = [];
  for (const file of files) {
    const fileEvents = parseOneFile(file, opts, diagnostics);
    allEvents = allEvents.concat(fileEvents);
  }

  // Add clinic events — suppress any clinic whose time bucket is already covered
  // by a schedule event (e.g. OPD on Monday morning IS the fixed clinic)
  const clinicEvents = generateClinicEvents(
    month,
    opts.code,
    opts.clinicRules,
    opts.timeTemplates
  );

  const morningDates = new Set(allEvents.filter((e) => e.slot === "morning").map((e) => e.date));
  const afternoonDates = new Set(allEvents.filter((e) => e.slot === "afternoon").map((e) => e.date));

  for (const ce of clinicEvents) {
    const hour = parseInt(ce.start.split("T")[1]?.split(":")[0] ?? "0");
    const isMorningClinic = hour < 13;
    const covered = isMorningClinic ? morningDates.has(ce.date) : afternoonDates.has(ce.date);
    if (covered) {
      diagnostics.warnings.push(
        `Clinic suppressed on ${ce.date}: schedule already has a ${isMorningClinic ? "morning" : "afternoon"} event`
      );
    } else {
      allEvents.push(ce);
    }
  }

  // Deduplicate by dedupeKey (keep first occurrence)
  const seen = new Set<string>();
  const deduped: ParsedEvent[] = [];
  for (const event of allEvents) {
    if (!seen.has(event.dedupeKey)) {
      seen.add(event.dedupeKey);
      deduped.push(event);
    } else {
      diagnostics.warnings.push(
        `Duplicate dedupeKey ${event.dedupeKey} skipped (${event.title} on ${event.date})`
      );
    }
  }

  // Sort by date + slot
  deduped.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.start < b.start ? -1 : 1;
  });

  // Detect conflicts
  diagnostics.conflicts = detectConflicts(deduped);

  diagnostics.eventCount = deduped.length;

  return { events: deduped, diagnostics };
}
