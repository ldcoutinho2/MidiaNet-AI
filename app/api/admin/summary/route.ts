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

  const [users, trialing, active, connected, drafts, payments, paidRevenue, events, recentUsers, recentPayments] =
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
    ]);

  return NextResponse.json({
    stats: {
      users,
      trialing,
      active,
      connected,
      drafts,
      payments,
      revenue: (paidRevenue._sum.amountCents || 0) / 100,
      events,
    },
    recentUsers,
    recentPayments,
  });
}
