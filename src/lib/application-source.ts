import { isSameOriginRequest } from "@/lib/visitor-identity";

export const applicationSources = ["WEB", "IOS", "ANDROID", "BOT", "UNKNOWN"] as const;
export type ApplicationSource = typeof applicationSources[number];
export type ApplicationAttribution = { applicationSource?: ApplicationSource; appVersion?: string };
type ValidatedSession = { client: "WEB" | "MOBILE"; platform?: string | null; appVersion?: string | null };
export function validatedAppVersion(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= 32 && /^[0-9A-Za-z][0-9A-Za-z.+_-]*$/.test(value) ? value : undefined;
}
/** Attribution is not authorization or device attestation. Native OS is a
 * validated-session-bound declaration, never a fresh arbitrary request header. */
export function resolveApplicationSource(request: Request, session?: ValidatedSession | null): ApplicationAttribution & { applicationSource: ApplicationSource } {
  if (session?.client === "MOBILE") {
    const browserTransport = ["origin", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest"].some(name => request.headers.has(name));
    if (browserTransport) return { applicationSource: "UNKNOWN" };
    const applicationSource = session.platform === "ios" ? "IOS" : session.platform === "android" ? "ANDROID" : "UNKNOWN";
    const appVersion = validatedAppVersion(session.appVersion);
    return { applicationSource, ...(appVersion ? { appVersion } : {}) };
  }
  if (request.headers.has("authorization") || request.headers.has("x-mobile-platform")) return { applicationSource: "UNKNOWN" };
  const browser = request.headers.get("sec-fetch-site") === "same-origin" && isSameOriginRequest(request);
  return { applicationSource: session?.client === "WEB" || browser ? "WEB" : "UNKNOWN" };
}
/** BOT is assigned only by server-side verified-crawler search handlers; never infer it or an OS from user-agent. Historical absent/invalid source stays UNKNOWN. */
export function applicationMetadata(value: ApplicationAttribution = {}): { applicationSource: ApplicationSource; appVersion?: string } {
  const applicationSource = applicationSources.includes(value.applicationSource as ApplicationSource) ? value.applicationSource! : "UNKNOWN";
  const appVersion = validatedAppVersion(value.appVersion);
  return { applicationSource, ...(appVersion ? { appVersion } : {}) };
}
