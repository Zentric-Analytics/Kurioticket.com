import { getMobileSession } from "@/lib/mobile-auth";
import { readOperationalSearchSession, type PreparedOperationalSession } from "@/lib/operationalSearchSession";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { isNativeVisitorRequest, matchesBrowserActivityConfirmation, readVisitorToken, visitorTrackingDenied } from "@/lib/visitor-identity";
import { resolveApplicationSource, type ApplicationAttribution } from "@/lib/application-source";

type IdentityDependencies = {
  web: () => Promise<{ userId: string } | null>;
  mobile: (request: Request) => Promise<{ user: { id: string; status: string }; platform?: string | null; appVersion?: string | null } | null>;
  visitor: (token: string | null, userId: string | null) => Promise<string | null>;
};

const dependencies: IdentityDependencies = {
  web: resolveOptionalWebApiSession,
  mobile: getMobileSession,
  visitor: async (token, userId) => {
    const { resolveConsentedVisitorId } = await import("@/services/visitorIdentityService");
    return resolveConsentedVisitorId(token, userId);
  },
};

function declaresSearchCrawler(request: Request): boolean {
  const agent = request.headers.get("user-agent") ?? "";
  return /\b(?:[a-z0-9_-]*(?:bot|crawler|spider)|GoogleOther|Google-InspectionTool|Mediapartners-Google|facebookexternalhit|Slurp|ia_archiver|ChatGPT-User|Perplexity-User|Claude-User)\b/i.test(agent);
}

/** Optional attribution only. Call after the response; never trust client user IDs. */
export async function resolveRequestActivityIdentity(
  request: Request,
  resolve: IdentityDependencies = dependencies,
  operationalSession?: PreparedOperationalSession | null,
  options?: { requireBrowserConfirmation: true },
): Promise<{ userId: string | null; visitorId: string | null } & ApplicationAttribution> {
  let userId: string | null = null;
  let application = resolveApplicationSource(request);
  try {
    if (isNativeVisitorRequest(request)) {
      const session = await resolve.mobile(request);
      if (session?.user.status === "ACTIVE") { userId = session.user.id; application = resolveApplicationSource(request, { client: "MOBILE", platform: session.platform, appVersion: session.appVersion }); }
      else {
        // A revoked bearer is not an account identity. A previously signed,
        // platform-bound operational credential may still establish the native
        // search transport, but cannot authenticate the caller or a visitor.
        // A NEW credential is eligible only for an unauthenticated guest search:
        // an invalid bearer must never bootstrap platform attribution.
        const hasBearer = request.headers.has("authorization");
        const reference = operationalSession === undefined
          ? readOperationalSearchSession(request)
          : operationalSession?.transport === "native" && operationalSession.guestNativeAttribution
            && (!hasBearer || !operationalSession.newCredential)
            ? operationalSession.reference : null;
        const declared = request.headers.get("x-mobile-platform");
        if (reference?.nativePlatform && reference.nativePlatform === declared) {
          application = { applicationSource: reference.nativePlatform === "ios" ? "IOS" : "ANDROID" };
        }
      }
    } else {
      userId = (await resolve.web())?.userId ?? null;
      if (userId) application = resolveApplicationSource(request, { client: "WEB" });
      else if (operationalSession?.transport === "web" && !operationalSession.newCredential
        && !request.headers.has("authorization") && !request.headers.has("x-mobile-platform")) {
        // Only previously signed, server-verified web continuity proves website
        // origin when a browser omits Sec-Fetch-Site. A caller can forge Origin
        // on its FIRST request; newly minted sessions confer no attribution.
        // This does not create visitor consent or authenticate an account.
        application = { applicationSource: "WEB" };
      }
    }
  } catch {
    // A failed session lookup cannot establish ownership of this activity.
    return { userId: null, visitorId: null, applicationSource: "UNKNOWN" };
  }

  // Search clients can send browser headers or carry a valid guest session.
  // A crawler declaration excludes platform credit but never grants authorization
  // or counts as a verified crawler block.
  if (operationalSession !== undefined && declaresSearchCrawler(request)) {
    application = { applicationSource: "UNKNOWN" };
  }

  let visitorId: string | null = null;
  if (visitorTrackingDenied(request)) return { userId, visitorId, ...application };
  if (options?.requireBrowserConfirmation && !matchesBrowserActivityConfirmation(request, userId)) {
    return { userId, visitorId, ...application };
  }
  try {
    visitorId = await resolve.visitor(readVisitorToken(request), userId);
  } catch {
    // Visitor attribution is optional; retain an independently verified user.
  }
  return { userId, visitorId, ...application };
}

/** Optional browser observations bind to the confirmed account and Visitor
 * before any Visitor lookup or activity timestamp update. */
export function resolveObservedActivityIdentity(request: Request, resolve: IdentityDependencies = dependencies) {
  return resolveRequestActivityIdentity(request, resolve, undefined, { requireBrowserConfirmation: true });
}
