import { db } from "@/lib/db";

export const PLAN_DAYS: Record<string, number> = {
  weekly: 7,
  monthly: 30,
};

export type MercadoPagoPayment = {
  id?: string | number;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
};

export async function fetchMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPayment | null> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado.");

  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;
  return (await response.json()) as MercadoPagoPayment;
}

export function parseExternalReference(reference: unknown) {
  const parts = String(reference || "").split(":");
  if (parts.length < 4 || parts[0] !== "midianet") return null;

  const userId = parts[1];
  const plan = parts[2];
  const days = PLAN_DAYS[plan];
  if (!userId || !days) return null;

  return { userId, plan, days };
}

/**
 * Confirma o pagamento e libera a assinatura de forma idempotente.
 * A troca PENDING -> PAID é atômica para impedir que webhook + polling
 * prorroguem a mesma assinatura duas vezes.
 */
export async function confirmMercadoPagoPayment(
  paymentId: string,
  expectedUserId?: string,
) {
  const payment = await fetchMercadoPagoPayment(paymentId);
  if (!payment) return { ok: false as const, reason: "payment_not_found" as const };

  const reference = parseExternalReference(payment.external_reference);
  if (!reference) return { ok: false as const, reason: "invalid_reference" as const };

  if (expectedUserId && reference.userId !== expectedUserId) {
    return { ok: false as const, reason: "user_mismatch" as const };
  }

  const status = String(payment.status || "").toLowerCase();

  if (status !== "approved") {
    const existing = await db.payment.findUnique({ where: { providerPaymentId: paymentId } });
    // Um pagamento que já foi aprovado não volta para PENDING/IN_PROCESS
    // só porque recebemos outra notificação do mesmo paymentId.
    if (existing?.status === "PAID") {
      return { ok: true as const, paid: true as const, activated: false as const, status: "approved" as const };
    }
    if (existing && existing.status !== status.toUpperCase()) {
      await db.payment.update({
        where: { id: existing.id },
        data: { status: status.toUpperCase() },
      });
    }
    return { ok: true as const, paid: false as const, status };
  }

  const now = new Date();
  const amountCents =
    Math.round(Number(payment.transaction_amount || 0) * 100) || undefined;

  const result = await db.$transaction(async (tx) => {
    let localPayment = await tx.payment.findUnique({
      where: { providerPaymentId: paymentId },
    });

    if (!localPayment) {
      localPayment = await tx.payment.create({
        data: {
          userId: reference.userId,
          provider: `mercadopago:${reference.plan}:pix`,
          providerPaymentId: paymentId,
          amountCents: amountCents || 0,
          currency: "BRL",
          status: "PENDING",
        },
      });
    }

    // Idempotência: somente quem consegue fazer PENDING -> PAID pode
    // estender a assinatura e criar os eventos.
    const claimed = await tx.payment.updateMany({
      where: { id: localPayment.id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paidAt: localPayment.paidAt || now,
        ...(amountCents ? { amountCents } : {}),
      },
    });

    if (claimed.count === 0) {
      return { activated: false };
    }

    const subscription = await tx.subscription.findUnique({
      where: { userId: reference.userId },
    });

    const currentEnd =
      subscription?.currentPeriodEnd &&
      subscription.currentPeriodEnd.getTime() > now.getTime()
        ? subscription.currentPeriodEnd
        : now;

    const periodEnd = new Date(
      currentEnd.getTime() + reference.days * 86400000,
    );

    await tx.subscription.upsert({
      where: { userId: reference.userId },
      update: {
        status: "ACTIVE",
        plan: reference.plan.toUpperCase(),
        provider: "mercadopago",
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      },
      create: {
        userId: reference.userId,
        status: "ACTIVE",
        plan: reference.plan.toUpperCase(),
        provider: "mercadopago",
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      },
    });

    await tx.event.create({
      data: {
        userId: reference.userId,
        name: "payment_approved",
        metadata: {
          provider: "mercadopago",
          paymentId,
          plan: reference.plan,
        },
      },
    });

    await tx.event.create({
      data: {
        userId: reference.userId,
        name: "subscription_started",
        metadata: {
          provider: "mercadopago",
          plan: reference.plan,
        },
      },
    });

    return { activated: true };
  });

  return {
    ok: true as const,
    paid: true as const,
    activated: result.activated,
    status: "approved" as const,
    plan: reference.plan,
  };
}
