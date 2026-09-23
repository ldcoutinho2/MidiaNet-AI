import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { confirmMercadoPagoPayment } from "@/lib/mercadopago";

function isValidSignature(request: Request, paymentId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;

  const signature = request.headers.get("x-signature") || "";
  const requestId = request.headers.get("x-request-id") || "";
  const url = new URL(request.url);
  const dataId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("data_id") ||
    paymentId;

  const ts = signature.match(/(?:^|,)ts=([^,]+)/)?.[1] || "";
  const v1 = signature.match(/(?:^|,)v1=([^,]+)/)?.[1] || "";
  if (!ts || !v1 || !requestId || !dataId) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(v1, "utf8");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const paymentId = String(body.data?.id || body.id || "");

    if (!paymentId) return NextResponse.json({ ok: true });

    if (!isValidSignature(request, paymentId)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    // Mesmo fluxo do MidiaNetDigital:
    // recebe o ID -> consulta /v1/payments/{id} -> só então confirma.
    const result = await confirmMercadoPagoPayment(paymentId);

    if (!result.ok) {
      // Referências inválidas não precisam ser reenviadas pelo Mercado Pago.
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({
      ok: true,
      status: result.paid ? "approved" : result.status,
      activated: result.paid ? result.activated : false,
    });
  } catch (error) {
    console.error("mercadopago_webhook_error", error);
    // Erro real de infraestrutura: permite que o Mercado Pago tente novamente.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
