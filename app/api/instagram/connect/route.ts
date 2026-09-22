import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });

  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !redirectUri) {
    return NextResponse.json(
      { ok: false, error: "A conexão ainda não foi configurada. Falta configurar META_APP_ID e META_REDIRECT_URI na Vercel." },
      { status: 503 }
    );
  }

  const requested = new URL(req.url).searchParams.get("username")?.trim().replace(/^@/, "");
  if (!requested || !/^[a-zA-Z0-9._]{1,30}$/.test(requested)) {
    return NextResponse.json({ ok: false, error: "Informe um @ do Instagram válido." }, { status: 400 });
  }

  const state = randomBytes(32).toString("base64url");
  const store = await cookies();
  store.set("midianet_instagram_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  store.set("midianet_instagram_requested_username", requested.toLowerCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  const scope = [
    "instagram_business_basic",
    "instagram_business_manage_insights",
  ].join(",");

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
