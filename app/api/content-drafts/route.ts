import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const allowed = new Set(["IDEA","DRAFT","APPROVED","SCHEDULED","PUBLISHED"]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const drafts = await db.contentDraft.findMany({
    where: { userId: user.id },
    orderBy: [{ dayLabel: "asc" }, { timeLabel: "asc" }, { createdAt: "asc" }],
    take: 100,
  });
  return NextResponse.json({ ok: true, drafts });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!id || !allowed.has(status)) return NextResponse.json({ error: "Conteúdo ou status inválido." }, { status: 400 });

  const existing = await db.contentDraft.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Conteúdo não encontrado." }, { status: 404 });

  const now = new Date();
  const updated = await db.contentDraft.update({
    where: { id },
    data: {
      status: status as any,
      approvedAt: status === "APPROVED" ? (existing.approvedAt || now) : existing.approvedAt,
      publishedAt: status === "PUBLISHED" ? (existing.publishedAt || now) : existing.publishedAt,
    },
  });

  return NextResponse.json({ ok: true, draft: updated });
}
