import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const account = user.socialAccounts[0];
  if (!account) return NextResponse.json({ connected: false, snapshots: [] });

  const snapshots = await db.metricSnapshot.findMany({
    where: { socialAccountId: account.id },
    orderBy: { capturedAt: "desc" },
    take: 30,
  });

  const latest = snapshots[0] || null;
  const previous = snapshots[1] || null;

  return NextResponse.json({
    connected: true,
    account: {
      id: account.id,
      username: account.username,
      fullName: account.fullName,
      biography: account.biography,
      website: account.website,
      profilePictureUrl: account.profilePictureUrl,
      followersCount: account.followersCount,
      followsCount: account.followsCount,
      mediaCount: account.mediaCount,
      mediaCache: account.mediaCache,
      lastSyncedAt: account.lastSyncedAt,
    },
    latest,
    previous,
    snapshots: snapshots.reverse(),
  });
}
