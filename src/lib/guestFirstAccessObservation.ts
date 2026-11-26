import type { OnlinePresencePlatform } from "./onlinePresence";
import type { PublicEnvironment } from "./stagingSafety";
import { normalizeCountryCode, isIsoCountryCode, countryCodeToCountryName } from "./geo/context";
import { sessionDeviceObservation } from "./sessionDeviceObservation";
import { safeGuestDeviceDescription } from "./guestAccessObservation";

/** Isolated staging trial only; never enable without the documented review. */
export function guestFirstAccessPreviewEnabled(environment: PublicEnvironment) {
  return environment === "staging" && process.env.GUEST_FIRST_ACCESS_PREVIEW === "true";
}
export type GuestAccessObservation = {
  countryCode: string | null; deviceLabel: string | null; browser: string | null; os: string | null;
};
export function guestFirstAccessObservation(request: Request, platform: OnlinePresencePlatform, trustedEdge = false): GuestAccessObservation {
  const code = trustedEdge ? normalizeCountryCode(request.headers.get("cf-ipcountry")) : undefined;
  const native = platform === "ios" || platform === "android";
  const device = native || Boolean(request.headers.get("user-agent")?.trim())
    ? sessionDeviceObservation(request, platform, false) : null;
  return {
    countryCode: code && isIsoCountryCode(code) ? code : null,
    deviceLabel: safeGuestDeviceDescription(device?.deviceLabel, "deviceLabel"),
    browser: safeGuestDeviceDescription(device?.browser, "browser"),
    os: safeGuestDeviceDescription(device?.os, "os"),
  };
}
export type LiveGuestAccess = GuestAccessObservation & { reference: string; firstSeenAt: string };
export function safeLiveGuestAccess(value: LiveGuestAccess | null | undefined, lastSeenAt: Date): LiveGuestAccess | null {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value.reference)) return null;
  const first = new Date(value.firstSeenAt);
  if (!Number.isFinite(+first) || !Number.isFinite(+lastSeenAt) || +first > +lastSeenAt ||
      first.toISOString() !== value.firstSeenAt) return null;
  const code = normalizeCountryCode(value.countryCode);
  return { reference:value.reference, firstSeenAt:first.toISOString(),
    countryCode:code && isIsoCountryCode(code) ? code : null,
    deviceLabel:safeGuestDeviceDescription(value.deviceLabel,"deviceLabel"),
    browser:safeGuestDeviceDescription(value.browser,"browser"),
    os:safeGuestDeviceDescription(value.os,"os") };
}
export function liveGuestCountryName(code: string | null | undefined) {
  const normalized = normalizeCountryCode(code);
  return normalized && isIsoCountryCode(normalized) ? countryCodeToCountryName(normalized) ?? null : null;
}
