import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const FUNNEL = [
  "page_view",
  "signup_started",
  "signup_completed",
  "trial_started",
  "diagnostic_started",
  "diagnostic_completed",
  "checkout_viewed",
  "checkout_started",
  "pix_created",
  "payment_approved",
] as const;

function isAdmin(email: string | null | undefined) {
  if (!email) return false;
  const allowed = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const daysParam = Number(new URL(request.url).searchParams.get("days") || 30);
  const days = [7, 14, 30, 90].includes(daysParam) ? daysParam : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await db.event.groupBy({
    by: ["name"],
    where: { occurredAt: { gte: since }, name: { in: [...FUNNEL] } },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const name of FUNNEL) counts[name] = 0;
  for (const row of events) counts[row.name] = row._count._all;

  const uniqueUsers = await db.event.findMany({
    where: { occurredAt: { gte: since }, userId: { not: null }, name: { in: [...FUNNEL] } },
    select: { name: true, userId: true },
    distinct: ["name", "userId"],
  });

  const uniqueCounts: Record<string, number> = {};
  for (const name of FUNNEL) uniqueCounts[name] = 0;
  for (const row of uniqueUsers) uniqueCounts[row.name]++;

  return NextResponse.json({
    ok: true,
    days,
    since: since.toISOString(),
    funnel: FUNNEL.map((name) => ({
      name,
      count: counts[name],
      uniqueUsers: uniqueCounts[name],
    })),
  });
}
