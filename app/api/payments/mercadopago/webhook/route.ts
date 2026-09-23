import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

const PLAN_DAYS: Record<string, number> = { weekly: 7, monthly: 30 };

function isValidSignature(request: Request, paymentId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  // Until the production webhook secret is configured, keep the endpoint compatible
  // with the existing polling fallback. Once configured, every webhook is authenticated.
  if (!secret) return true;

  const signature = request.headers.get("x-signature") || "";
  const requestId = request.headers.get("x-request-id") || "";
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") || url.searchParams.get("data_id") || paymentId;
  const ts = signature.match(/(?:^|,)ts=([^,]+)/)?.[1] || "";
  const v1 = signature.match(/(?:^|,)v1=([^,]+)/)?.[1] || "";
  if (!ts || !v1 || !requestId || !dataId) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(v1, "utf8");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const paymentId = String(body.data?.id || body.id || "");
    if (!paymentId) return NextResponse.json({ ok: true });

    if (!isValidSignature(request, paymentId)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ ok: false }, { status: 503 });

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ ok: false }, { status: 502 });

    const payment = await response.json();
    const referenceParts = String(payment.external_reference || "").split(":");
    if (referenceParts.length < 4 || referenceParts[0] !== "midianet") return NextResponse.json({ ok: true });

    const userId = referenceParts[1];
    const plan = referenceParts[2];
    const days = PLAN_DAYS[plan];
    if (!userId || !days) return NextResponse.json({ ok: true });

    const existing = await db.payment.findFirst({ where: { userId, providerPaymentId: paymentId } });
    const status = String(payment.status || "").toLowerCase();

    if (status !== "approved") {
      if (existing && existing.status !== status.toUpperCase()) {
        await db.payment.update({ where: { id: existing.id }, data: { status: status.toUpperCase() } });
      }
      return NextResponse.json({ ok: true, status });
    }

    if (existing?.status === "PAID") return NextResponse.json({ ok: true, status: "approved" });

    const now = new Date();
    const subscription = await db.subscription.findUnique({ where: { userId } });
    const currentEnd = subscription?.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now.getTime()
      ? subscription.currentPeriodEnd
      : now;
    const periodEnd = new Date(currentEnd.getTime() + days * 86400000);

    await db.$transaction(async (tx) => {
      if (existing) {
        await tx.payment.update({
          where: { id: existing.id },
          data: { status: "PAID", paidAt: now, amountCents: Math.round(Number(payment.transaction_amount || 0) * 100) || existing.amountCents },
        });
      } else {
        await tx.payment.create({
          data: {
            userId,
            provider: `mercadopago:${plan}:pix`,
            providerPaymentId: paymentId,
            amountCents: Math.round(Number(payment.transaction_amount || 0) * 100),
            currency: "BRL",
            status: "PAID",
            paidAt: now,
          },
        });
      }

      await tx.subscription.upsert({
        where: { userId },
        update: { status: "ACTIVE", plan: plan.toUpperCase(), currentPeriodEnd: periodEnd, trialEndsAt: null },
        create: { userId, status: "ACTIVE", plan: plan.toUpperCase(), currentPeriodEnd: periodEnd },
      });

      await tx.event.create({
        data: { userId, name: "payment_approved", metadata: { provider: "mercadopago", paymentId, plan } },
      });
      await tx.event.create({
        data: { userId, name: "subscription_started", metadata: { provider: "mercadopago", plan } },
      });
    });

    return NextResponse.json({ ok: true, status: "approved" });
  } catch (error) {
    console.error("mercadopago_webhook_error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
