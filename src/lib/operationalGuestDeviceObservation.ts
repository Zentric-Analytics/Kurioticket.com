import type { ApplicationAttribution } from "./application-source";
import { safeGuestDeviceDescription } from "./guestAccessObservation";
import { sessionDeviceObservation } from "./sessionDeviceObservation";
import { getPublicEnvironment, type PublicEnvironment } from "./stagingSafety";

type GuestIdentity = ApplicationAttribution & { userId?: string | null; visitorId?: string | null };
export type OperationalGuestDeviceObservation = {
  version: 1;
  platform: "desktop" | "mobile" | "ios" | "android";
  deviceLabel: string | null;
  browser: string | null;
  os: string | null;
};

/** A coarse description of this existing search/handoff request, after its
 * application source and operational session have been server-validated.
 * No optional page event, raw agent, hardware model, new ID or cookie is added.
 * Unknown transport stays unknown; native apps never acquire a browser label. */
export function operationalGuestDeviceObservation(
  request: Request, identity: GuestIdentity, operationalSessionId: unknown,
  environment: PublicEnvironment = getPublicEnvironment(),
): OperationalGuestDeviceObservation | undefined {
  if (environment !== "staging" || identity.userId || identity.visitorId ||
    typeof operationalSessionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(operationalSessionId)) return undefined;
  const source = identity.applicationSource;
  const agent = (request.headers.get("user-agent") ?? "").slice(0, 512);
  const platform = source === "IOS" ? "ios" : source === "ANDROID" ? "android"
    : source !== "WEB" ? null
    : request.headers.get("sec-ch-ua-mobile") === "?1" || /Mobile|Android|iPhone|iPad|iPod/i.test(agent) ? "mobile"
    : /Windows|Macintosh|Mac OS X|X11|Linux/i.test(agent) ? "desktop" : null;
  if (!platform) return undefined;
  const observed = sessionDeviceObservation(request,
    platform === "desktop" ? "desktop_web" : platform === "mobile" ? "mobile_web" : platform, false);
  return { version: 1, platform,
    deviceLabel: safeGuestDeviceDescription(observed.deviceLabel, "deviceLabel"),
    browser: safeGuestDeviceDescription(observed.browser, "browser"),
    os: safeGuestDeviceDescription(observed.os, "os") };
}

/** Called at the existing post-response history write, after identity resolves. */
export function withOperationalGuestDevice<T extends GuestIdentity & { query: Record<string, unknown> }>(request: Request, input: T): T {
  const guestAccess = operationalGuestDeviceObservation(request, input, input.query.operationalSessionId);
  return guestAccess ? { ...input, query: { ...input.query, guestAccess } } : input;
}
