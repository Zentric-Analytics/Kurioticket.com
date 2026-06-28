import { createHash } from "crypto";
import { getPrisma } from "@/lib/prisma";

type RequestLike = Request & { cookies?: { get?: (name: string) => { value?: string } | undefined } };

const RECENT_SESSION_LIMIT = 12;
const ACTIVITY_UPDATE_INTERVAL_MS = 60 * 1000;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getHeader(request: Request, name: string) {
  return request.headers.get(name) || "";
}

function getCookieValue(request: RequestLike, name: string) {
  return request.cookies?.get?.(name)?.value;
}

export function getSessionTokenHash(request: RequestLike) {
  const token =
    getCookieValue(request, "__Secure-next-auth.session-token") ||
    getCookieValue(request, "next-auth.session-token") ||
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("__Secure-next-auth.session-token=") || part.startsWith("next-auth.session-token="))
      ?.split("=")
      .slice(1)
      .join("=");

  return token ? sha256(decodeURIComponent(token)) : null;
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

  const os = ua.includes("iphone") || ua.includes("ipad")
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

  const deviceLabel = ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")
    ? "Mobile device"
    : ua.includes("ipad") || ua.includes("tablet")
      ? "Tablet"
      : "Computer";

  return { browser, os, deviceLabel };
}

export async function touchUserSessionActivity({ userId, request }: { userId: string; request: RequestLike }) {
  const sessionTokenHash = getSessionTokenHash(request);
  if (!sessionTokenHash) return null;

  const userAgent = getHeader(request, "user-agent").slice(0, 500) || null;
  const { browser, os, deviceLabel } = parseUserAgent(userAgent || "");
  const maskedIp = maskIp(getClientIp(request));
  const now = new Date();

  const existing = await getPrisma().userSessionActivity.findFirst({
    where: { userId, sessionTokenHash },
    select: { id: true, lastSeenAt: true, revokedAt: true },
  });

  if (existing) {
    if (now.getTime() - existing.lastSeenAt.getTime() < ACTIVITY_UPDATE_INTERVAL_MS && !existing.revokedAt) {
      return existing.id;
    }

    const updated = await getPrisma().userSessionActivity.update({
      where: { id: existing.id },
      data: {
        userAgent,
        maskedIp,
        deviceLabel,
        browser,
        os,
        lastSeenAt: now,
        revokedAt: null,
      },
      select: { id: true },
    });

    return updated.id;
  }

  const created = await getPrisma().userSessionActivity.create({
    data: {
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

  return created.id;
}

export async function listUserSessionActivities({ userId, request }: { userId: string; request: RequestLike }) {
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
    },
  });

  return {
    currentActivityId,
    sessions: sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentActivityId,
      lastSeenAt: session.lastSeenAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() || null,
    })),
  };
}
