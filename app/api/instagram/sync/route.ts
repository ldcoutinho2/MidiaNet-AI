import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncInstagramAccount } from "@/lib/instagram";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const account = user.socialAccounts[0];
  if (!account) return NextResponse.json({ error: "Nenhuma conta do Instagram conectada." }, { status: 400 });
  if (!account.accessToken) return NextResponse.json({ error: "O token do Instagram não está disponível. Reconecte a conta." }, { status: 400 });

  try {
    const result = await syncInstagramAccount(account.id, account.accessToken);
    return NextResponse.json({ ok: true, account: result });
  } catch (error) {
    console.error("instagram_sync_error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível sincronizar o Instagram agora." },
      { status: 502 }
    );
  }
}
