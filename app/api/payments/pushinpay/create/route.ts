import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const PLANS = {
  weekly: { name: "Semanal", amount: 14.99, amountCents: 1499, days: 7 },
  monthly: { name: "Mensal", amount: 29.99, amountCents: 2999, days: 30 },
} as const;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ error: "Mercado Pago ainda não configurado no servidor." }, { status: 503 });

  try {
    const body = await request.json();
    const key = String(body.plan || "").toLowerCase() as keyof typeof PLANS;
    const plan = PLANS[key];
    if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const externalReference = `midianet:${user.id}:${key}:${randomUUID()}`;
    const notificationUrl = new URL("/api/payments/mercadopago/webhook", baseUrl).toString();

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify({
        items: [{
          id: `midianet-${key}`,
          title: `MidiaNet AI — Plano ${plan.name}`,
          description: `Acesso ao MidiaNet AI por ${plan.days} dias`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: plan.amount,
        }],
        payer: { email: user.email },
        external_reference: externalReference,
        notification_url: notificationUrl,
        back_urls: {
          success: `${baseUrl}/dashboard?payment=success`,
          failure: `${baseUrl}/dashboard?payment=failure`,
          pending: `${baseUrl}/dashboard?payment=pending`,
        },
        auto_return: "approved",
        statement_descriptor: "MIDIANET AI",
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.id || !data.init_point) {
      console.error("mercadopago_preference_error", data);
      return NextResponse.json({ error: "Não foi possível criar o checkout do Mercado Pago." }, { status: 502 });
    }

    await db.payment.create({
      data: {
        userId: user.id,
        provider: `mercadopago:${key}:preference`,
        providerPaymentId: `preference:${data.id}`,
        amountCents: plan.amountCents,
        currency: "BRL",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      checkoutUrl: data.init_point,
      preferenceId: data.id,
      plan: key,
      amountCents: plan.amountCents,
    });
  } catch (error) {
    console.error("mercadopago_create_error", error);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
