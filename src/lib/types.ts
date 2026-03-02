export type Slot = "morning" | "afternoon" | "weekend" | "clinic";

export interface EventSource {
  fileName: string;
  sheetName: string;
  cell: string;
  parserVersion?: string;
}

export interface ParsedEvent {
  id: string;
  code: string;
  month: string; // YYYY-MM
  date: string; // YYYY-MM-DD
  slot: Slot;
  title: string;
  location: string | null;
  start: string; // ISO 8601 local e.g. 2026-03-16T08:00:00
  end: string;
  timezone: string;
  tags: string[];
  dedupeKey: string;
  taskLabel: string | null;
  source: EventSource;
  raw: string;
  notes: string | null;
}

export interface ParseDiagnostics {
  warnings: string[];
  errors: string[];
  conflicts: ConflictInfo[];
  blocksFound: {
    morning: boolean;
    afternoon: boolean;
    weekend: boolean;
  };
  eventCount: number;
}

export interface ConflictInfo {
  date: string;
  slot: Slot;
  events: string[]; // titles
}

export interface ClinicRule {
  weekday: number; // 1=Mon … 7=Sun
  slot: "morning" | "afternoon";
  title: string;
  location: string | null;
  enabled: boolean;
}

export interface TimeTemplates {
  morning: { start: string; end: string }; // HH:MM
  afternoon: { start: string; end: string };
  weekend: { start: string; end: string };
  clinic: { start: string; end: string };
}

export const DEFAULT_TIME_TEMPLATES: TimeTemplates = {
  morning: { start: "08:00", end: "12:00" },
  afternoon: { start: "13:30", end: "17:30" },
  weekend: { start: "08:00", end: "12:00" },
  clinic: { start: "08:00", end: "12:00" },
};

export const DEFAULT_CLINIC_RULES: ClinicRule[] = [
  {
    weekday: 1, // Monday
    slot: "morning",
    title: "家醫-固定門診",
    location: null,
    enabled: true,
  },
  {
    weekday: 3, // Wednesday
    slot: "morning",
    title: "家醫-固定門診",
    location: null,
    enabled: true,
  },
];

export interface ParseOptions {
  code: string;
  month?: string; // YYYY-MM, auto-detected from filename if not provided
  timeTemplates?: TimeTemplates;
  clinicRules?: ClinicRule[];
  parserVersion?: string;
}

export interface ParseFileInput {
  fileName: string;
  data: ArrayBuffer | Uint8Array;
}

export interface ParseResult {
  events: ParsedEvent[];
  diagnostics: ParseDiagnostics;
}
