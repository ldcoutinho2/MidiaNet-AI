import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const body = await request.json();
    const profileDescription = String(body.profileDescription ?? "").trim();
    const desiredOutcome = String(body.desiredOutcome ?? "").trim();
    const instagramProfileUrl = String(body.instagramProfileUrl ?? "").trim();

    if (!profileDescription || !desiredOutcome) {
      return NextResponse.json({ error: "Preencha as duas perguntas." }, { status: 400 });
    }

    const profile = await db.strategicProfile.upsert({
      where: { userId: user.id },
      update: { profileDescription, desiredOutcome, instagramProfileUrl: instagramProfileUrl || null },
      create: { userId: user.id, profileDescription, desiredOutcome, instagramProfileUrl: instagramProfileUrl || null },
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("profile_save_error", error);
    return NextResponse.json({ error: "Não foi possível salvar o perfil." }, { status: 500 });
  }
}
