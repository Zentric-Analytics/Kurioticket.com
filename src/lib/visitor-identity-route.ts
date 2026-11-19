import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoundedJsonBody } from "@/lib/bounded-json-body";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSameOriginRequest, readVisitorToken, visitorCookieName, visitorCookieOptions, visitorTrackingDenied } from "@/lib/visitor-identity";
import type { createVisitorIdentityService } from "@/services/visitorIdentityCore";

const consentSchema = z.object({
  analytics: z.literal(true),
  policyVersion: z.string().trim().min(1).max(100).optional(),
}).strict();

type IdentityService = ReturnType<typeof createVisitorIdentityService>;
type Dependencies = {
  transport: "web" | "native";
  authenticate: (request: Request) => Promise<{ userId: string } | null>;
  identity: Pick<IdentityService, "registerAnalyticsVisitor" | "getAnalyticsVisitorStatus" | "mergeAnalyticsVisitor" | "withdrawAnalyticsConsent">;
  rateLimit?: typeof checkRateLimit;
};

/** Shared response boundary; web cookies and native tokens remain separate. */
export function createIdentityHandlers({ transport, authenticate, identity, rateLimit = checkRateLimit }: Dependencies) {
  const json = (body: unknown, status = 200) => NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization, X-Kt-Visitor" },
  });
  const unavailable = () => json({ error: "Visitor tracking is temporarily unavailable. Please try again." }, 503);
  const originError = (request: Request) => !isSameOriginRequest(request) ? json({ error: "Invalid request origin." }, 403) : null;

  function limited(request: Request, operation: string, limit: number) {
    const rate = rateLimit(`visitor-${operation}:${transport}:${getClientIp(request)}`, limit, 60_000);
    if (rate.allowed) return null;
    const response = json({ error: "Too many requests. Please try again shortly." }, 429);
    response.headers.set("Retry-After", String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))));
    return response;
  }

  async function GET(request: Request) {
    const denied = originError(request);
    if (denied) return denied;
    if (visitorTrackingDenied(request, transport)) return json({ analyticsTracking: "disabled", linked: false });
    try {
      const token = readVisitorToken(request, transport);
      if (!token) return json({ analyticsTracking: "disabled", linked: false });
      const account = await authenticate(request);
      return json(await identity.getAnalyticsVisitorStatus(token, account?.userId ?? null));
    } catch {
      return unavailable();
    }
  }

  async function POST(request: Request) {
    const denied = originError(request) ?? limited(request, "consent", 10);
    if (denied) return denied;
    const parsed = consentSchema.safeParse(await readBoundedJsonBody(request, 2048).catch(() => null));
    if (!parsed.success) return json({ error: "Analytics consent is required to enable visitor tracking." }, 400);
    try {
      const account = await authenticate(request);
      const visitor = await identity.registerAnalyticsVisitor({
        token: readVisitorToken(request, transport),
        userId: account?.userId ?? null,
        policyVersion: parsed.data.policyVersion,
      });
      const response = json({ analyticsTracking: "enabled", ...(transport === "native" ? { visitorToken: visitor.token } : {}) }, visitor.created ? 201 : 200);
      if (transport === "web") response.cookies.set(visitorCookieName, visitor.token, visitorCookieOptions());
      return response;
    } catch {
      return unavailable();
    }
  }

  async function DELETE(request: Request) {
    const denied = originError(request);
    if (denied) return denied;
    try {
      // Keep the credential on failure so the client can retry durable withdrawal.
      if (!(await identity.withdrawAnalyticsConsent(readVisitorToken(request, transport)))) return unavailable();
      const response = json({ analyticsTracking: "disabled" });
      if (transport === "web") response.cookies.set(visitorCookieName, "", { ...visitorCookieOptions(), maxAge: 0 });
      return response;
    } catch {
      return unavailable();
    }
  }

  async function MERGE(request: Request) {
    const denied = originError(request) ?? limited(request, "merge", 30);
    if (denied) return denied;
    if (visitorTrackingDenied(request, transport)) return json({ merged: false });
    try {
      const account = await authenticate(request);
      if (!account) return json({ error: "Authentication required." }, 401);
      const visitor = await identity.mergeAnalyticsVisitor({ token: readVisitorToken(request, transport), userId: account.userId, source: "ACCOUNT_API" });
      const response = json({ merged: Boolean(visitor), ...(transport === "native" && visitor ? { visitorToken: visitor.token } : {}) });
      if (transport === "web" && visitor) response.cookies.set(visitorCookieName, visitor.token, visitorCookieOptions());
      return response;
    } catch {
      return unavailable();
    }
  }

  return { GET, POST, DELETE, MERGE };
}
