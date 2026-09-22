import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const PLANS = {
  weekly: { days: 7, amountCents: 1499 },
  monthly: { days: 30, amountCents: 2999 },
} as const;

function isAdmin(email?: string | null) {
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return !!email && allowed.includes(email.toLowerCase());
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || !isAdmin(admin.email)) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const key = String(body.plan || "").toLowerCase() as keyof typeof PLANS;
  const plan = PLANS[key];
  if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });

  const user = await db.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const now = new Date();
  const subscription = await db.subscription.findUnique({ where: { userId: id } });
  const currentEnd = subscription?.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now.getTime()
    ? subscription.currentPeriodEnd
    : now;
  const periodEnd = new Date(currentEnd.getTime() + plan.days * 86400000);

  await db.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        userId: id,
        provider: `manual_whatsapp:${key}`,
        providerPaymentId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        amountCents: plan.amountCents,
        currency: "BRL",
        status: "PAID",
        paidAt: now,
      },
    });
    await tx.subscription.upsert({
      where: { userId: id },
      update: { status: "ACTIVE", plan: key.toUpperCase(), currentPeriodEnd: periodEnd, trialEndsAt: null },
      create: { userId: id, status: "ACTIVE", plan: key.toUpperCase(), currentPeriodEnd: periodEnd },
    });
    await tx.event.create({
      data: {
        userId: id,
        name: "subscription_started",
        metadata: { provider: "manual_whatsapp", plan: key },
      },
    });
  });

  return NextResponse.json({ ok: true, plan: key, currentPeriodEnd: periodEnd.toISOString() });
}
