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

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Título obrigatório." }, { status: 400 });
  const draft = await db.contentDraft.create({
    data: {
      userId: user.id,
      status: "DRAFT",
      slotKey: null,
      dayLabel: "Ideias adicionadas",
      timeLabel: null,
      format: String(body.format || "Reel"),
      role: String(body.role || "Nova ideia"),
      objective: String(body.objective || ""),
      title,
      topic: String(body.topic || ""),
      hook: String(body.hook || ""),
      script: String(body.script || ""),
      caption: String(body.caption || ""),
      visualDirection: String(body.visualDirection || ""),
      cta: String(body.cta || ""),
      conversationHistory: Array.isArray(body.executionSteps) ? body.executionSteps : []
    }
  });
  return NextResponse.json({ ok: true, draft });
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
  const patchData:any = {
    status: status as any,
    approvedAt: status === "APPROVED" ? (existing.approvedAt || now) : existing.approvedAt,
    publishedAt: status === "PUBLISHED" ? (existing.publishedAt || now) : existing.publishedAt,
  };
  for (const key of ["title","format","objective","hook","script","caption","visualDirection","cta","slotKey","dayLabel","timeLabel"]) {
    if (typeof body[key] === "string") patchData[key] = body[key];
  }
  if (Array.isArray(body.conversationHistory)) patchData.conversationHistory = body.conversationHistory;
  const updated = await db.contentDraft.update({ where: { id: existing.id }, data: patchData });

  return NextResponse.json({ ok: true, draft: updated });
}
