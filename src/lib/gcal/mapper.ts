import type { ParsedEvent } from "@/lib/types";

export interface GCalEventBody {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: string;
}

/**
 * Build the description string for a Google Calendar event.
 * Mirrors the ICS description format so dedupeKey is stable.
 */
function buildDescription(event: ParsedEvent): string {
  const lines: string[] = [
    event.tags.map((t) => `#${t}`).join(" "),
    `dedupeKey: ${event.dedupeKey}`,
    `source: ${event.source.fileName} / ${event.source.sheetName} / ${event.source.cell}`,
    `raw: ${event.raw}`,
  ];
  if (event.notes) lines.push(event.notes);
  return lines.join("\n");
}

export function toGCalEvent(event: ParsedEvent): GCalEventBody {
  const body: GCalEventBody = {
    summary: event.title,
    description: buildDescription(event),
    start: { dateTime: event.start, timeZone: event.timezone },
    end: { dateTime: event.end, timeZone: event.timezone },
  };
  if (event.location) body.location = event.location;
  return body;
}

/**
 * Extract dedupeKey from a Google Calendar event description.
 * Returns null if not found (not a wmfm event).
 */
export function extractDedupeKey(description: string | null | undefined): string | null {
  if (!description) return null;
  const m = description.match(/^dedupeKey:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}
