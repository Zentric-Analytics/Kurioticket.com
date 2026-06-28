import { createHash } from "crypto";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/env";
import { getPrisma } from "@/lib/prisma";

type RequestLike = Request & {
  cookies?: { get?: (name: string) => { value?: string } | undefined };
};

const RECENT_SESSION_LIMIT = 12;
const ACTIVITY_UPDATE_INTERVAL_MS = 60 * 1000;
const NEXT_AUTH_SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getHeader(request: Request, name: string) {
  return request.headers.get(name) || "";
}

function safeDecodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCookieHeader(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex);
      const value = part.slice(separatorIndex + 1);

      cookies[name] = value;
      return cookies;
    }, {});
}

function getCookieValue(request: RequestLike, name: string) {
  return request.cookies?.get?.(name)?.value;
}

function getSessionCookieValue(request: RequestLike) {
  const headerCookies = parseCookieHeader(request.headers.get("cookie") || "");

  for (const cookieName of NEXT_AUTH_SESSION_COOKIE_NAMES) {
    const directValue =
      getCookieValue(request, cookieName) || headerCookies[cookieName];

    if (directValue) {
      return safeDecodeCookieValue(directValue);
    }

    const chunks = Object.entries(headerCookies)
      .filter(([name]) => name.startsWith(`${cookieName}.`))
      .map(([name, value]) => ({
        index: Number(name.slice(cookieName.length + 1)),
        value,
      }))
      .filter((chunk) => Number.isInteger(chunk.index))
      .sort((a, b) => a.index - b.index);

    if (chunks.length) {
      return safeDecodeCookieValue(chunks.map((chunk) => chunk.value).join(""));
    }
  }

  return null;
}

export async function getSessionTokenHash(request: RequestLike) {
  const token = await getToken({
    req: request as Parameters<typeof getToken>[0]["req"],
    secret: getAuthSecret() || undefined,
  });

  if (typeof token?.sessionActivityId === "string" && token.sessionActivityId) {
    return sha256(`nextauth-session-activity:${token.sessionActivityId}`);
  }

  const sessionCookieValue = getSessionCookieValue(request);

  return sessionCookieValue ? sha256(sessionCookieValue) : null;
}

function getClientIp(request: Request) {
  const forwardedFor = getHeader(request, "x-forwarded-for")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)[0];

  return forwardedFor || getHeader(request, "x-real-ip") || null;
}

function maskIp(ip: string | null) {
  if (!ip) return null;

  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return parts.length ? `${parts.slice(0, 3).join(":")}:…` : null;
  }

  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  return null;
}

function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const browser = ua.includes("edg/")
    ? "Microsoft Edge"
    : ua.includes("chrome/") && !ua.includes("chromium")
      ? "Chrome"
      : ua.includes("safari/") && !ua.includes("chrome/")
        ? "Safari"
        : ua.includes("firefox/")
          ? "Firefox"
          : "Current browser";

  const os =
    ua.includes("iphone") || ua.includes("ipad")
      ? "iOS"
      : ua.includes("android")
        ? "Android"
        : ua.includes("mac os x") || ua.includes("macintosh")
          ? "macOS"
          : ua.includes("windows")
            ? "Windows"
            : ua.includes("linux")
              ? "Linux"
              : "This device";

  const deviceLabel =
    ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")
      ? "Mobile device"
      : ua.includes("ipad") || ua.includes("tablet")
        ? "Tablet"
        : "Computer";

  return { browser, os, deviceLabel };
}

export async function touchUserSessionActivity({
  userId,
  request,
}: {
  userId: string;
  request: RequestLike;
}) {
  const sessionTokenHash = await getSessionTokenHash(request);
  if (!sessionTokenHash) return null;

  const userAgent = getHeader(request, "user-agent").slice(0, 500) || null;
  const { browser, os, deviceLabel } = parseUserAgent(userAgent || "");
  const maskedIp = maskIp(getClientIp(request));
  const now = new Date();

  const existing = await getPrisma().userSessionActivity.findUnique({
    where: { userId_sessionTokenHash: { userId, sessionTokenHash } },
    select: { id: true, lastSeenAt: true, revokedAt: true },
  });

  if (
    existing &&
    now.getTime() - existing.lastSeenAt.getTime() <
      ACTIVITY_UPDATE_INTERVAL_MS &&
    !existing.revokedAt
  ) {
    return existing.id;
  }

  const activity = await getPrisma().userSessionActivity.upsert({
    where: { userId_sessionTokenHash: { userId, sessionTokenHash } },
    update: {
      userAgent,
      maskedIp,
      deviceLabel,
      browser,
      os,
      lastSeenAt: now,
      revokedAt: null,
    },
    create: {
      userId,
      sessionTokenHash,
      userAgent,
      maskedIp,
      deviceLabel,
      browser,
      os,
      lastSeenAt: now,
    },
    select: { id: true },
  });

  return activity.id;
}

export async function listUserSessionActivities({
  userId,
  request,
}: {
  userId: string;
  request: RequestLike;
}) {
  const currentActivityId = await touchUserSessionActivity({ userId, request });

  const sessions = await getPrisma().userSessionActivity.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
    take: RECENT_SESSION_LIMIT,
    select: {
      id: true,
      deviceLabel: true,
      browser: true,
      os: true,
      maskedIp: true,
      locationLabel: true,
      lastSeenAt: true,
      createdAt: true,
      revokedAt: true,
      sessionTokenHash: true,
      userAgent: true,
    },
  });

  const dedupedSessions = Array.from(
    sessions
      .reduce((uniqueSessions, session) => {
        const key =
          session.sessionTokenHash ||
          `${session.userAgent || "unknown"}:${session.browser}:${session.os}:${session.maskedIp || "unknown"}`;
        const existing = uniqueSessions.get(key);

        if (
          !existing ||
          session.id === currentActivityId ||
          (existing.id !== currentActivityId &&
            session.lastSeenAt > existing.lastSeenAt)
        ) {
          uniqueSessions.set(key, session);
        }

        return uniqueSessions;
      }, new Map<string, (typeof sessions)[number]>())
      .values(),
  ).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());

  return {
    currentActivityId,
    sessions: dedupedSessions.map((session) => ({
      id: session.id,
      deviceLabel: session.deviceLabel,
      browser: session.browser,
      os: session.os,
      maskedIp: session.maskedIp,
      locationLabel: session.locationLabel,
      isCurrent: session.id === currentActivityId,
      lastSeenAt: session.lastSeenAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() || null,
    })),
  };
}
