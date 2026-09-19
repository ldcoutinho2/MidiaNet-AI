import { NextResponse } from "next/server";
import type { AnalyticsEvent } from "@/lib/events";

export async function POST(request: Request) {
  const event = (await request.json()) as AnalyticsEvent;

  if (!event?.name || !event?.occurredAt) {
    return NextResponse.json({ ok: false, error: "Invalid event" }, { status: 400 });
  }

  // V1: keep the event contract stable. Persistence will be added with the database.
  console.info("[analytics]", JSON.stringify(event));

  return NextResponse.json({ ok: true });
}
