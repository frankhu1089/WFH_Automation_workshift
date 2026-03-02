import { createEvents, EventAttributes } from "ics";
import { ParsedEvent } from "../types";

/**
 * Convert a local datetime string like "2026-03-16T08:00:00" into
 * the [year, month, day, hour, min] tuple that the `ics` library expects.
 */
function toDateArray(dt: string): [number, number, number, number, number] {
  const [datePart, timePart] = dt.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, min] = timePart.split(":").map(Number);
  return [year, month, day, hour, min];
}

/**
 * Build the description block for an ICS event.
 */
function buildDescription(event: ParsedEvent): string {
  const lines: string[] = [
    event.tags.join(" "),
    `dedupeKey: ${event.dedupeKey}`,
    `source: ${event.source.fileName}/${event.source.sheetName}!${event.source.cell}`,
    `raw: ${event.raw}`,
  ];
  if (event.notes) lines.push(event.notes);
  return lines.join("\n");
}

/**
 * Convert ParsedEvent[] to an ICS file string.
 */
export function generateICS(events: ParsedEvent[]): string {
  const icsEvents: EventAttributes[] = events.map((event) => ({
    uid: event.id,
    title: event.title,
    description: buildDescription(event),
    location: event.location ?? undefined,
    start: toDateArray(event.start),
    end: toDateArray(event.end),
    startInputType: "local",
    startOutputType: "local",
    endInputType: "local",
    endOutputType: "local",
  }));

  const { error, value } = createEvents(icsEvents);
  if (error || !value) {
    throw new Error(`ICS generation failed: ${error}`);
  }
  return value;
}

/**
 * Trigger browser download of an ICS file.
 */
export function downloadICS(icsString: string, filename: string): void {
  const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
