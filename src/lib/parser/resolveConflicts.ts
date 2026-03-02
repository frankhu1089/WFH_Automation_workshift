import { ParsedEvent } from "../types";

/**
 * Apply user resolutions to a list of events.
 *
 * resolutions: Record<"date|slot", event.id | null>
 *   - event.id  → keep only that event for this date+slot
 *   - null      → keep all (no change)
 *   - absent    → keep all (no change)
 */
export function applyResolutions(
  events: ParsedEvent[],
  resolutions: Record<string, string | null>
): ParsedEvent[] {
  return events
    .filter((event) => {
      const key = `${event.date}|${event.slot}`;
      const resolution = resolutions[key];
      if (!resolution) return true; // null or absent → keep all
      return event.id === resolution; // keep only the chosen one
    })
    .map((event) => {
      // Clean up CONFLICT note from the kept event
      const key = `${event.date}|${event.slot}`;
      const resolution = resolutions[key];
      if (resolution && event.id === resolution && event.notes?.includes("CONFLICT")) {
        return {
          ...event,
          notes: event.notes.replace(/\n?⚠️CONFLICT:[^\n]*/g, "").trim() || null,
        };
      }
      return event;
    });
}
