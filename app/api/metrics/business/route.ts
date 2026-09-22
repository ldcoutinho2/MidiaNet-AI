import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const snapshots = await db.businessMetricSnapshot.findMany({ where: { userId: user.id }, orderBy: { capturedAt: "desc" }, take: 30 });
  return NextResponse.json({ snapshots });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await req.json();
  const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0; };
  const revenue = Number(body.revenue);
  const snapshot = await db.businessMetricSnapshot.create({ data: {
    userId: user.id,
    instagramDms: n(body.instagramDms), instagramLeads: n(body.instagramLeads), instagramSales: n(body.instagramSales),
    whatsappConversations: n(body.whatsappConversations), whatsappLeads: n(body.whatsappLeads), whatsappSales: n(body.whatsappSales),
    salesCount: n(body.salesCount), revenue: Number.isFinite(revenue) && revenue >= 0 ? revenue : 0,
    notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : null,
  }});
  return NextResponse.json({ ok: true, snapshot });
}