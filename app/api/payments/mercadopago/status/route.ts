import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const PLAN_DAYS: Record<string, number> = { WEEKLY: 7, MONTHLY: 30 };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const paymentId = new URL(request.url).searchParams.get("id");
  if (!paymentId) return NextResponse.json({ error: "Pagamento não informado." }, { status: 400 });

  const existing = await db.payment.findFirst({ where: { userId: user.id, providerPaymentId: paymentId } });
  if (!existing) return NextResponse.json({ status: "NOT_FOUND" }, { status: 404 });
  if (existing.status === "PAID") return NextResponse.json({ status: "PAID" });

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ status: existing.status });

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ status: existing.status });

    const payment = await response.json();
    const status = String(payment.status || "").toLowerCase();
    if (status !== "approved") {
      const nextStatus = status ? status.toUpperCase() : existing.status;
      if (nextStatus !== existing.status) await db.payment.update({ where: { id: existing.id }, data: { status: nextStatus } });
      return NextResponse.json({ status: nextStatus });
    }

    const parts = String(payment.external_reference || "").split(":");
    const plan = String(parts[2] || "").toUpperCase();
    const days = PLAN_DAYS[plan];
    if (!parts[1] || !days || parts[1] !== user.id) return NextResponse.json({ status: existing.status });

    const now = new Date();
    const subscription = await db.subscription.findUnique({ where: { userId: user.id } });
    const currentEnd = subscription?.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now.getTime()
      ? subscription.currentPeriodEnd
      : now;
    const periodEnd = new Date(currentEnd.getTime() + days * 86400000);

    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: existing.id },
        data: {
          status: "PAID",
          paidAt: existing.paidAt || now,
          amountCents: Math.round(Number(payment.transaction_amount || 0) * 100) || existing.amountCents,
        },
      });
      await tx.subscription.upsert({
        where: { userId: user.id },
        update: { status: "ACTIVE", plan, currentPeriodEnd: periodEnd, trialEndsAt: null },
        create: { userId: user.id, status: "ACTIVE", plan, currentPeriodEnd: periodEnd },
      });
      await tx.event.create({
        data: {
          userId: user.id,
          name: "payment_approved",
          metadata: { provider: "mercadopago", paymentId, plan: plan.toLowerCase() },
        },
      });
      await tx.event.create({
        data: {
          userId: user.id,
          name: "subscription_started",
          metadata: { provider: "mercadopago", plan: plan.toLowerCase() },
        },
      });
    });

    return NextResponse.json({ status: "PAID" });
  } catch {
    return NextResponse.json({ status: existing.status });
  }
}
