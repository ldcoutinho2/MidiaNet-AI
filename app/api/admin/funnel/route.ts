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
    .split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

function metadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>)[key];
  return value == null ? "" : String(value).trim();
}

function attributionKey(metadata: unknown) {
  const campaign = metadataValue(metadata, "utm_campaign");
  const source = metadataValue(metadata, "utm_source");
  if (campaign) return campaign;
  if (source) return source;
  return "sem_utm";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const daysParam = Number(new URL(request.url).searchParams.get("days") || 30);
  const days = [7, 14, 30, 90].includes(daysParam) ? daysParam : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await db.event.findMany({
    where: { occurredAt: { gte: since }, name: { in: [...FUNNEL] } },
    select: { name: true, userId: true, metadata: true, occurredAt: true },
    orderBy: { occurredAt: "asc" },
  });

  const counts: Record<string, number> = {};
  for (const name of FUNNEL) counts[name] = 0;
  for (const row of events) counts[row.name]++;

  const uniqueUsers = await db.event.findMany({
    where: { occurredAt: { gte: since }, userId: { not: null }, name: { in: [...FUNNEL] } },
    select: { name: true, userId: true },
    distinct: ["name", "userId"],
  });

  const uniqueCounts: Record<string, number> = {};
  for (const name of FUNNEL) uniqueCounts[name] = 0;
  for (const row of uniqueUsers) uniqueCounts[row.name]++;

  const attributionByUser = new Map<string, string>();
  for (const row of events) {
    if (!row.userId || attributionByUser.has(row.userId)) continue;
    const campaign = metadataValue(row.metadata, "utm_campaign");
    const source = metadataValue(row.metadata, "utm_source");
    if (campaign || source) attributionByUser.set(row.userId, attributionKey(row.metadata));
  }

  type CampaignRow = {
    campaign: string;
    visits: number;
    signups: number;
    diagnostics: number;
    pix: number;
    payments: number;
    revenueCents: number;
  };

  const campaignMap = new Map<string, CampaignRow>();
  const getCampaign = (key: string) => {
    if (!campaignMap.has(key)) {
      campaignMap.set(key, { campaign: key, visits: 0, signups: 0, diagnostics: 0, pix: 0, payments: 0, revenueCents: 0 });
    }
    return campaignMap.get(key)!;
  };

  for (const row of events) {
    const campaign = attributionKey(row.metadata);
    if (row.name === "page_view") getCampaign(campaign).visits++;
    if (row.name === "signup_completed") getCampaign(campaign).signups++;
    if (row.name === "diagnostic_completed") getCampaign(campaign).diagnostics++;
    if (row.name === "pix_created") getCampaign(campaign).pix++;
  }

  const paidPayments = await db.payment.findMany({
    where: { createdAt: { gte: since }, status: "PAID" },
    select: { userId: true, amountCents: true },
  });

  for (const payment of paidPayments) {
    const campaign = attributionByUser.get(payment.userId) || "sem_utm";
    const row = getCampaign(campaign);
    row.payments++;
    row.revenueCents += payment.amountCents || 0;
  }

  const campaigns = Array.from(campaignMap.values())
    .sort((a, b) => b.revenueCents - a.revenueCents || b.signups - a.signups)
    .map((row) => ({ ...row, revenue: row.revenueCents / 100 }));

  return NextResponse.json({
    ok: true,
    days,
    since: since.toISOString(),
    funnel: FUNNEL.map((name) => ({ name, count: counts[name], uniqueUsers: uniqueCounts[name] })),
    campaigns,
  });
}
