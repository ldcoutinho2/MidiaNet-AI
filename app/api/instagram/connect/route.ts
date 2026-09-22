import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return NextResponse.json(
      {
        ok: false,
        error: "A conexão ainda não foi configurada. Falta configurar META_APP_ID e META_REDIRECT_URI na Vercel."
      },
      { status: 503 }
    );
  }

  const scope = [
    "instagram_business_basic",
    "instagram_business_manage_insights"
  ].join(",");

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);

  return NextResponse.redirect(url);
}
