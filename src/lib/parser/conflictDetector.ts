import { ParsedEvent, ParseDiagnostics, ConflictInfo, Slot } from "../types";

type SlotKey = string; // `${date}|${slot}`

/**
 * Detect events that share the same date+slot.
 * Mutates event.notes to add CONFLICT warning.
 * Returns diagnostics.conflicts list.
 */
export function detectConflicts(events: ParsedEvent[]): ConflictInfo[] {
  const bySlot = new Map<SlotKey, ParsedEvent[]>();

  for (const event of events) {
    const key: SlotKey = `${event.date}|${event.slot}`;
    const group = bySlot.get(key) ?? [];
    group.push(event);
    bySlot.set(key, group);
  }

  const conflicts: ConflictInfo[] = [];

  for (const [key, group] of bySlot.entries()) {
    if (group.length <= 1) continue;

    const [date, slot] = key.split("|");
    const conflictMsg = `⚠️CONFLICT: ${group.length} events in same slot`;

    for (const event of group) {
      event.notes = event.notes
        ? `${event.notes}\n${conflictMsg}`
        : conflictMsg;
    }

    conflicts.push({
      date,
      slot: slot as Slot,
      events: group.map((e) => e.title),
    });
  }

  return conflicts;
}
