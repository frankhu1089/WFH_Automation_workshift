/**
 * Token-based roster code matching.
 * Split on common separators, check for exact token match.
 */

const SEP = /[\s\/,:，、\t\n\r＼／：，、]+/;

/**
 * Normalize full-width characters to ASCII equivalents before tokenizing.
 */
function normalize(text: string): string {
  return text
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .replace(/　/g, " ") // full-width space
    .trim();
}

/**
 * Returns true if rawText contains code as a standalone token.
 * e.g. matchCode("清/徐/宇/中", "中") === true
 *      matchCode("中心", "中") === false
 */
export function matchCode(rawText: string | number | boolean | null | undefined, code: string): boolean {
  if (!rawText || !code) return false;
  const normalized = normalize(String(rawText));
  const tokens = normalized.split(SEP).filter(Boolean);
  return tokens.some((t) => t === code);
}

/**
 * Extract the part of rawText that triggered the match (for display/debug).
 */
export function extractMatchContext(rawText: string | number | boolean | null | undefined, code: string): string {
  if (rawText === null || rawText === undefined || rawText === "") return "";
  const s = String(rawText);
  const normalized = normalize(s);
  const tokens = normalized.split(SEP).filter(Boolean);
  if (tokens.some((t) => t === code)) return normalized;
  return s;
}
