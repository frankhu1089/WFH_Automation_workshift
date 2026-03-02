"use client";

import { useState } from "react";
import type { ParsedEvent } from "@/lib/types";
import { generateICS, downloadICS } from "@/lib/ics/generator";

interface ExportButtonProps {
  events: ParsedEvent[];
  month: string;
}

export default function ExportButton({ events, month }: ExportButtonProps) {
  const [done, setDone] = useState(false);

  const handleExport = () => {
    if (!events.length) return;
    try {
      const ics = generateICS(events);
      downloadICS(ics, `wmfm-${month || "schedule"}.ics`);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      alert(`ICS 產生失敗：${e}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-0.5">
          <p className="text-sm text-ink-500">
            <span className="font-mono font-semibold text-ink-900 text-lg">
              {events.length}
            </span>{" "}
            個事件準備匯出
          </p>
          <p className="text-xs text-ink-300">
            包含輪班事件與固定門診（週一、週三）
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={!events.length}
          className={[
            "flex items-center gap-2.5 px-8 py-3 text-sm font-semibold tracking-wide",
            "transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
            done
              ? "bg-jade-600 text-white border border-jade-600"
              : "bg-jade-600 text-white border border-jade-600 hover:bg-jade-700 hover:border-jade-700 active:scale-95",
          ].join(" ")}
        >
          <span className="text-base">{done ? "✓" : "↓"}</span>
          {done ? "已下載！" : "下載 ICS 檔案"}
        </button>
      </div>

      <div className="pl-1 space-y-1.5 text-xs text-ink-500 border-l-2 border-parchment-300">
        <p>
          <span className="font-semibold text-ink-700">匯入方式：</span>
          Google Calendar → 其他行事曆 → 匯入
        </p>
        <p>
          建議建立「WMFM 班表」專屬行事曆，與個人行事曆分開管理。
        </p>
        <p>
          每個事件的 description 含有{" "}
          <code className="bg-parchment-100 px-1 font-mono">#wmfm-schedule</code>{" "}
          標籤，Stage 2 同步時只會操作這些事件。
        </p>
      </div>
    </div>
  );
}
