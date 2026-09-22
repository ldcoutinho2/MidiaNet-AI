import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function isAdmin(email?: string | null) {
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return !!email && allowed.includes(email.toLowerCase());
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || !isAdmin(admin.email)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      strategicProfile: true,
      subscription: true,
      socialAccounts: {
        select: {
          id: true,
          platform: true,
          username: true,
          platformUserId: true,
          connectedAt: true,
          updatedAt: true,
          tokenExpiresAt: true,
          metricSnapshots: {
            orderBy: { capturedAt: "desc" },
            take: 10,
            select: {
              capturedAt: true,
              followers: true,
              reach: true,
              views: true,
              likes: true,
              comments: true,
              shares: true,
              saves: true,
            },
          },
        },
      },
      contentDrafts: {
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          format: true,
          status: true,
          scheduledAt: true,
          publishedAt: true,
          updatedAt: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          amountCents: true,
          currency: true,
          status: true,
          provider: true,
          createdAt: true,
          paidAt: true,
        },
      },
      businessMetricSnapshots: {
        orderBy: { capturedAt: "desc" },
        take: 10,
        select: {
          capturedAt: true,
          instagramDms: true,
          instagramLeads: true,
          instagramSales: true,
          whatsappConversations: true,
          whatsappLeads: true,
          whatsappSales: true,
          salesCount: true,
          revenue: true,
          notes: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    strategicProfile: user.strategicProfile
      ? {
          niche: user.strategicProfile.niche,
          businessType: user.strategicProfile.businessType,
          objective: user.strategicProfile.objective,
          offer: user.strategicProfile.offer,
          audience: user.strategicProfile.audience,
          location: user.strategicProfile.location,
          onboardingCompletedAt: user.strategicProfile.onboardingCompletedAt,
          aiAnalyzedAt: user.strategicProfile.aiAnalyzedAt,
        }
      : null,
    subscription: user.subscription,
    socialAccounts: user.socialAccounts,
    contentDrafts: user.contentDrafts,
    payments: user.payments,
    businessMetricSnapshots: user.businessMetricSnapshots,
  });
}
