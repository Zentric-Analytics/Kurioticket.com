import { z } from "zod";

export const adminJourneyStages = ["SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED", "PROVIDER_HANDOFF_STARTED"] as const;
export const adminJourneyProducts = ["FLIGHT", "HOTEL", "CAR", "PACKAGE"] as const;
export type AdminJourneyStage = (typeof adminJourneyStages)[number];
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
  latencyMs: number | null;
};

export type AdminJourneyEvent = {
  id: string;
  type: AdminJourneyStage;
  createdAt: string;
  product: AdminJourneyProduct | null;
  provider: string | null;
  sourcePage: string | null;
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
  operationalSearches: AdminJourneySearchCounts & { scope: "environment_and_date_only" };
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

function decodeCursor(value: string) {
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
  const cursor = raw.cursor ? decodeCursor(raw.cursor) : null;
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
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (start >= end || end - start > 90 * dayMs || end > now.getTime()) {
    return invalid("from", "Use a past UTC time range of more than zero and at most 90 days.");
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
