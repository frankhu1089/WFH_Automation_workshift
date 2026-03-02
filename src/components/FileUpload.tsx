"use client";

import { useCallback, useState } from "react";

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

const HALF_LABELS: Record<number, string> = { 0: "上半月", 1: "下半月" };

export default function FileUpload({ files, onFilesChange }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const xlsx = Array.from(newFiles).filter((f) =>
        f.name.toLowerCase().endsWith(".xlsx")
      );
      const merged = [...files, ...xlsx].slice(0, 2);
      // Deduplicate by name
      const unique = merged.filter(
        (f, i, arr) => arr.findIndex((x) => x.name === f.name) === i
      );
      onFilesChange(unique);
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles]
  );

  const removeFile = (i: number) =>
    onFilesChange(files.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <label
        htmlFor="xlsx-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={[
          "flex flex-col items-center justify-center gap-2 p-10 border-2 border-dashed",
          "cursor-pointer transition-all duration-150 select-none",
          dragging
            ? "border-jade-600 bg-jade-50"
            : "border-parchment-300 hover:border-jade-600 hover:bg-jade-50",
        ].join(" ")}
      >
        <span className="text-2xl" aria-hidden>
          📋
        </span>
        <div className="text-center">
          <p className="text-sm font-medium text-ink-900">
            拖曳或點選上傳 xlsx 班表
          </p>
          <p className="text-xs text-ink-500 mt-1">
            上半月 ＋ 下半月，各一份（最多 2 個 .xlsx 檔案）
          </p>
        </div>
        <input
          id="xlsx-input"
          type="file"
          accept=".xlsx"
          multiple
          className="sr-only"
          onChange={handleInput}
        />
      </label>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, i) => (
            <li
              key={file.name}
              className="flex items-center justify-between px-4 py-2.5 bg-jade-50 border border-jade-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Half-month badge */}
                <span className="text-[10px] font-medium tracking-wide bg-jade-600 text-white px-1.5 py-0.5 shrink-0">
                  {HALF_LABELS[i]}
                </span>
                <span className="text-sm font-mono text-ink-900 truncate">
                  {file.name}
                </span>
                <span className="text-xs text-ink-300 shrink-0">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="ml-4 text-ink-300 hover:text-amber-warm text-lg leading-none shrink-0 transition-colors"
                aria-label={`移除 ${file.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
