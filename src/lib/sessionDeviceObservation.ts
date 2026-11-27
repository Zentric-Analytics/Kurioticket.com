import type { OnlinePresencePlatform } from "./onlinePresence";
import { countryCodeToCountryName, normalizeCountryCode, isIsoCountryCode } from "./geo/context";

/** A minimal, non-identifying description. Never persist raw user agents or IPs here. */
export type SessionDeviceObservation = {
  deviceLabel: string | null;
  browser: string | null;
  os: string | null;
  locationLabel: string | null;
};

const parseVersion = (agent: string, pattern: RegExp, name: string) => {
  const match = pattern.exec(agent);
  return match ? name + " " + match[1].replaceAll("_", ".").split(".")[0] : null;
};

function browserName(agent: string) {
  return parseVersion(agent, /Edg(?:e|A|iOS)?\/([\d.]+)/, "Edge")
    ?? parseVersion(agent, /(?:FxiOS|Firefox)\/([\d.]+)/, "Firefox")
    ?? parseVersion(agent, /OPR\/([\d.]+)/, "Opera")
    ?? parseVersion(agent, /SamsungBrowser\/([\d.]+)/, "Samsung Internet")
    ?? parseVersion(agent, /(?:CriOS|Chrome)\/([\d.]+)/, "Chrome")
    ?? (/Safari\//.test(agent) ? parseVersion(agent, /Version\/([\d.]+)/, "Safari") : null);
}

function operatingSystem(agent: string) {
  if (/Android/i.test(agent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(agent)) return "iOS";
  if (/Windows/i.test(agent)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(agent)) return "macOS";
  if (/Linux/i.test(agent)) return "Linux";
  return null;
}

function deviceCategory(agent: string, platform: OnlinePresencePlatform) {
  if (/iPad/i.test(agent)) return "iPad";
  if (/iPhone/i.test(agent)) return "iPhone";
  if (/Android/i.test(agent)) return /Mobile/i.test(agent) ? "Android phone" : "Android device";
  if (/Windows/i.test(agent)) return "Windows computer";
  if (/Macintosh/i.test(agent)) return "Mac";
  if (/Linux/i.test(agent)) return "Linux computer";
  return platform === "mobile_web" ? "Mobile device" : "Desktop device";
}

/**
 * Country/city come ONLY from the deployment's verified edge headers.
 * Never turn the customer's travel destination, locale, or profile address
 * into an access location. Cloudflare location is always an estimate.
 */
function estimatedLocation(headers: Headers, trustedEdge: boolean) {
  if (!trustedEdge) return null;
  const code = normalizeCountryCode(headers.get("cf-ipcountry"));
  const country = code ? countryCodeToCountryName(code) : null;
  if (!country || !isIsoCountryCode(code)) return null;
  const rawCity = headers.get("cf-ipcity")?.trim() ?? "";
  const city = rawCity.length >= 2 && rawCity.length <= 64
    && /^[\p{L}\p{M} .'-]+$/u.test(rawCity) ? rawCity : null;
  return city ? city + ", " + country : country;
}

/** Consume only after authenticated presence validation or an independently consent-checked guest observation. */
export function sessionDeviceObservation(
  request: Request, platform: OnlinePresencePlatform,
  trustedEdge = process.env.RENDER === "true",
): SessionDeviceObservation {
  const native = platform === "ios" || platform === "android";
  const agent = (request.headers.get("user-agent") ?? "").slice(0, 512);
  return {
    deviceLabel: native ? platform === "ios" ? "iOS device" : "Android device"
      : deviceCategory(agent, platform),
    browser: native ? null : browserName(agent),
    os: native ? platform === "ios" ? "iOS" : "Android" : operatingSystem(agent),
    locationLabel: estimatedLocation(request.headers, trustedEdge),
  };
}
