import {
  parseAdminTripFilters,
  type AdminTripFilters,
  type AdminTripProduct,
  type AdminTripStatus,
} from "./adminConfirmedTripsDirectory";

/** Date windows use UTC calendar days, not rolling 24-hour intervals. */
export const adminTripWorkspaceRanges = ["all", "today", "7d", "30d", "custom"] as const;
export type AdminTripWorkspaceRange = (typeof adminTripWorkspaceRanges)[number];

type RawQuery = Record<string, string | string[] | undefined>;
type Resolved =
  | { ok: true; range: AdminTripWorkspaceRange; filters: AdminTripFilters; dateFields: { from: string; to: string } }
  | { ok: false; error: string };

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function calendarStart(now: Date, count: number): string {
  const beginning = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  beginning.setUTCDate(beginning.getUTCDate() - (count - 1));
  return utcDay(beginning);
}

/**
 * The same normalized filters drive the summary and the matching records.
 * Never accept a future-dated/invalid range or silently reinterpret minute-precise windows.
 */
export function parseAdminTripWorkspace(raw: RawQuery, now = new Date()): Resolved {
  if (Array.isArray(raw.range)) return { ok: false, error: "Repeated trip time ranges are not supported." };
  const requested = raw.range || "";
  if (typeof requested !== "string" || (requested && !adminTripWorkspaceRanges.includes(requested as AdminTripWorkspaceRange))) {
    return { ok: false, error: "Unsupported trip time range." };
  }
  if (!Number.isFinite(now.getTime())) return { ok: false, error: "Invalid time reference." };
  const range: AdminTripWorkspaceRange = (requested || (raw.from || raw.to ? "custom" : "all")) as AdminTripWorkspaceRange;
  const dateFields = {
    from: typeof raw.from === "string" && range === "custom" ? raw.from : "",
    to: typeof raw.to === "string" && range === "custom" ? raw.to : "",
  };
  const day = utcDay(now);
  const from = range === "today" ? day : range === "7d" ? calendarStart(now, 7) : range === "30d" ? calendarStart(now, 30) : dateFields.from;
  const to = range === "today" || range === "7d" || range === "30d" ? day : dateFields.to;
  const parsed = parseAdminTripFilters({ ...raw, from, to });
  return parsed.ok
    ? { ok: true, range, filters: parsed.filters, dateFields }
    : { ok: false, error: parsed.error };
}

/** Keep the operator's scope when switching tabs or selecting a status counter. */
export function tripWorkspaceHref(
  filters: AdminTripFilters,
  range: AdminTripWorkspaceRange,
  overrides: { product?: AdminTripProduct; status?: AdminTripStatus } = {},
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.provider) params.set("provider", filters.provider);
  const product = overrides.product ?? filters.product;
  const status = overrides.status ?? filters.status;
  if (product !== "all") params.set("product", product);
  if (status !== "all") params.set("status", status);
  if (range !== "all") params.set("range", range);
  if (range === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  const query = params.toString();
  return "/admin/confirmed-trips" + (query ? "?" + query : "") + "#trip-directory";
}
