import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectInstagramAccount, lookupInstagramProfile } from "@/lib/instagram";
import { db } from "@/lib/db";

function normalize(value: string) {
  return value
    .trim()
    .replace(/^https?:\\/\\/(www\\.)?instagram\\.com\\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
}

function validUsername(value: string) {
  return /^[a-z0-9._]{1,30}$/.test(value);
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });

  const raw = new URL(req.url).searchParams.get("username") || "";
  const username = normalize(raw);
  if (!validUsername(username)) {
    return NextResponse.json({ ok: false, error: "Informe um @ do Instagram válido." }, { status: 400 });
  }

  try {
    const profile = await lookupInstagramProfile(username);
    return NextResponse.json({
      ok: true,
      profile: {
        id: profile.id,
        username: profile.username,
        url: profile.url,
        fullName: profile.fullName,
        biography: profile.biography,
        website: profile.website,
        profilePictureUrl: profile.profilePictureUrl,
        followersCount: profile.followersCount,
        followsCount: profile.followsCount,
        mediaCount: profile.mediaCount,
        isBusinessAccount: profile.isBusinessAccount,
        private: profile.private,
        verified: profile.verified,
        highlightReelCount: profile.highlightReelCount,
        latestPosts: profile.latestPosts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível buscar o perfil." },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const username = normalize(String(body?.username || ""));
  if (!validUsername(username)) {
    return NextResponse.json({ ok: false, error: "Informe um @ do Instagram válido." }, { status: 400 });
  }

  try {
    const result = await connectInstagramAccount(user.id, username);

    await db.event.create({
      data: {
        name: "instagram_connected",
        occurredAt: new Date(),
        userId: user.id,
        metadata: { username: result.profile.username, source: "apify" },
      },
    });

    return NextResponse.json({
      ok: true,
      account: {
        id: result.account.id,
        username: result.profile.username,
        fullName: result.profile.fullName,
        followersCount: result.profile.followersCount,
        followsCount: result.profile.followsCount,
        mediaCount: result.profile.mediaCount,
        biography: result.profile.biography,
        website: result.profile.website,
        profilePictureUrl: result.profile.profilePictureUrl,
        mediaCache: result.posts,
        lastSyncedAt: result.account.lastSyncedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível conectar esse perfil." },
      { status: 502 }
    );
  }
}
