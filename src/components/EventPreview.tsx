import type { ParsedEvent, ParseDiagnostics } from "@/lib/types";

interface SlotStyle {
  bg: string;
  text: string;
  border: string;
  label: string;
}

const SLOT_STYLES: Record<string, SlotStyle> = {
  morning: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    label: "上午",
  },
  afternoon: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    label: "下午",
  },
  weekend: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    label: "週末",
  },
  clinic: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "門診",
  },
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function weekdayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `（${WEEKDAYS[d.getDay()]}）`;
}

export default function EventPreview({
  events,
  diagnostics,
}: {
  events: ParsedEvent[];
  diagnostics: ParseDiagnostics;
}) {

  // Slot counts
  const slotCounts: Record<string, number> = {};
  for (const e of events) {
    slotCounts[e.slot] = (slotCounts[e.slot] ?? 0) + 1;
  }

  const conflictKeys = new Set(
    diagnostics.conflicts.map((c) => `${c.date}|${c.slot}`)
  );

  return (
    <div className="space-y-4">
      {/* ── Summary bar ── */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pb-4 border-b border-parchment-200">
        <div>
          <span className="font-mono text-2xl font-semibold text-ink-900">
            {events.length}
          </span>
          <span className="ml-1.5 text-sm text-ink-500">個事件</span>
        </div>

        {diagnostics.conflicts.length > 0 && (
          <div>
            <span className="font-mono text-2xl font-semibold text-amber-warm">
              {diagnostics.conflicts.length}
            </span>
            <span className="ml-1.5 text-sm text-amber-warm">項衝突</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {(["morning", "afternoon", "weekend", "clinic"] as const).map((s) => {
            const count = slotCounts[s];
            if (!count) return null;
            const st = SLOT_STYLES[s];
            return (
              <span
                key={s}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border ${st.bg} ${st.text} ${st.border}`}
              >
                {st.label}
                <span className="font-mono font-semibold">{count}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Warnings ── */}
      {diagnostics.warnings.length > 0 && (
        <div className="space-y-1">
          {diagnostics.warnings.slice(0, 5).map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-xs font-mono text-amber-700"
            >
              <span className="shrink-0">⚠</span>
              <span className="break-all">{w}</span>
            </div>
          ))}
          {diagnostics.warnings.length > 5 && (
            <p className="text-xs text-ink-300 pl-3">
              +{diagnostics.warnings.length - 5} more warnings
            </p>
          )}
        </div>
      )}

      {/* ── Errors ── */}
      {diagnostics.errors.map((e, i) => (
        <div
          key={i}
          className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 text-xs font-mono text-red-700"
        >
          <span className="shrink-0">✕</span>
          <span>{e}</span>
        </div>
      ))}

      {/* ── Conflict detail ── */}
      {diagnostics.conflicts.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 text-xs space-y-1.5">
          <p className="font-semibold text-amber-700 mb-2">衝突詳情（同日同時段多個事件）：</p>
          {diagnostics.conflicts.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-amber-700">
              <span className="font-mono shrink-0">{c.date}</span>
              <span className="text-amber-500">{SLOT_STYLES[c.slot]?.label ?? c.slot}</span>
              <span>{c.events.join(" · ")}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Event table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-parchment-300">
              <th className="text-left text-[10px] font-semibold tracking-widest text-ink-500 uppercase pb-2 pr-6 whitespace-nowrap">
                日期
              </th>
              <th className="text-left text-[10px] font-semibold tracking-widest text-ink-500 uppercase pb-2 pr-4">
                時段
              </th>
              <th className="text-left text-[10px] font-semibold tracking-widest text-ink-500 uppercase pb-2 pr-4">
                事件標題
              </th>
              <th className="text-left text-[10px] font-semibold tracking-widest text-ink-500 uppercase pb-2">
                來源
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const style = SLOT_STYLES[event.slot] ?? SLOT_STYLES.morning;
              const hasConflict =
                conflictKeys.has(`${event.date}|${event.slot}`) ||
                !!event.notes?.includes("CONFLICT");

              return (
                <tr
                  key={event.id}
                  className={[
                    "border-b border-parchment-100 transition-colors",
                    hasConflict
                      ? "bg-amber-50"
                      : "hover:bg-parchment-50",
                  ].join(" ")}
                >
                  {/* Date */}
                  <td className="py-2.5 pr-6 font-mono text-[13px] text-ink-900 whitespace-nowrap">
                    {event.date.slice(5)}
                    <span className="text-ink-300">{weekdayOf(event.date)}</span>
                  </td>

                  {/* Slot badge */}
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border
                        ${style.bg} ${style.text} ${style.border}`}
                    >
                      {style.label}
                      {hasConflict && (
                        <span className="text-amber-500" title={event.notes ?? ""}>
                          ⚠
                        </span>
                      )}
                    </span>
                  </td>

                  {/* Title */}
                  <td className="py-2.5 pr-4 text-ink-900 text-[13px]">
                    {event.title}
                  </td>

                  {/* Source cell */}
                  <td className="py-2.5 font-mono text-xs text-ink-300 whitespace-nowrap">
                    {event.source.cell !== "N/A"
                      ? `${event.source.sheetName}!${event.source.cell}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
