import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const PLANS = {
  weekly: { name: "Semanal", amount: 14.99, amountCents: 1499, days: 7 },
  monthly: { name: "Mensal", amount: 29.99, amountCents: 2999, days: 30 },
} as const;

function digits(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ error: "Mercado Pago ainda não configurado no servidor." }, { status: 503 });

  try {
    const body = await request.json();
    const key = String(body.plan || "").toLowerCase() as keyof typeof PLANS;
    const plan = PLANS[key];
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const whatsapp = digits(body.whatsapp);

    if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    if (whatsapp.length < 10 || whatsapp.length > 13) return NextResponse.json({ error: "Informe um WhatsApp válido." }, { status: 400 });

    await db.user.update({ where: { id: user.id }, data: { name, phone: whatsapp } });

    const externalReference = `midianet:${user.id}:${key}:${randomUUID()}`;

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: plan.amount,
        description: `MidiaNet AI — Plano ${plan.name}`,
        payment_method_id: "pix",
        payer: {
          email,
          first_name: name.split(" ")[0],
          last_name: name.split(" ").slice(1).join(" ") || undefined,
        },
        external_reference: externalReference,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    const transactionData = data?.point_of_interaction?.transaction_data;
    if (!response.ok || !data.id || !transactionData?.qr_code) {
      console.error("mercadopago_pix_error", data);
      return NextResponse.json({ error: data?.message || "Não foi possível gerar o Pix." }, { status: 502 });
    }

    // O webhook pode chegar muito rápido. Se ele já tiver criado/confirmado
    // o pagamento, não podemos sobrescrever PAID com PENDING.
    await db.payment.upsert({
      where: { providerPaymentId: String(data.id) },
      update: {
        userId: user.id,
        provider: `mercadopago:${key}:pix`,
        amountCents: plan.amountCents,
        currency: "BRL",
      },
      create: {
        userId: user.id,
        provider: `mercadopago:${key}:pix`,
        providerPaymentId: String(data.id),
        amountCents: plan.amountCents,
        currency: "BRL",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      paymentId: String(data.id),
      plan: key,
      amountCents: plan.amountCents,
      qrCode: transactionData.qr_code,
      qrCodeBase64: transactionData.qr_code_base64 || null,
      ticketUrl: transactionData.ticket_url || null,
    });
  } catch (error) {
    console.error("mercadopago_pix_create_error", error);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
