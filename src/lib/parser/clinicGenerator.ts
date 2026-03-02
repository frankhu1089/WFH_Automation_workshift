import dayjs from "dayjs";
import { ParsedEvent, ClinicRule, TimeTemplates } from "../types";
import { makeDedupeKey, generateId } from "./utils";
import { buildDateTime } from "./dateParser";

/**
 * Expand fixed clinic rules into individual events for every matching weekday in the month.
 */
export function generateClinicEvents(
  month: string, // YYYY-MM
  code: string,
  rules: ClinicRule[],
  timeTemplates: TimeTemplates
): ParsedEvent[] {
  const [year, mon] = month.split("-").map(Number);
  const tags = ["#wmfm-schedule", `#code-${code}`, `#${month}`];
  const events: ParsedEvent[] = [];

  const enabledRules = rules.filter((r) => r.enabled);
  if (!enabledRules.length) return [];

  // Iterate every day in the month
  const daysInMonth = dayjs(`${month}-01`).daysInMonth();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = dayjs(`${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    const isoWeekday = date.day() === 0 ? 7 : date.day(); // 1=Mon...7=Sun

    for (const rule of enabledRules) {
      if (isoWeekday !== rule.weekday) continue;

      const dateStr = date.format("YYYY-MM-DD");
      const slot = rule.slot === "morning" ? "morning" : "afternoon";
      const times = slot === "morning" ? timeTemplates.morning : timeTemplates.afternoon;
      const dedupeKey = makeDedupeKey(dateStr, "clinic", rule.title, code);

      events.push({
        id: generateId(),
        code,
        month,
        date: dateStr,
        slot: "clinic",
        title: rule.title,
        location: rule.location,
        start: buildDateTime(dateStr, times.start),
        end: buildDateTime(dateStr, times.end),
        timezone: "Asia/Taipei",
        tags,
        dedupeKey,
        taskLabel: rule.title,
        source: {
          fileName: "clinic-rules",
          sheetName: "config",
          cell: "N/A",
        },
        raw: `固定門診 weekday=${rule.weekday}`,
        notes: null,
      });
    }
  }

  return events;
}
