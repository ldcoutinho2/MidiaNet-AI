import { NextResponse } from "next/server";

export async function GET() {
  // OAuth callback placeholder. Tokens must never be exposed to the browser.
  return NextResponse.json({
    ok: false,
    status: "not_configured",
    message: "Instagram OAuth callback is not configured yet."
  });
}
