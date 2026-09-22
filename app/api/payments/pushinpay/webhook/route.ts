import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const PLANS = { weekly: 7, monthly: 30 } as const;

function parseReference(reference: string) {
  const parts = reference.split(":");
  if (parts.length < 4 || parts[0] !== "midianet") return null;
  const plan = parts[2] as keyof typeof PLANS;
  if (!PLANS[plan]) return null;
  return { userId: parts[1], plan, days: PLANS[plan] };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const paymentId = String(body.data?.id || body.id || "");
    if (!paymentId) return NextResponse.json({ ok: true });

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ ok: false }, { status: 503 });

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!paymentResponse.ok) return NextResponse.json({ ok: false }, { status: 502 });

    const payment = await paymentResponse.json();
    const reference = parseReference(String(payment.external_reference || ""));
    if (!reference) return NextResponse.json({ ok: true });

    const status = String(payment.status || "").toLowerCase();
    const existingPaid = await db.payment.findFirst({
      where: { providerPaymentId: String(paymentId), status: "PAID" },
    });
    if (existingPaid) return NextResponse.json({ ok: true });

    const now = new Date();
    if (status !== "approved") {
      const existingPending = await db.payment.findFirst({
        where: {
          userId: reference.userId,
          provider: `mercadopago:${reference.plan}:preference`,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      });
      if (existingPending) {
        await db.payment.update({ where: { id: existingPending.id }, data: { status: status.toUpperCase() } });
      }
      return NextResponse.json({ ok: true, status });
    }

    const existingByPreference = await db.payment.findFirst({
      where: {
        userId: reference.userId,
        provider: `mercadopago:${reference.plan}:preference`,
        providerPaymentId: { startsWith: "preference:" },
        status: { not: "PAID" },
      },
      orderBy: { createdAt: "desc" },
    });

    const subscription = await db.subscription.findUnique({ where: { userId: reference.userId } });
    const currentEnd = subscription?.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now.getTime()
      ? subscription.currentPeriodEnd
      : now;
    const periodEnd = new Date(currentEnd.getTime() + reference.days * 86400000);

    await db.$transaction(async tx => {
      if (existingByPreference) {
        await tx.payment.update({
          where: { id: existingByPreference.id },
          data: { providerPaymentId: String(paymentId), status: "PAID", paidAt: now },
        });
      } else {
        await tx.payment.create({
          data: {
            userId: reference.userId,
            provider: `mercadopago:${reference.plan}:payment`,
            providerPaymentId: String(paymentId),
            amountCents: Math.round(Number(payment.transaction_amount || 0) * 100),
            currency: "BRL",
            status: "PAID",
            paidAt: now,
          },
        });
      }
      await tx.subscription.upsert({
        where: { userId: reference.userId },
        update: {
          status: "ACTIVE",
          plan: reference.plan.toUpperCase(),
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
        },
        create: {
          userId: reference.userId,
          status: "ACTIVE",
          plan: reference.plan.toUpperCase(),
          currentPeriodEnd: periodEnd,
        },
      });
      await tx.event.create({
        data: {
          userId: reference.userId,
          name: "payment_approved",
          metadata: { provider: "mercadopago", paymentId, plan: reference.plan },
        },
      });
      await tx.event.create({
        data: {
          userId: reference.userId,
          name: "subscription_started",
          metadata: { provider: "mercadopago", plan: reference.plan },
        },
      });
    });

    return NextResponse.json({ ok: true, status: "approved" });
  } catch (error) {
    console.error("mercadopago_webhook_error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
