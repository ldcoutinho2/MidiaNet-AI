import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncInstagramAccount } from "@/lib/instagram";

const COOKIE_STATE = "midianet_instagram_oauth_state";
const COOKIE_USERNAME = "midianet_instagram_requested_username";

function redirectToConnect(req: Request, status: string, detail?: string) {
  const url = new URL("/connect-instagram", req.url);
  url.searchParams.set("instagram", status);
  if (detail) url.searchParams.set("detail", detail);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return redirectToConnect(req, "login_required");

  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");

  const store = await cookies();
  const savedState = store.get(COOKIE_STATE)?.value;
  const requestedUsername = store.get(COOKIE_USERNAME)?.value || "";

  store.delete(COOKIE_STATE);
  store.delete(COOKIE_USERNAME);

  if (oauthError) return redirectToConnect(req, "cancelled");
  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return redirectToConnect(req, "invalid_state");
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) {
    return redirectToConnect(req, "not_configured");
  }

  try {
    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) return redirectToConnect(req, "token_exchange_failed");

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      user_id?: string | number;
    };

    if (!tokenData.access_token || !tokenData.user_id) {
      return redirectToConnect(req, "invalid_token_response");
    }

    let accessToken = tokenData.access_token;
    let expiresIn: number | null = null;

    // Prefer a long-lived token when the current Instagram API flow supports it.
    const longLivedResponse = await fetch(
      "https://graph.instagram.com/access_token?" +
      new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: appSecret,
        access_token: accessToken,
      }).toString(),
      { cache: "no-store" }
    ).catch(() => null);

    if (longLivedResponse?.ok) {
      const longLived = await longLivedResponse.json() as {
        access_token?: string;
        expires_in?: number;
      };
      if (longLived.access_token) {
        accessToken = longLived.access_token;
        expiresIn = Number.isFinite(longLived.expires_in) ? longLived.expires_in! : null;
      }
    }

    const profileResponse = await fetch(
      "https://graph.instagram.com/me?" +
      new URLSearchParams({
        fields: "id,username",
        access_token: accessToken,
      }).toString(),
      { cache: "no-store" }
    );

    if (!profileResponse.ok) return redirectToConnect(req, "profile_lookup_failed");

    const profile = await profileResponse.json() as {
      id?: string;
      username?: string;
    };

    if (!profile.id || !profile.username) {
      return redirectToConnect(req, "profile_not_found");
    }

    const actualUsername = profile.username.replace(/^@/, "").toLowerCase();
    if (requestedUsername && actualUsername !== requestedUsername) {
      return redirectToConnect(req, "profile_mismatch");
    }

    const existing = await db.socialAccount.findUnique({
      where: {
        platform_platformUserId: {
          platform: "INSTAGRAM",
          platformUserId: String(profile.id),
        },
      },
    });

    if (existing && existing.userId !== user.id) {
      return redirectToConnect(req, "already_connected");
    }

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    const socialAccount = await db.socialAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: "INSTAGRAM",
          platformUserId: String(profile.id),
        },
      },
      update: {
        userId: user.id,
        username: profile.username,
        accessToken,
        tokenExpiresAt,
      },
      create: {
        userId: user.id,
        platform: "INSTAGRAM",
        platformUserId: String(profile.id),
        username: profile.username,
        accessToken,
        tokenExpiresAt,
      },
    });

    // OAuth establishes the account identity; immediately pull the profile,
    // recent media and available insights for the first dashboard view.
    await syncInstagramAccount(socialAccount.id, accessToken);

    return NextResponse.redirect(new URL("/dashboard?instagram=connected&synced=1", req.url));
  } catch {
    return redirectToConnect(req, "connection_failed");
  }
}
