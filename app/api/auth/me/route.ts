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
        connectedAt: account.connectedAt,
      })),
    },
  });
}
