import { google } from "googleapis";
import type { ParsedEvent } from "@/lib/types";
import { toGCalEvent, extractDedupeKey } from "./mapper";

export interface SyncReport {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
  plan?: {
    toCreate: string[];
    toUpdate: string[];
    toDelete: string[];
  };
}

interface SyncOptions {
  accessToken: string;
  calendarId: string;
  events: ParsedEvent[];
  month: string; // "YYYY-MM"
  code: string;
  dryRun: boolean;
}

export async function syncToGoogleCalendar(opts: SyncOptions): Promise<SyncReport> {
  const { accessToken, calendarId, events, month, code, dryRun } = opts;

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  // ── 1. Time range for the month ──────────────────────────────────────────
  const [year, mon] = month.split("-").map(Number);
  const timeMin = new Date(year, mon - 1, 1).toISOString();
  const timeMax = new Date(year, mon, 1).toISOString(); // first of next month

  // ── 2. Fetch existing wmfm events ─────────────────────────────────────────
  const existingByKey = new Map<string, string>(); // dedupeKey → googleEventId
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      q: "#wmfm-schedule",
      singleEvents: true,
      maxResults: 250,
      pageToken,
    });

    for (const ev of res.data.items ?? []) {
      const desc = ev.description ?? "";
      // Safety: only touch events with all three tags
      if (
        !desc.includes("#wmfm-schedule") ||
        !desc.includes(`#code-${code}`) ||
        !desc.includes(`#${month}`)
      ) {
        continue;
      }
      const key = extractDedupeKey(desc);
      if (key && ev.id) existingByKey.set(key, ev.id);
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  // ── 3. Build new event map ────────────────────────────────────────────────
  const newByKey = new Map<string, ParsedEvent>();
  for (const ev of events) {
    newByKey.set(ev.dedupeKey, ev);
  }

  // ── 4. Diff ───────────────────────────────────────────────────────────────
  const toCreate: ParsedEvent[] = [];
  const toUpdate: { id: string; event: ParsedEvent }[] = [];
  const toDelete: string[] = [];

  for (const [key, ev] of newByKey) {
    if (existingByKey.has(key)) {
      toUpdate.push({ id: existingByKey.get(key)!, event: ev });
    } else {
      toCreate.push(ev);
    }
  }

  for (const [key, id] of existingByKey) {
    if (!newByKey.has(key)) {
      toDelete.push(id);
    }
  }

  // ── 5. Dry run ────────────────────────────────────────────────────────────
  if (dryRun) {
    return {
      created: toCreate.length,
      updated: toUpdate.length,
      deleted: toDelete.length,
      errors: [],
      plan: {
        toCreate: toCreate.map((e) => e.title),
        toUpdate: toUpdate.map(({ event }) => event.title),
        toDelete: toDelete,
      },
    };
  }

  // ── 6. Apply changes ──────────────────────────────────────────────────────
  const errors: string[] = [];
  let created = 0, updated = 0, deleted = 0;

  for (const ev of toCreate) {
    try {
      await calendar.events.insert({
        calendarId,
        requestBody: toGCalEvent(ev),
      });
      created++;
    } catch (e) {
      errors.push(`CREATE ${ev.title}: ${String(e)}`);
    }
  }

  for (const { id, event } of toUpdate) {
    try {
      await calendar.events.update({
        calendarId,
        eventId: id,
        requestBody: toGCalEvent(event),
      });
      updated++;
    } catch (e) {
      errors.push(`UPDATE ${event.title}: ${String(e)}`);
    }
  }

  for (const id of toDelete) {
    try {
      await calendar.events.delete({ calendarId, eventId: id });
      deleted++;
    } catch (e) {
      errors.push(`DELETE ${id}: ${String(e)}`);
    }
  }

  return { created, updated, deleted, errors };
}
