"use client";

interface SettingsPanelProps {
  code: string;
  month: string;
  onCodeChange: (v: string) => void;
  onMonthChange: (v: string) => void;
}

const TIME_SLOTS = [
  { key: "morning", label: "上午", time: "08:00–12:00", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  { key: "afternoon", label: "下午", time: "13:30–17:30", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "weekend", label: "週末", time: "08:00–12:00", cls: "bg-violet-50 text-violet-700 border-violet-200" },
];

export default function SettingsPanel({
  code,
  month,
  onCodeChange,
  onMonthChange,
}: SettingsPanelProps) {
  return (
    <div className="space-y-5">
      {/* Code + Month row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-semibold tracking-widest text-ink-500 uppercase mb-1.5">
            代號 · Roster Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            className="w-full px-3 py-2 border border-parchment-300 bg-white text-sm font-mono
                       text-ink-900 focus:outline-none focus:border-jade-600 transition-colors"
            placeholder="中"
            maxLength={6}
          />
          <p className="mt-1 text-[11px] text-ink-300">你在班表中的識別代號</p>
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-widest text-ink-500 uppercase mb-1.5">
            月份 · Month
          </label>
          <input
            type="text"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="w-full px-3 py-2 border border-parchment-300 bg-white text-sm font-mono
                       text-ink-900 focus:outline-none focus:border-jade-600 transition-colors"
            placeholder="2026-03"
            pattern="\d{4}-\d{2}"
          />
          <p className="mt-1 text-[11px] text-ink-300">自動從檔名偵測，可手動修改</p>
        </div>
      </div>

      {/* Time templates */}
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-ink-500 uppercase mb-2">
          時間模板 · Time Templates
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map((t) => (
            <div
              key={t.key}
              className={`px-3 py-2.5 border text-xs ${t.cls}`}
            >
              <div className="font-semibold mb-0.5">{t.label}</div>
              <div className="font-mono text-[11px]">{t.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed clinics */}
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-ink-500 uppercase mb-2">
          固定門診 · Fixed Clinics
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { day: "週一（Mon）", rule: "上午 08:00–12:00" },
            { day: "週三（Wed）", rule: "上午 08:00–12:00" },
          ].map(({ day, rule }) => (
            <div
              key={day}
              className="flex items-start gap-2 px-3 py-2.5 border border-jade-200 bg-jade-50"
            >
              <span className="text-jade-600 mt-0.5">✦</span>
              <div>
                <div className="text-xs font-semibold text-jade-700">{day}</div>
                <div className="text-[11px] text-jade-600 font-mono">{rule}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
