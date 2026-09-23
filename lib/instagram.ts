import { db } from "@/lib/db";

const APIFY_BASE = "https://api.apify.com/v2/acts";
const PROFILE_ACTOR = "apify~instagram-profile-scraper";
const POSTS_ACTOR = "apify~instagram-scraper";

type AnyRecord = Record<string, any>;

export type InstagramPost = {
  id: string;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  timestamp: string | null;
  like_count: number | null;
  comments_count: number | null;
};

export type InstagramProfileResult = {
  id: string;
  username: string;
  url: string;
  fullName: string | null;
  biography: string | null;
  website: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
  isBusinessAccount: boolean | null;
  private: boolean | null;
  verified: boolean | null;
  highlightReelCount: number | null;
  latestPosts: InstagramPost[];
  raw: AnyRecord;
};

function getToken() {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN não configurado no servidor.");
  return token;
}

function cleanUsername(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .toLowerCase();
}

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const result = asString(value);
    if (result) return result;
  }
  return null;
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const result = asNumber(value);
    if (result !== null) return result;
  }
  return null;
}

function normalizePost(post: AnyRecord, index: number): InstagramPost {
  const mediaUrl = firstString(
    post.mediaUrl,
    post.displayUrl,
    post.display_url,
    post.imageUrl,
    post.image_url,
    post.videoUrl,
    post.video_url,
    post.url,
    post.postUrl
  );
  const thumbnail = firstString(
    post.thumbnailUrl,
    post.thumbnail_url,
    post.thumbnailSrc,
    post.displayUrl,
    post.display_url,
    post.imageUrl,
    post.image_url
  );
  const id = firstString(post.id, post.pk, post.shortCode, post.shortcode, post.code) || `post-${index}`;
  const timestamp = firstString(post.timestamp, post.takenAt, post.takenAtIso, post.date);

  return {
    id,
    caption: firstString(post.caption, post.text),
    media_type: firstString(post.mediaType, post.type, post.media_type),
    media_url: mediaUrl,
    thumbnail_url: thumbnail,
    permalink: firstString(post.permalink, post.url, post.webUrl),
    timestamp,
    like_count: firstNumber(post.likeCount, post.likesCount, post.likes, post.like_count),
    comments_count: firstNumber(post.commentsCount, post.comments, post.commentCount, post.comments_count, post.comment_count),
  };
}

function normalizeProfile(item: AnyRecord): InstagramProfileResult {
  const meta = item.author_meta && typeof item.author_meta === "object" ? item.author_meta : {};
  const username = firstString(item.username, item.userName, item.handle, meta.username);
  const id = firstString(item.id, item.userId, item.pk, item.fbid, meta.id);
  if (!username || !id) throw new Error("A API da Apify não retornou um perfil válido.");

  const latest = Array.isArray(item.latestPosts)
    ? item.latestPosts
    : Array.isArray(item.posts)
      ? item.posts
      : [];

  return {
    id,
    username: username.replace(/^@/, "").toLowerCase(),
    url: firstString(item.url, item.inputUrl) || `https://www.instagram.com/${username}/`,
    fullName: firstString(item.fullName, item.full_name, item.name, meta.fullName, meta.full_name),
    biography: firstString(item.biography, item.bio, meta.biography, meta.bio),
    website: firstString(item.externalUrl, item.website, item.external_url, meta.externalUrl, meta.website, meta.external_url),
    profilePictureUrl: firstString(
      item.profilePicUrlHD,
      item.profilePicUrlHd,
      item.profilePicUrl,
      item.profilePictureUrl,
      item.profile_pic_url,
      meta.profilePicUrlHD,
      meta.profilePicUrlHd,
      meta.profilePicUrl,
      meta.profile_pic_url
    ),
    followersCount: firstNumber(item.followersCount, item.followers, item.followerCount, item.followers_count, meta.followersCount, meta.followers_count),
    followsCount: firstNumber(item.followsCount, item.followingCount, item.following, item.following_count, meta.followsCount, meta.following_count),
    mediaCount: firstNumber(item.postsCount, item.mediaCount, item.postCount, item.posts_count, meta.postsCount, meta.posts_count),
    isBusinessAccount: typeof item.isBusinessAccount === "boolean" ? item.isBusinessAccount : null,
    private: typeof item.private === "boolean" ? item.private : null,
    verified: typeof item.verified === "boolean" ? item.verified : null,
    highlightReelCount: firstNumber(item.highlightReelCount, item.highlightsCount),
    latestPosts: latest.slice(0, 12).map((post, index) => normalizePost(post, index)),
    raw: item,
  };
}

async function runActor(actor: string, input: AnyRecord) {
  const token = getToken();
  const url = `${APIFY_BASE}/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      firstString(data?.error?.message, data?.message, data?.error, text) ||
      `Apify respondeu com HTTP ${response.status}.`;
    throw new Error(message);
  }

  if (!Array.isArray(data)) {
    throw new Error("A Apify não retornou uma lista de resultados.");
  }

  return data as AnyRecord[];
}

export async function lookupInstagramProfile(usernameOrUrl: string) {
  const username = cleanUsername(usernameOrUrl);
  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    throw new Error("Informe um @ do Instagram válido.");
  }

  const results = await runActor(PROFILE_ACTOR, {
    usernames: [username],
    resultsLimit: 12,
  });

  const item = results[0];
  if (!item || item.error === "not_found") {
    throw new Error("Não encontramos esse perfil no Instagram.");
  }

  return normalizeProfile(item);
}

async function scrapeRecentPosts(username: string) {
  try {
    const results = await runActor(POSTS_ACTOR, {
      directUrls: [`https://www.instagram.com/${username}/`],
      resultsType: "posts",
      resultsLimit: 12,
      addParentData: true,
    });

    return results.slice(0, 12).map((post, index) => normalizePost(post, index));
  } catch {
    return [];
  }
}

async function saveProfile(userId: string, profile: InstagramProfileResult, posts: InstagramPost[]) {
  const latestPosts = posts.length ? posts : profile.latestPosts;
  const media = latestPosts.slice(0, 12);

  const existing = await db.socialAccount.findUnique({
    where: {
      platform_platformUserId: {
        platform: "INSTAGRAM",
        platformUserId: profile.id,
      },
    },
  });

  if (existing && existing.userId !== userId) {
    throw new Error("Esse Instagram já está conectado a outra conta.");
  }

  const account = await db.socialAccount.upsert({
    where: {
      platform_platformUserId: {
        platform: "INSTAGRAM",
        platformUserId: profile.id,
      },
    },
    update: {
      userId,
      username: profile.username,
      fullName: profile.fullName,
      biography: profile.biography,
      website: profile.website,
      profilePictureUrl: profile.profilePictureUrl,
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      mediaCount: profile.mediaCount,
      mediaCache: media,
      lastSyncedAt: new Date(),
      accessToken: null,
      tokenExpiresAt: null,
    },
    create: {
      userId,
      platform: "INSTAGRAM",
      platformUserId: profile.id,
      username: profile.username,
      fullName: profile.fullName,
      biography: profile.biography,
      website: profile.website,
      profilePictureUrl: profile.profilePictureUrl,
      followersCount: profile.followersCount,
      followsCount: profile.followsCount,
      mediaCount: profile.mediaCount,
      mediaCache: media,
      lastSyncedAt: new Date(),
    },
  });

  await db.metricSnapshot.create({
    data: {
      socialAccountId: account.id,
      followers: profile.followersCount,
      likes: media.length
        ? media.reduce((sum, item) => sum + (item.like_count || 0), 0)
        : null,
      comments: media.length
        ? media.reduce((sum, item) => sum + (item.comments_count || 0), 0)
        : null,
    },
  });

  return account;
}

export async function connectInstagramAccount(userId: string, usernameOrUrl: string) {
  const profile = await lookupInstagramProfile(usernameOrUrl);
  const posts = await scrapeRecentPosts(profile.username);
  const account = await saveProfile(userId, profile, posts);

  return {
    account,
    profile,
    posts: posts.length ? posts : profile.latestPosts,
  };
}

export async function syncInstagramAccount(socialAccountId: string) {
  const account = await db.socialAccount.findUnique({ where: { id: socialAccountId } });
  if (!account?.username) throw new Error("Conta do Instagram não encontrada.");

  const profile = await lookupInstagramProfile(account.username);
  const posts = await scrapeRecentPosts(profile.username);
  const saved = await saveProfile(account.userId, profile, posts);

  return {
    username: profile.username,
    followers: profile.followersCount,
    follows: profile.followsCount,
    mediaCount: profile.mediaCount,
    biography: profile.biography,
    website: profile.website,
    profilePictureUrl: profile.profilePictureUrl,
    lastSyncedAt: new Date().toISOString(),
    media: posts.length ? posts : profile.latestPosts,
  };
}
