"use client";

import { useState, useCallback, useMemo } from "react";
import { parseFiles } from "@/lib/parser/index";
import { applyResolutions } from "@/lib/parser/resolveConflicts";
import type { ParseResult, ParseFileInput } from "@/lib/types";
import { DEFAULT_CLINIC_RULES, DEFAULT_TIME_TEMPLATES } from "@/lib/types";
import FileUpload from "@/components/FileUpload";
import SettingsPanel from "@/components/SettingsPanel";
import ConflictResolver from "@/components/ConflictResolver";
import EventPreview from "@/components/EventPreview";
import ExportButton from "@/components/ExportButton";
import SyncPanel from "@/components/SyncPanel";
import GoogleAuthButton from "@/components/GoogleAuthButton";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function readFileAsBuffer(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(new Uint8Array(e.target!.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function detectMonth(files: File[]): string {
  for (const f of files) {
    const m = f.name.match(/(\d{4})(\d{2})/);
    if (m) return `${m[1]}-${m[2]}`;
  }
  return "";
}

// ── Step card wrapper ─────────────────────────────────────────────────────────

function StepCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-parchment-200 step-enter">
      <div className="flex items-baseline gap-3 px-6 py-4 border-b border-parchment-100">
        <span className="font-mono text-[11px] font-semibold bg-jade-50 text-jade-600 border border-jade-200 px-2 py-0.5 shrink-0">
          0{step}
        </span>
        <h2 className="font-semibold text-ink-900 text-[15px]">{title}</h2>
        <span className="text-[11px] text-ink-300 tracking-widest uppercase">
          {subtitle}
        </span>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [code, setCode] = useState("中");
  const [month, setMonth] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, string | null>>({});
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    setResolutions({});
    setParseError(null);
    const detected = detectMonth(newFiles);
    if (detected) setMonth(detected);
  }, []);

  const handleParse = async () => {
    if (!files.length) return;
    setParsing(true);
    setParseError(null);
    setResult(null);
    setResolutions({});

    try {
      const inputs: ParseFileInput[] = await Promise.all(
        files.map(async (f) => ({
          fileName: f.name,
          data: await readFileAsBuffer(f),
        }))
      );

      const r = parseFiles(inputs, {
        code: code.trim() || "中",
        month: month || undefined,
        clinicRules: DEFAULT_CLINIC_RULES,
        timeTemplates: DEFAULT_TIME_TEMPLATES,
      });

      setResult(r);
    } catch (err) {
      setParseError(String(err));
    } finally {
      setParsing(false);
    }
  };

  // Apply user's conflict resolutions to get the final event list
  const resolvedEvents = useMemo(() => {
    if (!result) return [];
    return applyResolutions(result.events, resolutions);
  }, [result, resolutions]);

  const hasConflicts = (result?.diagnostics.conflicts.length ?? 0) > 0;
  const canParse = files.length > 0 && !parsing;
  const canExport = resolvedEvents.length > 0;

  // Step indicators
  const steps = [
    { label: "上傳", active: true },
    { label: "設定", active: files.length > 0 },
    { label: "衝突", active: hasConflicts },
    { label: "預覽", active: !!result },
    { label: "匯出", active: canExport },
    { label: "同步", active: canExport },
  ];

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── Page header ── */}
        <header className="pb-5 border-b border-parchment-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="text-xl font-semibold text-ink-900 tracking-tight">
                  班表同步器
                </h1>
                <span className="font-mono text-xs text-ink-300">WMFM Schedule Sync</span>
              </div>
              <p className="mt-1.5 text-sm text-ink-500">
                上傳確認版班表 Excel → 解析排班 → 匯出 ICS 至 Google Calendar
              </p>
            </div>
            <div className="shrink-0 pt-0.5">
              <GoogleAuthButton />
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-1 mt-4 flex-wrap">
            {steps.map(({ label, active }, i) => (
              <div key={label} className="flex items-center gap-1">
                {i > 0 && (
                  <div className={`h-px w-5 ${active ? "bg-jade-600" : "bg-parchment-300"}`} />
                )}
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 border ${
                    active
                      ? "bg-jade-50 text-jade-600 border-jade-200"
                      : "text-ink-300 border-parchment-200"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")} {label}
                </span>
              </div>
            ))}
          </div>
        </header>

        {/* ── Step 1: Upload ── */}
        <StepCard step={1} title="上傳班表" subtitle="Upload">
          <FileUpload files={files} onFilesChange={handleFilesChange} />
        </StepCard>

        {/* ── Step 2: Configure + Parse ── */}
        {files.length > 0 && (
          <StepCard step={2} title="設定" subtitle="Configure">
            <SettingsPanel
              code={code}
              month={month}
              onCodeChange={setCode}
              onMonthChange={setMonth}
            />

            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={handleParse}
                disabled={!canParse}
                className={[
                  "flex items-center gap-2 px-6 py-2.5 text-sm font-semibold tracking-wide",
                  "transition-all duration-150 active:scale-95",
                  canParse
                    ? "bg-jade-600 text-white hover:bg-jade-700 cursor-pointer"
                    : "bg-jade-600/40 text-white cursor-not-allowed",
                ].join(" ")}
              >
                {parsing ? (
                  <>
                    <span className="animate-pulse-slow">◌</span>
                    解析中…
                  </>
                ) : (
                  <>
                    <span>⟳</span>
                    解析班表
                  </>
                )}
              </button>

              {result && (
                <span className="text-xs text-jade-600 font-mono">
                  ✓ 解析完成 · {result.events.length} 個事件
                  {hasConflicts && (
                    <span className="text-amber-warm ml-2">
                      · {result.diagnostics.conflicts.length} 項衝突
                    </span>
                  )}
                </span>
              )}
            </div>

            {parseError && (
              <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 text-xs font-mono text-red-700">
                ✕ {parseError}
              </div>
            )}
          </StepCard>
        )}

        {/* ── Step 3: Conflict Resolution (only if conflicts exist) ── */}
        {result && hasConflicts && (
          <StepCard step={3} title="衝突解決" subtitle="Resolve Conflicts">
            <ConflictResolver
              events={result.events}
              conflicts={result.diagnostics.conflicts}
              resolutions={resolutions}
              onChange={setResolutions}
            />
          </StepCard>
        )}

        {/* ── Step 4 (or 3 if no conflicts): Preview ── */}
        {result && (
          <StepCard
            step={hasConflicts ? 4 : 3}
            title="解析結果"
            subtitle="Preview"
          >
            <EventPreview
              events={resolvedEvents}
              diagnostics={result.diagnostics}
            />
          </StepCard>
        )}

        {/* ── Step 5 (or 4): Export ── */}
        {canExport && (
          <StepCard
            step={hasConflicts ? 5 : 4}
            title="匯出 ICS"
            subtitle="Export"
          >
            <ExportButton events={resolvedEvents} month={month} />
          </StepCard>
        )}

        {/* ── Step 6 (or 5): Google Calendar Sync ── */}
        {canExport && (
          <StepCard
            step={hasConflicts ? 6 : 5}
            title="同步至 Google Calendar"
            subtitle="Sync"
          >
            <SyncPanel
              events={resolvedEvents}
              month={month}
              code={code.trim() || "中"}
            />
          </StepCard>
        )}

        {/* ── Footer ── */}
        <footer className="text-center text-[11px] text-ink-300 py-4 border-t border-parchment-200">
          Stage 2 · 解析在瀏覽器端進行；同步時 access token 僅傳至本機 API route
        </footer>
      </div>
    </main>
  );
}
