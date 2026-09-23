import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  confirmMercadoPagoPayment,
  fetchMercadoPagoPayment,
} from "@/lib/mercadopago";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const paymentId = new URL(request.url).searchParams.get("id");
  if (!paymentId) return NextResponse.json({ error: "Pagamento não informado." }, { status: 400 });

  const existing = await db.payment.findFirst({
    where: { userId: user.id, providerPaymentId: paymentId },
  });
  if (!existing) return NextResponse.json({ status: "NOT_FOUND" }, { status: 404 });
  if (existing.status === "PAID") return NextResponse.json({ status: "PAID" });

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return NextResponse.json({ status: existing.status });

  try {
    // Assim como no MidiaNetDigital, o status real vem de
    // GET /v1/payments/{paymentId}. A confirmação é centralizada e idempotente.
    const payment = await fetchMercadoPagoPayment(paymentId);
    if (!payment) return NextResponse.json({ status: existing.status });

    const externalReference = String(payment.external_reference || "");
    if (!externalReference.includes(`midianet:${user.id}:`)) {
      return NextResponse.json({ status: existing.status });
    }

    const result = await confirmMercadoPagoPayment(paymentId, user.id);
    if (!result.ok) return NextResponse.json({ status: existing.status });

    return NextResponse.json({
      status: result.paid ? "PAID" : String(result.status || existing.status).toUpperCase(),
    });
  } catch (error) {
    console.error("mercadopago_status_error", error);
    return NextResponse.json({ status: existing.status });
  }
}
