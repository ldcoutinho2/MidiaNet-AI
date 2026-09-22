import { db } from "@/lib/db";

const IG_GRAPH = "https://graph.instagram.com";

type InstagramProfile = {
  id?: string;
  username?: string;
  name?: string;
  biography?: string;
  website?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
};

type InstagramMedia = {
  id?: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

type InsightMetric = {
  name?: string;
  values?: Array<{ value?: number }>;
};

async function igGet(path: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(IG_GRAPH + path);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === "string" ? data.error.message : "Instagram API request failed";
    throw new Error(message);
  }
  return data;
}

function metricValue(data: { data?: InsightMetric[] }, name: string) {
  const metric = data.data?.find((item) => item.name === name);
  const value = metric?.values?.[0]?.value;
  return typeof value === "number" ? value : null;
}

export async function syncInstagramAccount(socialAccountId: string, accessToken?: string) {
  const account = await db.socialAccount.findUnique({ where: { id: socialAccountId } });
  if (!account) throw new Error("Conta do Instagram não encontrada.");

  const token = accessToken || account.accessToken;
  if (!token) throw new Error("Token do Instagram não disponível.");

  const profile = await igGet("/" + account.platformUserId, token, {
    fields: "id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count",
  }) as InstagramProfile;

  let media: InstagramMedia[] = [];
  try {
    const mediaData = await igGet("/" + account.platformUserId + "/media", token, {
      fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      limit: "12",
    });
    media = Array.isArray(mediaData?.data) ? mediaData.data : [];
  } catch {
    // Keep profile sync working if one media field is unavailable.
  }

  let reach: number | null = null;
  let views: number | null = null;
  try {
    const insights = await igGet("/" + account.platformUserId + "/insights", token, {
      metric: "reach,views,accounts_engaged,total_interactions",
      period: "day",
    });
    reach = metricValue(insights, "reach");
    views = metricValue(insights, "views");
  } catch {
    // Insights can be unavailable until the permission/app review is ready.
  }

  const followers = Number.isFinite(profile.followers_count) ? Number(profile.followers_count) : null;
  const follows = Number.isFinite(profile.follows_count) ? Number(profile.follows_count) : null;
  const mediaCount = Number.isFinite(profile.media_count) ? Number(profile.media_count) : null;

  await db.socialAccount.update({
    where: { id: account.id },
    data: {
      username: profile.username || account.username,
      fullName: profile.name ?? null,
      biography: profile.biography ?? null,
      website: profile.website ?? null,
      profilePictureUrl: profile.profile_picture_url ?? null,
      followersCount: followers,
      followsCount: follows,
      mediaCount,
      mediaCache: media.slice(0, 12),
      lastSyncedAt: new Date(),
      accessToken: token,
    },
  });

  await db.metricSnapshot.create({
    data: {
      socialAccountId: account.id,
      followers,
      reach,
      views,
      likes: media.length ? media.reduce((sum, item) => sum + (Number(item.like_count) || 0), 0) : null,
      comments: media.length ? media.reduce((sum, item) => sum + (Number(item.comments_count) || 0), 0) : null,
    },
  });

  return {
    username: profile.username || account.username,
    followers,
    follows,
    mediaCount,
    biography: profile.biography ?? null,
    website: profile.website ?? null,
    profilePictureUrl: profile.profile_picture_url ?? null,
    lastSyncedAt: new Date().toISOString(),
    media,
    insights: { reach, views },
  };
}
