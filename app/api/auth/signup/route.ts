import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const profileDescription = String(body.profileDescription ?? "").trim();
    const desiredOutcome = String(body.desiredOutcome ?? "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
    }
    if (!profileDescription || !desiredOutcome) {
      return NextResponse.json({ error: "Preencha as duas perguntas sobre o perfil." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Este e-mail já possui uma conta." }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        name: name || null,
        email,
        passwordHash: hashPassword(password),
        strategicProfile: {
          create: { profileDescription, desiredOutcome },
        },
      },
    });

    await createSession(user.id);

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (error) {
    console.error("signup_error", error);
    return NextResponse.json({ error: "Não foi possível criar sua conta agora." }, { status: 500 });
  }
}
