import { createHash } from "node:crypto";

import type { PublicEnvironment } from "./stagingSafety";

export const ADMIN_CONFIRMED_TRIPS_PAGE_SIZE = 20;
export const adminTripProducts = ["all", "FLIGHT", "HOTEL", "CAR", "PACKAGE"] as const;
export const adminTripStatuses = ["all", "UPCOMING", "PAST", "CANCELLED"] as const;

export type AdminTripProduct = (typeof adminTripProducts)[number];
export type AdminTripStatus = (typeof adminTripStatuses)[number];
export type AdminTripFilters = {
  q: string;
  provider: string;
  product: AdminTripProduct;
  status: AdminTripStatus;
  from: string;
  to: string;
};

export type AdminTripCursor = { id: string; confirmedAt: string };
type RawQuery = Record<string, string | string[] | undefined>;
type ParseResult = { ok: true; filters: AdminTripFilters } | { ok: false; error: string };

const one = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
const unsafeText = /[\u0000-\u001f\u007f]/;
const validId = /^[a-z0-9_-]{6,100}$/i;

function validUtcDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

/** Input is untrusted: reject duplicate values, unknown enums and invalid UTC days. */
export function parseAdminTripFilters(raw: RawQuery): ParseResult {
  const keys = ["q", "provider", "product", "status", "from", "to", "cursor"];
  if (keys.some(key => Array.isArray(raw[key]))) {
    return { ok: false, error: "Repeated trip filters are not supported." };
  }
  const q = one(raw.q).trim();
  const provider = one(raw.provider).trim();
  const product = one(raw.product) || "all";
  const status = one(raw.status) || "all";
  const from = one(raw.from);
  const to = one(raw.to);
  if (q.length > 80 || provider.length > 100 || unsafeText.test(q) || unsafeText.test(provider)) {
    return { ok: false, error: "Search and provider filters must contain ordinary text within the allowed length." };
  }
  if (!adminTripProducts.includes(product as AdminTripProduct)
    || !adminTripStatuses.includes(status as AdminTripStatus)) {
    return { ok: false, error: "Unsupported product or trip-status filter." };
  }
  if ((from && !validUtcDay(from)) || (to && !validUtcDay(to)) || (from && to && from > to)) {
    return { ok: false, error: "Enter a valid UTC date range." };
  }
  return { ok: true, filters: { q, provider, product: product as AdminTripProduct, status: status as AdminTripStatus, from, to } };
}

export function tripConfirmationWindow(filters: AdminTripFilters) {
  return {
    ...(filters.from ? { gte: new Date(filters.from + "T00:00:00.000Z") } : {}),
    ...(filters.to ? { lt: new Date(new Date(filters.to + "T00:00:00.000Z").getTime() + 86_400_000) } : {}),
  };
}

function cursorScope(filters: AdminTripFilters, environment: PublicEnvironment) {
  return createHash("sha256")
    .update(JSON.stringify([environment, filters.q, filters.provider, filters.product, filters.status, filters.from, filters.to]))
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
