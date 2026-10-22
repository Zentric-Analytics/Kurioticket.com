import { getMobileSession } from "@/lib/mobile-auth";
import { resolveOptionalWebApiSession } from "@/lib/web-api-auth";
import { isNativeVisitorRequest, readVisitorToken, visitorTrackingDenied } from "@/lib/visitor-identity";

type IdentityDependencies = {
  web: () => Promise<{ userId: string } | null>;
  mobile: (request: Request) => Promise<{ user: { id: string; status: string } } | null>;
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
) {
  let userId: string | null = null;
  try {
    if (isNativeVisitorRequest(request)) {
      const session = await resolve.mobile(request);
      if (session?.user.status === "ACTIVE") userId = session.user.id;
    } else {
      userId = (await resolve.web())?.userId ?? null;
    }
  } catch {
    // A failed session lookup cannot establish ownership of this activity.
    return { userId: null, visitorId: null };
  }

  let visitorId: string | null = null;
  if (visitorTrackingDenied(request)) return { userId, visitorId };
  try {
    visitorId = await resolve.visitor(readVisitorToken(request), userId);
  } catch {
    // Visitor attribution is optional; retain an independently verified user.
  }
  return { userId, visitorId };
}
