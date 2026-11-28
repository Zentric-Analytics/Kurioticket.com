import { z } from "zod";
import { adminReportingWindowExceedsLimit } from "@/lib/adminReportingRanges";
import type { JourneySearchEditField } from "@/lib/search-journey";

export const adminJourneyStages = ["SEARCH_COMPLETED", "RESULTS_VIEWED", "FLIGHT_DETAILS_VIEWED", "OFFER_SELECTED", "PROVIDER_DEAL_SELECTED", "PROVIDER_HANDOFF_STARTED"] as const;
export const adminJourneyProducts = ["FLIGHT", "HOTEL", "CAR", "PACKAGE"] as const;
export type AdminJourneyStage = (typeof adminJourneyStages)[number];
export type AdminJourneyEventType = AdminJourneyStage | "RESULT_SAVED" | "RESULT_UNSAVED" | "RESULT_SHARED" | "PRICE_ALERT_CREATED"
  | "SEARCH_EDIT_APPLIED" | "SEARCH_FILTER_APPLIED" | "SEARCH_SORT_CHANGED" | "RESULT_DETAILS_OPENED" | "RATE_DETAILS_OPENED" | "PAGE_VIEW";
export type AdminJourneyProduct = (typeof adminJourneyProducts)[number];
export type AdminJourneyEnvironment = "staging" | "production";
export type AdminJourneyIdentity = { kind: "guest" | "registered"; visitorId: string; userId: string | null };
export type AdminJourneyIssue = { field: string; message: string };

export type AdminJourneyResult<T> =
  | { status: "ok"; data: T }
  | { status: "invalid"; issues: AdminJourneyIssue[] }
  | { status: "forbidden" | "unavailable" | "not_found" };

export type AdminJourneyScope = {
  from: string;
  to: string;
  environment: AdminJourneyEnvironment;
  identity: "all" | "guest" | "registered";
  product?: AdminJourneyProduct;
  provider?: string;
  stage?: AdminJourneyStage;
  userId?: string;
  visitorId?: string;
};

export type AdminJourneyRow = {
  id: string;
  identity: AdminJourneyIdentity;
  startedAt: string;
  firstEventAt: string;
  lastEventAt: string;
  products: AdminJourneyProduct[];
  providers: string[];
  providerCount: number;
  eventCount: number;
  searchCount: number;
  stages: Record<AdminJourneyStage, number>;
};

/** Allowlisted values extracted from an actual recorded search. No raw query JSON or network metadata. */
export type AdminJourneySearchDetails =
  | { product: "FLIGHT"; tripType?: "one-way" | "round-trip" | "multi-city"; departureDate?: string; returnDate?: string;
      cabinClass?: "economy" | "premium-economy" | "business" | "first"; adults?: number; children?: number; infants?: number; travelers?: number;
      legs?: Array<{ origin: string; destination: string; departureDate: string }> }
  | { product: "HOTEL"; checkIn?: string; checkOut?: string; rooms?: number; guests?: number; adults?: number; children?: number }
  | { product: "CAR"; pickupDate?: string; pickupTime?: string; dropoffDate?: string; dropoffTime?: string; driverAge?: string };

export type AdminJourneySearch = {
  id: string;
  requestId: string | null;
  product: AdminJourneyProduct;
  origin: string | null;
  destination: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  resultCount: number;
  /** Validated provider-scoped property groups; null/absent for older records. */
  hotelPropertyCount?: number | null;
  latencyMs: number | null;
  details?: AdminJourneySearchDetails | null;
};

export type AdminJourneyEvent = {
  id: string;
  type: AdminJourneyEventType;
  createdAt: string;
  action?: "local_saved" | "local_unsaved" | "saved_item_confirmed" | "saved_item_removed" | "share_link_copied" | "share_sheet_completed" | "share_sheet_requested" | null;
  resultReference?: string | null;
  filterGroup?: string | null;
  filterSelections?: Array<{ group: string; option: string }> | null;
  sortMode?: string | null;
  sortChoice?: string | null;
  editFields?: JourneySearchEditField[];
  alertDetails?: { mode: "TARGET" | "AUTOMATIC"; currency: string; targetPrice: string | null; baselinePrice: string | null } | null;
  /** Optional result card information observed on the customer device, not server-confirmed. */
  observedResult?: {
    label: string;
    provider: string;
    amount: number;
    currency: string;
    priceBasis: "total" | "per_night" | "per_day";
    totalAmount?: number;
    provenance: "customer_display";
  } | null;
  product: AdminJourneyProduct | null;
  provider: string | null;
  sourcePage: string | null;
  pageView?: {
    label: string; path: string; previousPath: string | null; transport: "web" | "native"; platform: string; href: string | null;
    originalIdentity?: "guest" | "registered";
  };
  search: AdminJourneySearch | null;
  handoff: {
    id: string;
    provider: string;
    route: string | null;
    destinationDomain: string | null;
    searchCorrelation: "exact" | "unavailable";
  } | null;
};

export type AdminJourneyList = { scope: AdminJourneyScope; items: AdminJourneyRow[]; nextCursor: string | null };
export type AdminJourneyDetail = { scope: AdminJourneyScope; journey: AdminJourneyRow; events: AdminJourneyEvent[]; nextCursor: string | null };
export type AdminJourneySearchCounts = { total: number; success: number; partial: number; failed: number };
export type AdminJourneySummary = {
  scope: AdminJourneyScope;
  identities: { total: number; guests: number; registered: number; registeredAccounts: number };
  journeys: number;
  rawEvents: number;
  stages: Record<AdminJourneyStage, { identities: number; journeys: number; events: number }>;
  recordedSearches: AdminJourneySearchCounts;
  handoffCorrelation: { exactEvents: number; uncorrelatedEvents: number };
  operationalHandoffs: {
    scope: "environment_and_date_only";
    total: number;
    withVisitorIdentity: number;
    withoutVisitorIdentity: number;
    inConsentedJourneys: number;
    outsideConsentedJourneys: number;
    exactSearchLinks: number;
    eligibleWithoutExactSearch: number;
    withRequestId: number;
    flights: number;
    hotels: number;
    cars: number;
  };
  operationalSearches: AdminJourneySearchCounts & { scope: "environment_and_date_only"; partialWithResults: number; partialWithoutResults: number };
};

export type AdminJourneyQueryInput = URLSearchParams | Record<string, unknown>;
export type AdminJourneyQueryKind = "list" | "detail" | "summary";
export type AdminJourneyCursor = {
  version: 1;
  kind: "list" | "detail";
  at: string;
  id: string;
  scope: AdminJourneyScope;
  journeyId?: string;
};
export type AdminJourneyQuery = { scope: AdminJourneyScope; limit: number; cursor: AdminJourneyCursor | null };

const dayMs = 24 * 60 * 60 * 1000;
const idSchema = z.string().regex(/^[a-z0-9_-]{6,80}$/i);
const timestampSchema = z.string().datetime({ offset: true });
const scopeSchema = z.object({
  from: timestampSchema,
  to: timestampSchema,
  environment: z.enum(["staging", "production"]),
  identity: z.enum(["all", "guest", "registered"]),
  product: z.enum(adminJourneyProducts).optional(),
  provider: z.string().min(1).max(100).refine(value => value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value)).optional(),
  stage: z.enum(adminJourneyStages).optional(),
  userId: idSchema.optional(),
  visitorId: idSchema.optional(),
}).strict();
const cursorSchema = z.object({
  version: z.literal(1),
  kind: z.enum(["list", "detail"]),
  at: timestampSchema,
  id: idSchema,
  scope: scopeSchema,
  journeyId: idSchema.optional(),
}).strict();
const querySchema = scopeSchema.partial().extend({
  limit: z.string().regex(/^[1-9]\d{0,2}$/).refine(value => Number(value) <= 100).optional(),
  cursor: z.string().min(1).max(2048).regex(/^[A-Za-z0-9_-]+$/).optional(),
}).strict();

const invalid = (field: string, message: string) => ({ status: "invalid" as const, issues: [{ field, message }] });

export function isAdminJourneyId(value: unknown): value is string {
  return idSchema.safeParse(value).success;
}

/** Cursors are untrusted positions, never authorization credentials. Every read repeats all predicates. */
export function encodeAdminJourneyCursor(cursor: AdminJourneyCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeAdminJourneyCursor(value: string) {
  if (!/^[A-Za-z0-9_-]{1,2048}$/.test(value)) return null;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function parseAdminJourneyQuery(
  input: AdminJourneyQueryInput,
  kind: AdminJourneyQueryKind,
  now: Date,
  environment: AdminJourneyEnvironment,
  journeyId?: string,
  calendarTimeZone?: string,
): AdminJourneyResult<AdminJourneyQuery> {
  const values: Record<string, unknown> = Object.create(null);
  if (input instanceof URLSearchParams) {
    for (const [key, value] of input) {
      if (Object.hasOwn(values, key)) return invalid("query", "Repeated query parameters are not supported.");
      values[key] = value;
    }
  } else {
    for (const [key, value] of Object.entries(input)) if (value !== undefined) values[key] = value;
  }
  const parsed = querySchema.safeParse(values);
  if (!parsed.success) {
    return { status: "invalid", issues: parsed.error.issues.slice(0, 8).map(issue => ({
      field: typeof issue.path[0] === "string" ? issue.path[0] : "query",
      message: "Invalid or unsupported query parameter.",
    })) };
  }
  const raw = parsed.data;
  if (kind === "summary" && (raw.cursor || raw.limit)) return invalid("query", "Summary requests do not accept pagination parameters.");
  if (kind === "detail" && !isAdminJourneyId(journeyId)) return invalid("id", "Invalid journey identifier.");
  const cursor = raw.cursor ? decodeAdminJourneyCursor(raw.cursor) : null;
  if (raw.cursor && (!cursor || cursor.kind !== kind || cursor.journeyId !== journeyId)) {
    return invalid("cursor", "This cursor does not belong to this view.");
  }
  const to = new Date(raw.to ?? cursor?.scope.to ?? now).toISOString();
  const from = new Date(raw.from ?? cursor?.scope.from ?? new Date(new Date(to).getTime() - 7 * dayMs)).toISOString();
  const scope: AdminJourneyScope = {
    from, to,
    environment: raw.environment ?? cursor?.scope.environment ?? environment,
    identity: raw.identity ?? cursor?.scope.identity ?? "all",
    ...Object.fromEntries((["product", "provider", "stage", "userId", "visitorId"] as const)
      .map(key => [key, raw[key] ?? cursor?.scope[key]])
      .filter(([, value]) => value !== undefined)),
  };
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const start = fromDate.getTime();
  const end = toDate.getTime();
  // The epoch anchor is reserved for All time. Only internal callers supply
  // a validated calendar zone when converting a civil reporting range.
  const isAllTime = from === "1970-01-01T00:00:00.000Z";
  if (start >= end || end > now.getTime() || (!isAllTime && adminReportingWindowExceedsLimit(fromDate, toDate, now, calendarTimeZone))) {
    return invalid("from", "Use a past UTC time range of more than zero and at most 90 days, or select All time.");
  }
  if (scope.identity === "guest" && scope.userId) return invalid("userId", "A guest filter cannot name a registered account.");
  if (cursor) {
    if (JSON.stringify(scopeSchema.parse(scope)) !== JSON.stringify(scopeSchema.parse(cursor.scope))) {
      return invalid("cursor", "Filters cannot change while continuing a page.");
    }
    const at = new Date(cursor.at).getTime();
    if (at < start || at >= end) return invalid("cursor", "The cursor lies outside this time range.");
  }
  return { status: "ok", data: { scope, limit: Number(raw.limit ?? (kind === "detail" ? 50 : 25)), cursor } };
}
