import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Taipei";

/**
 * Attempt to extract YYYY-MM from a filename.
 * Handles patterns like: 202603上半月V3.xlsx → 2026-03
 */
export function monthFromFileName(fileName: string): string | null {
  const m = fileName.match(/(\d{4})(\d{2})/);
  if (m) return `${m[1]}-${m[2]}`;
  return null;
}

/**
 * Convert an Excel date serial number to YYYY-MM-DD.
 * Excel epoch is 1899-12-30 (with a known leap-year bug in 1900).
 */
export function excelSerialToDate(serial: number): string {
  // Excel serial 1 = 1900-01-01, but Excel incorrectly treats 1900 as leap year
  // So serial 60 = 1900-02-28 (real), serial 61 = 1900-03-01 (skip Feb 29 1900)
  const epoch = new Date(1899, 11, 30); // 1899-12-30 UTC
  const date = new Date(epoch.getTime() + serial * 86400000);
  return dayjs(date).format("YYYY-MM-DD");
}

/**
 * Parse a date cell value to YYYY-MM-DD given the year/month context.
 * Handles: Excel serial, "3/16", "3/16(一)", "2026/3/16", "2026-03-16", etc.
 */
export function parseDateCell(
  value: unknown,
  contextYear: number,
  contextMonth: number
): string | null {
  if (value === null || value === undefined || value === "") return null;

  // Excel serial number
  if (typeof value === "number" && value > 1000) {
    return excelSerialToDate(value);
  }

  const str = String(value).trim();
  if (!str) return null;

  // Strip weekday annotation like (一)(二)...(日)
  const clean = str.replace(/[（\(][一二三四五六日][）\)]/g, "").trim();

  // Try full date patterns first
  const full = [
    "YYYY-MM-DD",
    "YYYY/MM/DD",
    "YYYY/M/D",
    "YYYY-M-D",
  ];
  for (const fmt of full) {
    const d = dayjs(clean, fmt, true);
    if (d.isValid()) return d.format("YYYY-MM-DD");
  }

  // Partial: M/D or MM/DD
  const partial = clean.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (partial) {
    const month = parseInt(partial[1], 10);
    const day = parseInt(partial[2], 10);
    const d = dayjs(`${contextYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    if (d.isValid()) return d.format("YYYY-MM-DD");
  }

  // Just a day number
  if (/^\d{1,2}$/.test(clean)) {
    const day = parseInt(clean, 10);
    if (day >= 1 && day <= 31) {
      const d = dayjs(`${contextYear}-${String(contextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
      if (d.isValid()) return d.format("YYYY-MM-DD");
    }
  }

  return null;
}

/**
 * Build an ISO 8601 local datetime string for a given date + HH:MM time.
 */
export function buildDateTime(date: string, timeHHMM: string): string {
  return `${date}T${timeHHMM}:00`;
}
