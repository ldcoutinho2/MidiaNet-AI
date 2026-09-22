import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL("/connect-instagram", req.url);
  url.searchParams.set("instagram", "oauth_disabled");
  return NextResponse.redirect(url);
}
