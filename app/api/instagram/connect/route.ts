import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { ok: false, error: "Instagram connection is not configured yet." },
      { status: 503 }
    );
  }

  // The exact Meta authorization URL and scopes will be added when the Meta app
  // credentials and approved permissions are configured.
  return NextResponse.json({
    ok: false,
    status: "not_configured",
    message: "Meta OAuth configuration is ready to be connected."
  });
}
