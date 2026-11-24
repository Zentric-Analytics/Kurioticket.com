import { pageViewDevicePlatform } from "./adminDevicePlatform";
import { sessionDeviceObservation } from "./sessionDeviceObservation";

/** The caller must hold the existing consented, unlinked visitor row lock.
 * Only coarse fields already supported by the session observation helper;
 * never store a raw user agent, IP, unique device ID, or new cookie. */
export function consentedGuestAccessObservation(request: Request, platform: string, transport: "web" | "native") {
  const key = pageViewDevicePlatform(platform, transport);
  if (key === "web" || key === "native" || key === "unknown") return undefined;
  const source = key === "desktop" ? "desktop_web" : key === "mobile" ? "mobile_web" : key;
  // Without a real browser header do not fabricate a browser/device description.
  if (transport === "web" && !request.headers.get("user-agent")) return undefined;
  const observed = sessionDeviceObservation(request, source);
  return { version: 1, deviceLabel: observed.deviceLabel, browser: observed.browser, os: observed.os,
    locationLabel: observed.locationLabel };
}

/** Read only bounded, allowlisted descriptions, never arbitrary JSON. */
export function safeGuestDeviceDescription(value: unknown, field: "deviceLabel" | "browser" | "os" | "locationLabel"): string | null {
  if (typeof value !== "string" || value.length > 100) return null;
  if (field === "deviceLabel") return /^(?:Mobile device|Desktop device|iOS device|Android device|Android phone|iPad|iPhone|Windows computer|Mac|Linux computer)$/.test(value) ? value : null;
  if (field === "browser") return /^(?:Edge|Firefox|Chrome|Opera|Safari) \d{1,6}$/.test(value) ? value : null;
  if (field === "os") return /^(?:Android|iOS|Windows|macOS|Linux)$/.test(value) ? value : null;
  return /^[\p{L}\p{M} .,'()-]{2,100}$/u.test(value) ? value : null;
}
