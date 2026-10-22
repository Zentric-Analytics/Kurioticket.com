import { createHash, randomBytes } from "node:crypto";
import { visitorDenialCookieName } from "@/lib/visitor-consent-constants";

export const visitorCookieName = "kt_visitor";
export const visitorHeaderName = "x-kt-visitor";
export const visitorCookieMaxAgeSeconds = 60 * 60 * 24 * 365;

const visitorTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function createVisitorToken() {
  return randomBytes(32).toString("base64url");
}

export function hashVisitorToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isVisitorToken(value: string | null | undefined): value is string {
  return Boolean(value && visitorTokenPattern.test(value));
}

export function isNativeVisitorRequest(request: Request) {
  const platform = request.headers.get("x-mobile-platform")?.trim().toLowerCase();
  return platform === "ios" || platform === "android" || request.headers.has("authorization");
}

/** Stop browser attribution immediately, retaining its credential for durable withdrawal retries. */
export function visitorTrackingDenied(request: Request, transport: "web" | "native" | "auto" = "auto") {
  if (transport === "native" || (transport === "auto" && isNativeVisitorRequest(request))) return false;
  return (request.headers.get("cookie") ?? "").split(";").some(item => {
    const separator = item.indexOf("=");
    return separator >= 0
      && item.slice(0, separator).trim() === visitorDenialCookieName
      && item.slice(separator + 1).trim() === "1";
  });
}

/** Native and browser identities must never fall back to each other's transport. */
export function readVisitorToken(request: Request, transport: "web" | "native" | "auto" = "auto") {
  if (transport === "native" || (transport === "auto" && isNativeVisitorRequest(request))) {
    const token = request.headers.get(visitorHeaderName)?.trim();
    return isVisitorToken(token) ? token : null;
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    const name = item.slice(0, separator).trim();
    if (name !== visitorCookieName) continue;
    const value = item.slice(separator + 1).trim();
    return isVisitorToken(value) ? value : null;
  }

  return null;
}

export function visitorCookieOptions() {
  return {
    httpOnly: true,
    maxAge: visitorCookieMaxAgeSeconds,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function isSameOriginRequest(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
