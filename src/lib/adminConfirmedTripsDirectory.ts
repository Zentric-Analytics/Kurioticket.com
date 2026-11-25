import { createHash } from "node:crypto";

import { adminStartOfLocalDay, shiftAdminCalendarDate, validViewerTimeZone } from "./adminLocalTime";
import type { PublicEnvironment } from "./stagingSafety";

export const ADMIN_CONFIRMED_TRIPS_PAGE_SIZE = 20;
export const adminTripProducts = ["all", "FLIGHT", "HOTEL", "CAR", "PACKAGE"] as const;
export const adminTripStatuses = ["all", "UPCOMING", "PAST", "CANCELLED"] as const;
export const adminTripIdentities = ["all", "registered"] as const;

export type AdminTripProduct = (typeof adminTripProducts)[number];
export type AdminTripStatus = (typeof adminTripStatuses)[number];
export type AdminTripIdentity = (typeof adminTripIdentities)[number];
export type AdminTripFilters = {
  q: string;
  provider: string;
  product: AdminTripProduct;
  status: AdminTripStatus;
  identity: AdminTripIdentity;
  from: string;
  to: string;
  reportingTimeZone?: string;
};

export type AdminTripCursor = { id: string; confirmedAt: string };
type RawQuery = Record<string, string | string[] | undefined>;
type ParseResult = { ok: true; filters: AdminTripFilters } | { ok: false; error: string };

const one = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
const unsafeText = /[\u0000-\u001f\u007f]/;
const validId = /^[a-z0-9_-]{6,100}$/i;
const calendarDayPattern = /^\d{4}-\d{2}-\d{2}$/;

function validUtcInstant(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function boundDate(value: string, upper: boolean, timeZone: string) {
  if (validUtcInstant(value)) return new Date(value);
  if (!calendarDayPattern.test(value)) return null;
  const day = upper ? shiftAdminCalendarDate(value, 1) : value;
  return day ? adminStartOfLocalDay(day, timeZone) : null;
}

/** Explicit instants remain anchored. Date-only bounds use the reporting calendar. */
export function parseAdminTripFilters(raw: RawQuery, timeZone = "UTC"): ParseResult {
  const keys = ["q", "provider", "product", "status", "identity", "from", "to", "cursor"];
  if (keys.some(key => Array.isArray(raw[key]))) {
    return { ok: false, error: "Repeated trip filters are not supported." };
  }
  const q = one(raw.q).trim();
  const provider = one(raw.provider).trim();
  const product = one(raw.product) || "all";
  const status = one(raw.status) || "all";
  const identity = one(raw.identity) || "all";
  const from = one(raw.from);
  const to = one(raw.to);
  if (q.length > 80 || provider.length > 100 || unsafeText.test(q) || unsafeText.test(provider)) {
    return { ok: false, error: "Search and provider filters must contain ordinary text within the allowed length." };
  }
  if (!adminTripProducts.includes(product as AdminTripProduct)
    || !adminTripStatuses.includes(status as AdminTripStatus)
    || !adminTripIdentities.includes(identity as AdminTripIdentity)) {
    return { ok: false, error: "Unsupported product, trip-status or identity filter." };
  }
  const reportingZone = validViewerTimeZone(timeZone) ?? "UTC";
  const start = from ? boundDate(from, false, reportingZone) : null;
  const end = to ? boundDate(to, true, reportingZone) : null;
  if ((from && !start) || (to && !end) || (start && end && start > end)
    || (calendarDayPattern.test(from) && calendarDayPattern.test(to) && from > to)) {
    return { ok: false, error: "Enter a valid trip date range." };
  }
  const reportingTimeZone = reportingZone !== "UTC" && (calendarDayPattern.test(from) || calendarDayPattern.test(to))
    ? { reportingTimeZone: reportingZone } : {};
  return { ok: true, filters: { q, provider, product: product as AdminTripProduct, status: status as AdminTripStatus, identity: identity as AdminTripIdentity, from, to, ...reportingTimeZone } };
}

export function tripConfirmationWindow(filters: AdminTripFilters) {
  const timeZone = filters.reportingTimeZone ?? "UTC";
  const start = filters.from ? boundDate(filters.from, false, timeZone) : null;
  const end = filters.to ? boundDate(filters.to, true, timeZone) : null;
  if ((filters.from && !start) || (filters.to && !end)) throw new RangeError("Invalid trip date range.");
  return {
    ...(start ? { gte: start } : {}),
    ...(end ? { lt: end } : {}),
  };
}

function cursorScope(filters: AdminTripFilters, environment: PublicEnvironment) {
  return createHash("sha256")
    .update(JSON.stringify([environment, filters.q, filters.provider, filters.product, filters.status, filters.identity, filters.from, filters.to,
      ...(filters.reportingTimeZone ? [filters.reportingTimeZone] : []),
    ]))
    .digest("hex")
    .slice(0, 24);
}

/** The cursor is a paging position, never an authorization token. */
export function encodeAdminTripCursor(
  row: AdminTripCursor,
  filters: AdminTripFilters,
  environment: PublicEnvironment,
) {
  return Buffer.from(JSON.stringify({
    v: 1,
    id: row.id,
    at: row.confirmedAt,
    scope: cursorScope(filters, environment),
  })).toString("base64url");
}

export function decodeAdminTripCursor(
  input: string | undefined,
  filters: AdminTripFilters,
  environment: PublicEnvironment,
): AdminTripCursor | undefined | null {
  if (input === undefined || input === "") return undefined;
  if (input.length > 900 || !/^[A-Za-z0-9_-]+$/.test(input)) return null;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(input, "base64url").toString("utf8"));
    if (!decoded || typeof decoded !== "object") return null;
    const value = decoded as { v?: unknown; id?: unknown; at?: unknown; scope?: unknown };
    if (value.v !== 1 || value.scope !== cursorScope(filters, environment)
      || typeof value.id !== "string" || !validId.test(value.id)
      || typeof value.at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.at)
      || !Number.isFinite(Date.parse(value.at)) || new Date(value.at).toISOString() !== value.at) return null;
    return { id: value.id, confirmedAt: value.at };
  } catch {
    return null;
  }
}

export function isValidAdminTripId(id: string) {
  return validId.test(id);
}

export function tripDirectoryHref(filters: AdminTripFilters, cursor?: string | null) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.product !== "all") params.set("product", filters.product);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.identity !== "all") params.set("identity", filters.identity);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (cursor) params.set("cursor", cursor);
  return "/admin/confirmed-trips/records" + (params.size ? "?" + params.toString() : "");
}

/** Flag stale-looking provider status without creating or modifying a trip. */
export function tripNeedsStatusReview(
  trip: { status: string; departureDate: Date | string },
  now: Date = new Date(),
) {
  const date = typeof trip.departureDate === "string" ? new Date(trip.departureDate) : trip.departureDate;
  return trip.status === "UPCOMING" && Number.isFinite(date.getTime()) && date.getTime() < now.getTime();
}
