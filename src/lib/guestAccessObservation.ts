import { pageViewDevicePlatform } from "./adminDevicePlatform";
import { sessionDeviceObservation } from "./sessionDeviceObservation";
import { countryCodeToCountryName, countryNameToCountryCode, isIsoCountryCode, normalizeCountryCode } from "./geo/context";

/** The caller must hold the existing consented, unlinked visitor row lock.
 * Only coarse fields already supported by the session observation helper;
 * never store a raw user agent, IP, unique device ID, or new cookie. */
export function consentedGuestAccessObservation(request: Request, platform: string, transport: "web" | "native", trustedEdge = process.env.RENDER === "true") {
  const key = pageViewDevicePlatform(platform, transport);
  if (key === "web" || key === "native" || key === "unknown") return undefined;
  const source = key === "desktop" ? "desktop_web" : key === "mobile" ? "mobile_web" : key;
  // Without a real browser header do not fabricate a browser/device description.
  if (transport === "web" && !request.headers.get("user-agent")) return undefined;
  const observed = sessionDeviceObservation(request, source, trustedEdge);
  return { version: 1, deviceLabel: observed.deviceLabel, browser: observed.browser, os: observed.os,
    locationLabel: observed.locationLabel };
}

/** Read only bounded, allowlisted descriptions, never arbitrary JSON. */
export function safeGuestDeviceDescription(value: unknown, field: "deviceLabel" | "browser" | "os" | "locationLabel"): string | null {
  if (typeof value !== "string" || value.length > 100) return null;
  if (field === "deviceLabel") return /^(?:Mobile device|Desktop device|iOS device|Android device|Android phone|iPad|iPhone|Windows computer|Mac|Linux computer)$/.test(value) ? value : null;
  if (field === "browser") return /^(?:Edge|Firefox|Chrome|Opera|Safari|Samsung Internet) \d{1,6}$/.test(value) ? value : null;
  if (field === "os") return /^(?:Android|iOS|Windows|macOS|Linux)$/.test(value) ? value : null;
  return /^[\p{L}\p{M} .,'’()&-]{2,100}$/u.test(value) ? value : null;
}

/** Project only the country from this exact existing search observation.
 * Never link temporary presence or borrow locations from other records. */
export function recordedGuestAccessLocation(row: {
  guestSource?: string | null;
  evidence?: string | null;
  locationLabel?: unknown;
  recordedCountryCode?: unknown;
}): string | null {
  if (row.guestSource === "consented" && row.evidence === "page") {
    const label = safeGuestDeviceDescription(row.locationLabel, "locationLabel");
    if (!label) return null;
    // Page observations are saved as a country or "city, country". Reject
    // arbitrary descriptions and unknown country codes rather than guessing.
    const country = countryNameToCountryCode(label) ?? countryNameToCountryCode(label.split(", ").at(-1));
    return isIsoCountryCode(country) ? label : null;
  }
  if (row.guestSource !== "operational" || row.evidence !== "search" ||
      typeof row.recordedCountryCode !== "string") return null;
  const code = normalizeCountryCode(row.recordedCountryCode);
  return code && isIsoCountryCode(code) ? countryCodeToCountryName(code) ?? null : null;
}

export type RecordedGuestLocation = { label: string; at: Date };

/** A historical location belongs to one actual access observation. Its date
 * must remain visible; never represent it as the current heartbeat country. */
export function recordedGuestLocationSummary(
  row: Parameters<typeof recordedGuestAccessLocation>[0] & { at?: unknown },
  now: Date,
): RecordedGuestLocation | null {
  const label = recordedGuestAccessLocation(row);
  return label && row.at instanceof Date && Number.isFinite(+row.at) && +row.at <= +now
    ? { label, at: row.at } : null;
}
