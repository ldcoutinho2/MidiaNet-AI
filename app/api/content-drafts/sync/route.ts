import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const weeklyPlan = Array.isArray(body.weeklyPlan) ? body.weeklyPlan : [];
  if (weeklyPlan.length !== 7) return NextResponse.json({ error: "A semana precisa ter 7 dias." }, { status: 400 });

  const results = [];
  for (let dayIndex = 0; dayIndex < weeklyPlan.length; dayIndex++) {
    const day = weeklyPlan[dayIndex];
    const slots = Array.isArray(day?.slots) ? day.slots : [];
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex];
      const slotKey = `${dayIndex}:${slotIndex}`;
      const existing = await db.contentDraft.findFirst({ where: { userId: user.id, slotKey } });
      const data = {
        dayLabel: String(day.day || `Dia ${dayIndex + 1}`),
        timeLabel: String(slot.time || ""),
        format: String(slot.format || "Reel"),
        role: String(slot.role || ""),
        objective: String(slot.objective || ""),
        title: String(slot.title || "Sem título"),
        topic: String(slot.topic || ""),
        hook: String(slot.hook || ""),
        script: String(slot.script || ""),
        caption: String(slot.caption || ""),
        visualDirection: String(slot.visualDirection || ""),
        cta: String(slot.cta || ""),
        conversationHistory: []
      };
      const saved = existing
        ? await db.contentDraft.update({ where: { id: existing.id }, data })
        : await db.contentDraft.create({ data: { userId: user.id, slotKey, ...data } });
      results.push(saved);
    }
  }

  return NextResponse.json({ ok: true, drafts: results });
}
