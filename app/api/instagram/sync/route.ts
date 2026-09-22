import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncInstagramAccount } from "@/lib/instagram";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });

  const account = await db.socialAccount.findFirst({
    where: { userId: user.id, platform: "INSTAGRAM" },
  });

  if (!account) {
    return NextResponse.json({ ok: false, error: "Nenhum Instagram conectado." }, { status: 404 });
  }

  try {
    const data = await syncInstagramAccount(account.id);
    return NextResponse.json({ ok: true, account: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível sincronizar o Instagram." },
      { status: 502 }
    );
  }
}
