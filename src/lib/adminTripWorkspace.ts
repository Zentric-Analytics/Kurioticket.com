import {
  parseAdminTripFilters,
  type AdminTripFilters,
  type AdminTripProduct,
  type AdminTripStatus,
} from "./adminConfirmedTripsDirectory";
import { adminLocalDate } from "./adminLocalTime";
import { adminRollingRange } from "./adminReportingRanges";

/** Today uses the reporting calendar. Rolling periods preserve elapsed duration. */
export const adminTripWorkspaceRanges = ["24h", "all", "today", "7d", "30d", "custom"] as const;
export type AdminTripWorkspaceRange = (typeof adminTripWorkspaceRanges)[number];

type RawQuery = Record<string, string | string[] | undefined>;
type Resolved =
  | { ok: true; range: AdminTripWorkspaceRange; filters: AdminTripFilters; dateFields: { from: string; to: string } }
  | { ok: false; error: string };

/**
 * The same normalized filters drive the summary and the matching records.
 * Reuse an anchored rolling window only when its elapsed duration matches the selected range.
 */
export function parseAdminTripWorkspace(raw: RawQuery, now = new Date(), timeZone = "UTC"): Resolved {
  if (Array.isArray(raw.range)) return { ok: false, error: "Repeated trip time ranges are not supported." };
  if (Array.isArray(raw.from) || Array.isArray(raw.to)) return { ok: false, error: "Repeated trip dates are not supported." };
  const requested = raw.range || "";
  if (typeof requested !== "string" || (requested && !adminTripWorkspaceRanges.includes(requested as AdminTripWorkspaceRange))) {
    return { ok: false, error: "Unsupported trip time range." };
  }
  if (!Number.isFinite(now.getTime())) return { ok: false, error: "Invalid time reference." };
  const range: AdminTripWorkspaceRange = (requested || (raw.from || raw.to ? "custom" : "today")) as AdminTripWorkspaceRange;
  const dateFields = {
    from: typeof raw.from === "string" && range === "custom" ? raw.from : "",
    to: typeof raw.to === "string" && range === "custom" ? raw.to : "",
  };
  const day = adminLocalDate(now, timeZone);
  const rolling = range === "24h" || range === "7d" || range === "30d"
    ? adminRollingRange(range, now, timeZone) : null;
  // A signed/paginated URL can preserve exact interval instants, rather than
  // recalculating them while a user navigates records.
  const preserved = rolling && typeof raw.from === "string" && typeof raw.to === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(raw.from) && /^\d{4}-\d{2}-\d{2}T/.test(raw.to) &&
    Date.parse(raw.to) <= now.getTime() &&
    Date.parse(raw.to) - Date.parse(raw.from) === Date.parse(rolling.to) - Date.parse(rolling.from);
  const from = range === "today" ? day
    : rolling ? preserved ? raw.from as string : rolling.from
      : dateFields.from;
  const to = range === "today" ? day
    : rolling ? preserved ? raw.to as string : rolling.to : dateFields.to;
  const parsed = parseAdminTripFilters({ ...raw, from, to }, timeZone);
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
  if (filters.identity !== "all") params.set("identity", filters.identity);
  if (range !== "all") params.set("range", range);
  if (filters.from && range !== "all" && range !== "today") params.set("from", filters.from);
  if (filters.to && range !== "all" && range !== "today") params.set("to", filters.to);
  const query = params.toString();
  return "/admin/confirmed-trips" + (query ? "?" + query : "") + "#trip-directory";
}
