/**
 * Detects block boundaries in the worksheet 2D grid.
 *
 * Blocks:
 *   - morning:  from "日期" row+1 to before "下午" row
 *   - afternoon: from "下午" row to before "晚上" | "週末班" | "統計" row
 *   - weekend:  from "週末班" row+1 to before "統計" or end
 */

export type Grid = (string | number | boolean | null)[][];

export interface BlockBoundaries {
  // row indices (0-based)
  dateHeaderRow: number | null;    // row containing "日期"
  dateStartCol: number | null;     // first col with actual dates in dateHeaderRow
  labelCol: number;                // col of task labels = dateStartCol - 1

  morningStart: number | null;
  morningEnd: number | null;       // exclusive

  afternoonStart: number | null;
  afternoonEnd: number | null;     // exclusive

  weekendRow: number | null;       // row containing "週末班" anchor (also the col-header row)
  weekendStart: number | null;     // weekendRow + 1
  weekendEnd: number | null;       // exclusive
}

const ANCHOR_DATE = /日期/;
const ANCHOR_AFTERNOON = /下午/;
const ANCHOR_EVENING = /晚上/;
const ANCHOR_WEEKEND = /週末班/;
const ANCHOR_STATS = /統計/;

function cellText(val: Grid[0][0]): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function rowContains(row: Grid[0], pattern: RegExp): boolean {
  return row.some((c) => pattern.test(cellText(c)));
}

function findAnchorRow(grid: Grid, pattern: RegExp, startRow = 0): number | null {
  for (let r = startRow; r < grid.length; r++) {
    if (rowContains(grid[r], pattern)) return r;
  }
  return null;
}

/**
 * Find the first column in dateHeaderRow that contains a plausible date value
 * (number > 1000 = Excel serial, or string matching date-like pattern).
 */
function findDateStartCol(row: Grid[0]): number {
  for (let c = 0; c < row.length; c++) {
    const v = row[c];
    if (v === null || v === undefined || v === "") continue;
    if (typeof v === "number" && v > 1000) return c;
    const s = String(v).trim();
    // matches patterns like "3/16", "3/16(一)", "16", full dates
    if (/^\d{1,4}[\/\-]\d{1,2}/.test(s) || /^\d{1,2}[（\(][一二三四五六日][）\)]$/.test(s)) return c;
    // just a day number >= 1 in a reasonable position (col >= 1)
    if (c >= 1 && /^\d{1,2}$/.test(s) && parseInt(s) >= 1 && parseInt(s) <= 31) return c;
  }
  return 1; // fallback: assume col 1
}

export function detectBlocks(grid: Grid): BlockBoundaries {
  const dateHeaderRow = findAnchorRow(grid, ANCHOR_DATE);
  const afternoonRow = findAnchorRow(grid, ANCHOR_AFTERNOON);
  const eveningRow = findAnchorRow(grid, ANCHOR_EVENING, afternoonRow ?? 0);
  const weekendRow = findAnchorRow(grid, ANCHOR_WEEKEND);
  const statsRow = findAnchorRow(grid, ANCHOR_STATS, weekendRow ?? 0);

  let dateStartCol: number | null = null;
  if (dateHeaderRow !== null) {
    dateStartCol = findDateStartCol(grid[dateHeaderRow]);
  }

  // Morning: dateHeaderRow+1 → afternoonRow (exclusive)
  const morningStart = dateHeaderRow !== null ? dateHeaderRow + 1 : null;
  const morningEnd = afternoonRow;

  // Afternoon: afternoonRow itself (it contains data) → eveningRow|weekendRow|statsRow
  let afternoonStart: number | null = null;
  let afternoonEnd: number | null = null;
  if (afternoonRow !== null) {
    afternoonStart = afternoonRow;
    afternoonEnd = eveningRow ?? weekendRow ?? statsRow ?? grid.length;
  }

  // Weekend: weekendRow+1 → statsRow|end (weekendRow itself is the col-header row)
  let weekendStart: number | null = null;
  let weekendEnd: number | null = null;
  if (weekendRow !== null) {
    weekendStart = weekendRow + 1;
    weekendEnd = statsRow ?? grid.length;
  }

  // labelCol is the column just before dates — col 0 is section label, col 1 is task label
  const labelCol = dateStartCol !== null ? Math.max(0, dateStartCol - 1) : 0;

  return {
    dateHeaderRow,
    dateStartCol,
    labelCol,
    morningStart,
    morningEnd,
    afternoonStart,
    afternoonEnd,
    weekendRow,
    weekendStart,
    weekendEnd,
  };
}

/**
 * Extract a 2D slice from grid between [rowStart, rowEnd).
 */
export function sliceRows(grid: Grid, rowStart: number, rowEnd: number): Grid {
  return grid.slice(rowStart, rowEnd);
}
