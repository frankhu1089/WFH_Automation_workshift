import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oAuth2 = new google.auth.OAuth2();
    oAuth2.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: "v3", auth: oAuth2 });

    const res = await calendar.calendarList.list({ minAccessRole: "writer" });
    const items = (res.data.items ?? []).map((c) => ({
      id: c.id,
      summary: c.summary,
      primary: c.primary ?? false,
    }));

    return NextResponse.json(items);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
