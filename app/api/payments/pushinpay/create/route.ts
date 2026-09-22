import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const PLANS = {
  weekly: { name: "Semanal", amountCents: 1499, days: 7 },
  monthly: { name: "Mensal", amountCents: 2999, days: 30 },
} as const;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const token = process.env.PUSHINPAY_TOKEN;
  if (!token) return NextResponse.json({ error: "Pagamento ainda não configurado no servidor." }, { status: 503 });

  try {
    const body = await request.json();
    const key = String(body.plan || "").toLowerCase() as keyof typeof PLANS;
    const plan = PLANS[key];
    if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const webhookUrl = new URL("/api/payments/pushinpay/webhook", baseUrl).toString();

    const response = await fetch("https://api.pushinpay.com.br/api/pix/cashIn", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: plan.amountCents,
        webhook_url: webhookUrl,
        split_rules: [],
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("pushinpay_create_error", data);
      return NextResponse.json({ error: "Não foi possível gerar o PIX agora." }, { status: 502 });
    }

    const transactionId = String(data.id || data.transaction_id || data.payment_id || "");
    if (!transactionId) return NextResponse.json({ error: "O provedor não retornou o identificador do pagamento." }, { status: 502 });

    await db.payment.create({
      data: {
        userId: user.id,
        provider: `pushinpay:${key}`,
        providerPaymentId: transactionId,
        amountCents: plan.amountCents,
        currency: "BRL",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      plan: key,
      planName: plan.name,
      amountCents: plan.amountCents,
      transactionId,
      qrCode: data.qr_code || data.qrcode || data.pix_code || null,
      qrCodeBase64: data.qr_code_base64 || data.qrcode_base64 || null,
      expiresAt: data.expires_at || null,
    });
  } catch (error) {
    console.error("payment_create_error", error);
    return NextResponse.json({ error: "Não foi possível criar o pagamento." }, { status: 500 });
  }
}
