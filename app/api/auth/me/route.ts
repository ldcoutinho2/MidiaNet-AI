import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlements";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });

  const entitlement = await getEntitlement(user.id);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      strategicProfile: user.strategicProfile,
      subscription: entitlement.subscription,
      socialAccounts: user.socialAccounts.map((account) => ({
        id: account.id,
        platform: account.platform,
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
        connectedAt: account.connectedAt,
      })),
    },
  });
}
