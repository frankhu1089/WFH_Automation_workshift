/**
 * Simple djb2-based hash for deterministic dedupeKey.
 * Works in both Node.js and browser without any imports.
 */
export function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // 32-bit integer
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Build a stable dedupeKey from event key components.
 */
export function makeDedupeKey(
  date: string,
  slot: string,
  taskLabel: string,
  code: string
): string {
  const raw = `${date}|${slot}|${taskLabel}|${code}`;
  return djb2Hash(raw);
}

/**
 * Generate a UUID v4-style id (not cryptographically secure, sufficient for local use).
 */
export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert col index to Excel column letter (0-based).
 * 0 → A, 25 → Z, 26 → AA, etc.
 */
export function colIndexToLetter(col: number): string {
  let result = "";
  let n = col + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/**
 * Build A1-style cell address from 0-based row/col.
 */
export function cellAddress(row: number, col: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}
