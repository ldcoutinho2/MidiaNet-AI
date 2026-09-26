import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AnalyticsEvent } from "@/lib/events";

export async function POST(request: Request) {
  const event = (await request.json()) as AnalyticsEvent;
  if (!event?.name || !event?.occurredAt) {
    return NextResponse.json({ ok: false, error: "Invalid event" }, { status: 400 });
  }

  const allowedNames = new Set([
    "page_view","signup_started","signup_completed","login",
    "instagram_connect_started","instagram_connected","analysis_started",
    "analysis_completed","strategy_created","checkout_started",
    "payment_approved","subscription_started","subscription_cancelled",
    "trial_started","diagnostic_started","diagnostic_completed","checkout_viewed","pix_created","trial_expired","upgrade_clicked",
  ]);
  if (!allowedNames.has(event.name)) {
    return NextResponse.json({ ok: false, error: "Invalid event name" }, { status: 400 });
  }

  const cookieStore = await cookies();
  let anonymousId = event.anonymousId || cookieStore.get("midianet_anonymous_id")?.value;
  if (!anonymousId) {
    anonymousId = randomUUID();
    cookieStore.set("midianet_anonymous_id", anonymousId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  const currentUser = await getCurrentUser();

  await db.event.create({
    data: {
      name: event.name,
      occurredAt: new Date(event.occurredAt),
      anonymousId,
      userId: event.userId || currentUser?.id || null,
      metadata: event.metadata || {},
    },
  });

  return NextResponse.json({ ok: true });
}
