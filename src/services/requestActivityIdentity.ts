import { getMobileSession } from "@/lib/mobile-auth";
import { readOperationalSearchSession, type PreparedOperationalSession } from "@/lib/operationalSearchSession";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { isNativeVisitorRequest, readVisitorToken, visitorTrackingDenied } from "@/lib/visitor-identity";
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

/** Optional attribution only. Call after the response; never trust client user IDs. */
export async function resolveRequestActivityIdentity(
  request: Request,
  resolve: IdentityDependencies = dependencies,
  operationalSession?: PreparedOperationalSession | null,
): Promise<{ userId: string | null; visitorId: string | null } & ApplicationAttribution> {
  let userId: string | null = null;
  let application = resolveApplicationSource(request);
  try {
    if (isNativeVisitorRequest(request)) {
      const session = await resolve.mobile(request);
      if (session?.user.status === "ACTIVE") { userId = session.user.id; application = resolveApplicationSource(request, { client: "MOBILE", platform: session.platform, appVersion: session.appVersion }); }
      else if (!request.headers.has("authorization")) {
        // Guest operational attribution is not visitor analytics or mobile authentication.
        // Only accept server-signed, platform-bound continuity (or the credential
        // prepared by this very search). Never trust the platform header alone.
        const reference = operationalSession === undefined
          ? readOperationalSearchSession(request)
          : operationalSession?.transport === "native" && operationalSession.guestNativeAttribution
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

  let visitorId: string | null = null;
  if (visitorTrackingDenied(request)) return { userId, visitorId, ...application };
  try {
    visitorId = await resolve.visitor(readVisitorToken(request), userId);
  } catch {
    // Visitor attribution is optional; retain an independently verified user.
  }
  return { userId, visitorId, ...application };
}
