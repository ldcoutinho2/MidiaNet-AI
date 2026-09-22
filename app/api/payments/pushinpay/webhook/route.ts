import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const PLANS = {
  weekly: { days: 7 },
  monthly: { days: 30 },
} as const;

function getPlan(provider?: string | null) {
  const key = provider?.split(":")[1] as keyof typeof PLANS | undefined;
  return key && PLANS[key] ? PLANS[key] : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const transactionId = String(body.id || body.transaction_id || body.payment_id || body.uuid || "");
    if (!transactionId) return NextResponse.json({ ok: false, error: "Pagamento não identificado." }, { status: 400 });

    const payment = await db.payment.findUnique({ where: { providerPaymentId: transactionId } });
    if (!payment) return NextResponse.json({ ok: true });

    let status = String(body.status || body.transaction_status || "").toLowerCase();

    const token = process.env.PUSHINPAY_TOKEN;
    if (token) {
      const check = await fetch(`https://api.pushinpay.com.br/api/transactions/${encodeURIComponent(transactionId)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      }).catch(() => null);
      if (check?.ok) {
        const verified = await check.json().catch(() => ({}));
        status = String(verified.status || verified.transaction_status || status).toLowerCase();
      }
    }

    const paid = ["paid", "approved", "completed", "success"].includes(status);
    if (!paid) {
      await db.payment.update({ where: { id: payment.id }, data: { status: status || "PENDING" } });
      return NextResponse.json({ ok: true, status: status || "PENDING" });
    }

    if (payment.status === "PAID") return NextResponse.json({ ok: true, status: "PAID" });

    const plan = getPlan(payment.provider);
    if (!plan) return NextResponse.json({ ok: false, error: "Plano do pagamento não identificado." }, { status: 500 });

    const now = new Date();
    const subscription = await db.subscription.findUnique({ where: { userId: payment.userId } });
    const currentEnd = subscription?.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now.getTime()
      ? subscription.currentPeriodEnd
      : now;
    const periodEnd = new Date(currentEnd.getTime() + plan.days * 24 * 60 * 60 * 1000);

    await db.$transaction([
      db.payment.update({
        where: { id: payment.id },
        data: { status: "PAID", paidAt: now },
      }),
      db.subscription.upsert({
        where: { userId: payment.userId },
        update: {
          status: "ACTIVE",
          plan: payment.provider?.split(":")[1]?.toUpperCase() || "PAID",
          currentPeriodEnd: periodEnd,
        },
        create: {
          userId: payment.userId,
          status: "ACTIVE",
          plan: payment.provider?.split(":")[1]?.toUpperCase() || "PAID",
          currentPeriodEnd: periodEnd,
        },
      }),
      db.event.create({
        data: {
          userId: payment.userId,
          name: "payment_approved",
          metadata: { provider: "pushinpay", transactionId, plan: payment.provider },
        },
      }),
      db.event.create({
        data: {
          userId: payment.userId,
          name: "subscription_started",
          metadata: { plan: payment.provider },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, status: "PAID" });
  } catch (error) {
    console.error("pushinpay_webhook_error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
