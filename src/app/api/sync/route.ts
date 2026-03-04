import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncToGoogleCalendar } from "@/lib/gcal/sync";
import { z } from "zod";
import type { ParsedEvent } from "@/lib/types";

const BodySchema = z.object({
  events: z.array(z.unknown()),
  calendarId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  code: z.string().min(1),
  dryRun: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { events, calendarId, month, code, dryRun } = parsed.data;

  try {
    const report = await syncToGoogleCalendar({
      accessToken: session.accessToken,
      calendarId,
      events: events as ParsedEvent[],
      month,
      code,
      dryRun,
    });
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
