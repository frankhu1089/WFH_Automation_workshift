"use client";

import type { ParsedEvent, ConflictInfo, Slot } from "@/lib/types";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const SLOT_LABELS: Record<Slot, string> = {
  morning: "上午",
  afternoon: "下午",
  weekend: "週末",
  clinic: "門診",
};
const SLOT_COLORS: Record<Slot, string> = {
  morning: "bg-sky-50 text-sky-700 border-sky-200",
  afternoon: "bg-orange-50 text-orange-700 border-orange-200",
  weekend: "bg-violet-50 text-violet-700 border-violet-200",
  clinic: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface ConflictGroup {
  key: string; // "date|slot"
  date: string;
  slot: Slot;
  events: ParsedEvent[];
}

/** Build conflict groups from the full events array. */
function buildConflictGroups(
  events: ParsedEvent[],
  conflictInfos: ConflictInfo[]
): ConflictGroup[] {
  const conflictKeys = new Set(
    conflictInfos.map((c) => `${c.date}|${c.slot}`)
  );

  const groups = new Map<string, ParsedEvent[]>();
  for (const event of events) {
    const key = `${event.date}|${event.slot}`;
    if (!conflictKeys.has(key)) continue;
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .map(([key, evs]) => {
      const [date, slot] = key.split("|") as [string, Slot];
      return { key, date, slot, events: evs };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function weekdayOf(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return `（${WEEKDAYS[d.getDay()]}）`;
}

interface ConflictResolverProps {
  events: ParsedEvent[];
  conflicts: ConflictInfo[];
  resolutions: Record<string, string | null>;
  onChange: (resolutions: Record<string, string | null>) => void;
}

export default function ConflictResolver({
  events,
  conflicts,
  resolutions,
  onChange,
}: ConflictResolverProps) {
  const groups = buildConflictGroups(events, conflicts);

  const setResolution = (key: string, eventId: string | null) => {
    onChange({ ...resolutions, [key]: eventId });
  };

  const unresolvedCount = groups.filter((g) => !resolutions[g.key]).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-amber-warm font-semibold text-lg">
          {groups.length}
        </span>
        <span className="text-sm text-ink-500">
          項衝突需確認（同日同時段多個事件）
        </span>
        {unresolvedCount > 0 && (
          <span className="ml-auto text-[11px] text-amber-warm font-mono">
            {unresolvedCount} 項尚未選擇
          </span>
        )}
      </div>

      {/* Conflict groups */}
      <div className="space-y-3">
        {groups.map((group) => {
          const currentResolution = resolutions[group.key] ?? null;
          const slotColor = SLOT_COLORS[group.slot];

          return (
            <div
              key={group.key}
              className={[
                "border p-4 space-y-3 transition-colors",
                currentResolution === null
                  ? "border-amber-300 bg-amber-50"
                  : "border-parchment-200 bg-white",
              ].join(" ")}
            >
              {/* Group header */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-ink-900">
                  {group.date.slice(5)}
                  <span className="text-ink-300">{weekdayOf(group.date)}</span>
                </span>
                <span
                  className={`inline-block px-2 py-0.5 text-xs font-medium border ${slotColor}`}
                >
                  {SLOT_LABELS[group.slot]}
                </span>
                {currentResolution !== null && (
                  <span className="ml-auto text-[11px] text-jade-600 font-mono">
                    ✓ 已選擇
                  </span>
                )}
              </div>

              {/* Event options */}
              <div className="space-y-2">
                {group.events.map((event) => {
                  const isSelected = currentResolution === event.id;
                  return (
                    <label
                      key={event.id}
                      className={[
                        "flex items-start gap-3 p-3 border cursor-pointer transition-colors",
                        isSelected
                          ? "border-jade-600 bg-jade-50"
                          : "border-parchment-200 bg-white hover:border-jade-200 hover:bg-jade-50/50",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name={group.key}
                        value={event.id}
                        checked={isSelected}
                        onChange={() => setResolution(group.key, event.id)}
                        className="mt-0.5 accent-jade-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="text-sm font-medium text-ink-900">
                          {event.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-ink-500">
                          {/* Raw cell content — most useful context */}
                          <span>
                            <span className="text-ink-300">raw: </span>
                            <span className="font-mono text-ink-700 bg-parchment-100 px-1">
                              {event.raw}
                            </span>
                          </span>
                          {/* Source cell */}
                          <span className="font-mono text-ink-300">
                            {event.source.cell !== "N/A"
                              ? `${event.source.sheetName}!${event.source.cell}`
                              : event.source.fileName}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}

                {/* Keep all option */}
                <label
                  className={[
                    "flex items-center gap-3 p-3 border cursor-pointer transition-colors",
                    currentResolution === null
                      ? "border-amber-400 bg-amber-50"
                      : "border-parchment-200 bg-white hover:border-amber-200 hover:bg-amber-50/30",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name={group.key}
                    value="__keep_all__"
                    checked={currentResolution === null}
                    onChange={() => setResolution(group.key, null)}
                    className="accent-amber-500 shrink-0"
                  />
                  <div>
                    <div className="text-sm text-ink-500">
                      全部保留{" "}
                      <span className="text-ink-300 text-xs">(Keep all — export both)</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-ink-500 pt-1 border-t border-parchment-200">
        <span>
          解決後將匯出：{" "}
          <span className="font-mono font-semibold text-ink-900">
            {groups.reduce((acc, g) => {
              return acc + (resolutions[g.key] ? 1 : g.events.length);
            }, 0)}
          </span>{" "}
          個衝突事件（原本 {groups.reduce((a, g) => a + g.events.length, 0)} 個）
        </span>
        <button
          onClick={() => {
            const all: Record<string, null> = {};
            groups.forEach((g) => (all[g.key] = null));
            onChange({ ...resolutions, ...all });
          }}
          className="text-ink-300 hover:text-ink-500 transition-colors"
        >
          全部重置
        </button>
      </div>
    </div>
  );
}
