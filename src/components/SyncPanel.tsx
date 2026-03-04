"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import type { ParsedEvent } from "@/lib/types";
import type { SyncReport } from "@/lib/gcal/sync";

interface Calendar {
  id: string;
  summary: string;
  primary: boolean;
}

interface SyncPanelProps {
  events: ParsedEvent[];
  month: string;
  code: string;
}

export default function SyncPanel({ events, month, code }: SyncPanelProps) {
  const { data: session } = useSession();
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [grantedScopes, setGrantedScopes] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<SyncReport | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Fetch calendars when signed in
  useEffect(() => {
    if (!session?.accessToken) return;
    setCalendarLoading(true);
    setCalendarError(null);
    fetch("/api/calendars")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          if (data.grantedScopes) setGrantedScopes(data.grantedScopes);
          throw new Error(data.error ?? `HTTP ${r.status}`);
        }
        return data as Calendar[];
      })
      .then((data) => {
        setCalendars(data);
        const primary = data.find((c) => c.primary);
        if (primary) setCalendarId(primary.id);
        else if (data[0]) setCalendarId(data[0].id);
      })
      .catch((e: unknown) => {
        setCalendarError(String(e));
      })
      .finally(() => setCalendarLoading(false));
  }, [session?.accessToken]);

  const handleSync = async () => {
    if (!calendarId || !events.length) return;
    setSyncing(true);
    setReport(null);
    setSyncError(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events, calendarId, month, code, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncError(data.error ?? "同步失敗");
      } else {
        setReport(data as SyncReport);
      }
    } catch (e) {
      setSyncError(String(e));
    } finally {
      setSyncing(false);
    }
  };

  if (!session) {
    return (
      <p className="text-sm text-ink-400 font-mono">
        ← 請先於頁面頂部登入 Google
      </p>
    );
  }

  if (session.error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 font-mono">Token 已過期，請重新登入</p>
        <button
          onClick={() => signIn("google")}
          className="px-4 py-2 bg-jade-600 text-white text-sm font-semibold hover:bg-jade-700 cursor-pointer"
        >
          重新登入 Google
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Calendar picker */}
          <div>
            <label className="block text-xs text-ink-400 mb-1.5 uppercase tracking-widest font-mono">
              目標 Calendar
            </label>
            {calendarLoading && (
              <p className="text-xs text-ink-300 font-mono animate-pulse">載入日曆清單…</p>
            )}
            {calendarError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 text-xs font-mono text-red-700 space-y-2">
                <p>✕ {calendarError}</p>
                {grantedScopes && (
                  <p className="text-red-400 break-all">Token scopes: {grantedScopes}</p>
                )}
                <button
                  onClick={() => signIn("google")}
                  className="mt-1 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer"
                >
                  重新授權 Google Calendar →
                </button>
              </div>
            )}
            {!calendarLoading && !calendarError && calendars.length > 0 && (
              <select
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                className="w-full text-sm bg-white border border-parchment-300 px-3 py-2 text-ink-900 focus:border-jade-500 outline-none"
              >
                {calendars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.summary}{c.primary ? " （主日曆）" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Dry-run toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={[
                "w-10 h-5 rounded-full relative transition-colors",
                dryRun ? "bg-amber-400" : "bg-jade-600",
              ].join(" ")}
              onClick={() => setDryRun((v) => !v)}
            >
              <div
                className={[
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                  dryRun ? "left-0.5" : "left-5",
                ].join(" ")}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-ink-900">
                {dryRun ? "預演模式（Dry Run）" : "實際寫入模式"}
              </span>
              <p className="text-xs text-ink-400">
                {dryRun
                  ? "僅顯示會執行的操作，不實際寫入 Google Calendar"
                  : "將直接在 Google Calendar 建立/更新/刪除事件"}
              </p>
            </div>
          </label>

          {/* Sync button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSync}
              disabled={syncing || !calendarId || events.length === 0}
              className={[
                "flex items-center gap-2 px-6 py-2.5 text-sm font-semibold tracking-wide transition-all duration-150 active:scale-95",
                syncing || !calendarId || events.length === 0
                  ? "bg-jade-600/40 text-white cursor-not-allowed"
                  : dryRun
                  ? "bg-amber-500 text-white hover:bg-amber-600 cursor-pointer"
                  : "bg-jade-600 text-white hover:bg-jade-700 cursor-pointer",
              ].join(" ")}
            >
              {syncing ? (
                <>
                  <span className="animate-pulse-slow">◌</span>
                  {dryRun ? "分析中…" : "同步中…"}
                </>
              ) : (
                <>
                  <span>{dryRun ? "⟳" : "↑"}</span>
                  {dryRun ? "預演同步" : "立即同步"}
                </>
              )}
            </button>

            {report && (
              <span className="text-xs font-mono text-jade-600">
                ✓ {dryRun ? "預演完成" : "同步完成"}
              </span>
            )}
          </div>

          {/* Error */}
          {syncError && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-xs font-mono text-red-700">
              ✕ {syncError}
            </div>
          )}

      {/* Report */}
      {report && <SyncReportView report={report} dryRun={dryRun} />}
    </div>
  );
}

function SyncReportView({ report, dryRun }: { report: SyncReport; dryRun: boolean }) {
  return (
    <div className="space-y-3">
      {/* Summary counts */}
      <div className="flex flex-wrap gap-4 px-4 py-3 bg-parchment-50 border border-parchment-200">
        <Stat label={dryRun ? "將建立" : "已建立"} value={report.created} color="text-jade-600" />
        <Stat label={dryRun ? "將更新" : "已更新"} value={report.updated} color="text-sky-600" />
        <Stat label={dryRun ? "將刪除" : "已刪除"} value={report.deleted} color="text-amber-warm" />
      </div>

      {/* Dry run plan details */}
      {dryRun && report.plan && (
        <div className="space-y-2 text-xs font-mono">
          {report.plan.toCreate.length > 0 && (
            <PlanGroup label="建立" items={report.plan.toCreate} color="text-jade-600" />
          )}
          {report.plan.toUpdate.length > 0 && (
            <PlanGroup label="更新" items={report.plan.toUpdate} color="text-sky-600" />
          )}
          {report.plan.toDelete.length > 0 && (
            <PlanGroup label="刪除" items={report.plan.toDelete} color="text-amber-warm" />
          )}
          {report.created === 0 && report.updated === 0 && report.deleted === 0 && (
            <p className="text-ink-400 px-2">無需變更（已是最新）</p>
          )}
        </div>
      )}

      {/* Errors */}
      {report.errors.length > 0 && (
        <div className="space-y-1">
          {report.errors.map((e, i) => (
            <div key={i} className="px-3 py-2 bg-red-50 border border-red-200 text-xs font-mono text-red-700">
              ✕ {e}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`font-mono text-2xl font-semibold ${color}`}>{value}</span>
      <span className="text-xs text-ink-500">{label}</span>
    </div>
  );
}

function PlanGroup({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div className="px-3 py-2 border border-parchment-200 bg-white space-y-0.5">
      <p className={`${color} font-semibold mb-1`}>{label} ({items.length})</p>
      {items.slice(0, 10).map((item, i) => (
        <p key={i} className="text-ink-500 pl-2">{item}</p>
      ))}
      {items.length > 10 && (
        <p className="text-ink-300 pl-2">+{items.length - 10} more…</p>
      )}
    </div>
  );
}
