import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function isAdmin(email?: string | null) {
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allowed.includes(email.toLowerCase());
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const [users, trialing, active, connected, drafts, payments, paidRevenue, events, recentUsers, recentPayments, recentMarketingEvents] =
    await Promise.all([
      db.user.count(),
      db.subscription.count({ where: { status: "TRIALING" } }),
      db.subscription.count({ where: { status: "ACTIVE" } }),
      db.socialAccount.count({ where: { platform: "INSTAGRAM" } }),
      db.contentDraft.count(),
      db.payment.count(),
      db.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
      db.event.count(),
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, name: true, email: true, phone: true, createdAt: true,
          subscription: { select: { status: true, plan: true, trialEndsAt: true } },
          socialAccounts: { select: { username: true, platform: true, connectedAt: true } },
        },
      }),
      db.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, amountCents: true, currency: true, status: true, createdAt: true, paidAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      db.event.findMany({
        where: {
          occurredAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          name: { in: ["page_view","signup_started","signup_completed","instagram_connect_started","instagram_connected","analysis_started","analysis_completed","strategy_created","checkout_started","payment_approved","subscription_started"] },
        },
        orderBy: { occurredAt: "desc" },
        take: 5000,
        select: { name: true, occurredAt: true, metadata: true },
      }),
    ]);

  const marketing = {
    periodDays: 30,
    pageViews: recentMarketingEvents.filter(e => e.name === "page_view").length,
    signupStarted: recentMarketingEvents.filter(e => e.name === "signup_started").length,
    leads: recentMarketingEvents.filter(e => e.name === "signup_completed").length,
    instagramConnectStarted: recentMarketingEvents.filter(e => e.name === "instagram_connect_started").length,
    instagramConnected: recentMarketingEvents.filter(e => e.name === "instagram_connected").length,
    analysisStarted: recentMarketingEvents.filter(e => e.name === "analysis_started").length,
    analysisCompleted: recentMarketingEvents.filter(e => e.name === "analysis_completed").length,
    strategiesCreated: recentMarketingEvents.filter(e => e.name === "strategy_created").length,
    checkoutStarted: recentMarketingEvents.filter(e => e.name === "checkout_started").length,
    paymentsApproved: recentMarketingEvents.filter(e => e.name === "payment_approved").length,
    subscriptionsStarted: recentMarketingEvents.filter(e => e.name === "subscription_started").length,
    sources: Object.entries(
      recentMarketingEvents.reduce((acc: Record<string, number>, e) => {
        const m = (e.metadata && typeof e.metadata === "object") ? e.metadata as Record<string, unknown> : {};
        const source = String(m.utm_source || m.source || "direto");
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {})
    ).sort((a,b) => b[1] - a[1]).slice(0, 10),
  };

  return NextResponse.json({
    stats: {
      users, trialing, active, connected, drafts, payments,
      revenue: (paidRevenue._sum.amountCents || 0) / 100,
      events,
    },
    marketing,
    recentUsers,
    recentPayments,
  });
}
