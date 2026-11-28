import { activityCustomDateBound, validActivityUtcInstant } from "./adminActivityDateQuery";
import { isAdminReportingRange } from "./adminReportingRanges";
import type { Prisma } from "@/generated/prisma/client";
import type { ActivityRow, IdentityKind } from "./adminIdentityJourney";
import type { PublicEnvironment } from "./stagingSafety";
import type { ActivityInterface } from "./activityTrackingContract";

export const ACTIVITY_PAGE_SIZE = 20;
export const ACTIVITY_FETCH_LIMIT = ACTIVITY_PAGE_SIZE + 25;
export const ACTIVITY_OVERVIEW_LIMIT = 5;
export const activityTabs = ["all", "searches", "journeys", "selections", "handoffs", "interactions", "pages", "access"] as const;
export const activityJourneyStages = ["SEARCH_COMPLETED", "RESULTS_VIEWED", "FLIGHT_DETAILS_VIEWED", "OFFER_SELECTED", "PROVIDER_DEAL_SELECTED", "PROVIDER_HANDOFF_STARTED",
  "RESULT_SAVED", "RESULT_UNSAVED", "RESULT_SHARED", "PRICE_ALERT_CREATED", "SEARCH_EDIT_APPLIED", "SEARCH_FILTER_APPLIED", "SEARCH_SORT_CHANGED",
  "RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED"] as const;
export const activityStages = ["all", ...activityJourneyStages, "ACCOUNT_ACTIVITY", "PAGE_VIEW", "PACKAGE_SEARCH_SUBMITTED", "ADMIN_SECURITY_AUDIT"] as const;
export const activityProducts = ["all", "FLIGHT", "HOTEL", "CAR", "PACKAGE"] as const;
export const activityInterfaceOptions = [
  { value: "all", label: "All interfaces" },
  { value: "customer", label: "Customer" },
  { value: "admin", label: "Admin" },
] as const;

export type ActivityTab = (typeof activityTabs)[number];
export type ActivityStage = (typeof activityStages)[number];
export type ActivityProduct = (typeof activityProducts)[number];
export type ActivityOrder = "newest" | "oldest";
export type ActivityFilters = {
  tab: ActivityTab;
  stage: ActivityStage;
  product: ActivityProduct;
  from: string;
  to: string;
  q: string;
  order?: ActivityOrder;
  timeZone?: string;
  interface?: ActivityInterface;
};
export type ActivityCursor = { at: string; id: string };
/** Latest recorded timestamp among visible events, independent of sort direction. */
export function latestVisibleActivityAt(rows: ActivityRow[]): Date | null {
  let latest = -Infinity;
  for (const row of rows) {
    const timestamp = row.at.getTime();
    if (Number.isFinite(timestamp) && timestamp > latest) latest = timestamp;
  }
  return Number.isFinite(latest) ? new Date(latest) : null;
}

/** Only show activity whose source records can be opened in the selected environment. */
export function activityEnvironmentScope(environment: PublicEnvironment) {
  const journey: Prisma.JourneyEventWhereInput = {
    AND: [
      { metadata: { path: ["environment"], equals: environment } },
      { OR: [
        { searchHistoryId: null },
        { searchHistory: { is: { query: { path: ["environment"], equals: environment } } } },
      ] },
      { OR: [
        { redirectLogId: null },
        { redirectLog: { is: { metadata: { path: ["environment"], equals: environment } } } },
      ] },
    ],
  };
  const search: Prisma.SearchHistoryWhereInput = { query: { path: ["environment"], equals: environment } };
  const handoff: Prisma.RedirectLogWhereInput = { metadata: { path: ["environment"], equals: environment } };
  const analytics: Prisma.AnalyticsEventWhereInput = { metadata: { path: ["environment"], equals: environment } };
  return { journey, search, handoff, analytics };
}
type Query = Record<string, string | string[] | undefined>;
type ParseResult = { ok: true; filters: ActivityFilters } | { ok: false; error: string };

export function validActivityIdentity(kind: string, id: string): kind is IdentityKind {
  return (kind === "user" || kind === "guest") && /^[a-z0-9_-]{6,80}$/i.test(id);
}
const one = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsed = new Date(day + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}
function activityBoundary(value: string, edge: "from" | "to", timeZone = "UTC") {
  const bound = activityCustomDateBound(value, edge, timeZone);
  return new Date(bound.length === 10 ? NaN : bound);
}

export function parseActivityFilters(raw: Query, timeZone = "UTC"): ParseResult {
  if (Object.values(raw).some(Array.isArray)) return { ok: false, error: "Repeated filters are not supported." };
  const range = one(raw.range);
  if (range && !isAdminReportingRange(range)) return { ok: false, error: "Unsupported activity date range." };
  const tab = one(raw.tab) || "all";
  const stage = one(raw.stage) || "all";
  const product = one(raw.product) || "all";
  const from = one(raw.from);
  const to = one(raw.to);
  const q = one(raw.q).trim();
  const order = one(raw.order) || "newest";
  const activityInterface = one(raw.interface) || "all";
  if (!activityTabs.includes(tab as ActivityTab) || !activityStages.includes(stage as ActivityStage)
    || !activityProducts.includes(product as ActivityProduct)
    || !activityInterfaceOptions.some(option => option.value === activityInterface)
    || !["newest", "oldest"].includes(order)) return { ok: false, error: "Unsupported activity filter." };
  const start = from ? activityBoundary(from, "from", timeZone).getTime() : -Infinity;
  const end = to ? activityBoundary(to, "to", timeZone).getTime() : Infinity;
  if ((from && !validDay(from) && !validActivityUtcInstant(from))
    || (to && !validDay(to) && !validActivityUtcInstant(to)) || !(start < end)) {
    return { ok: false, error: "Enter a valid date range." };
  }
  if (q.length > 80 || /[\u0000-\u001f\u007f]/.test(q)) return { ok: false, error: "Search text must contain at most 80 ordinary characters." };
  return { ok: true, filters: {
    tab: tab as ActivityTab, stage: stage as ActivityStage, product: product as ActivityProduct, from, to, q, order: order as ActivityOrder,
    ...(activityInterface === "admin" || activityInterface === "customer" ? { interface: activityInterface } : {}),
    ...(timeZone !== "UTC" && (from.length === 10 || to.length === 10) ? { timeZone } : {}),
  } };
}
export function activityWindow(filters: ActivityFilters) {
  return {
    ...(filters.from ? { gte: activityBoundary(filters.from, "from", filters.timeZone) } : {}),
    ...(filters.to ? { lt: activityBoundary(filters.to, "to", filters.timeZone) } : {}),
  };
}
export type JourneyStage = (typeof activityJourneyStages)[number];
export function allowedActivityStages(filters: ActivityFilters): Set<ActivityStage> {
  const available: ActivityStage[] = filters.tab === "all"
    ? [...activityJourneyStages, "ACCOUNT_ACTIVITY", "PAGE_VIEW", "PACKAGE_SEARCH_SUBMITTED", "ADMIN_SECURITY_AUDIT"]
    : filters.tab === "access" ? []
    : filters.tab === "pages" ? ["PAGE_VIEW"]
    : filters.tab === "journeys" ? [...activityJourneyStages]
    : filters.tab === "searches" ? ["SEARCH_COMPLETED", "RESULTS_VIEWED", "FLIGHT_DETAILS_VIEWED", "SEARCH_EDIT_APPLIED", "SEARCH_FILTER_APPLIED",
      "SEARCH_SORT_CHANGED", "RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED", "PACKAGE_SEARCH_SUBMITTED"]
    : filters.tab === "selections" ? ["OFFER_SELECTED", "PROVIDER_DEAL_SELECTED"]
    : filters.tab === "interactions" ? ["RESULT_SAVED", "RESULT_UNSAVED", "RESULT_SHARED", "PRICE_ALERT_CREATED", "ACCOUNT_ACTIVITY"]
    : ["PROVIDER_HANDOFF_STARTED"];
  return new Set(available.filter(stage => (filters.stage === "all" || stage === filters.stage)
    && (filters.interface === "admin" ? stage === "ADMIN_SECURITY_AUDIT" : filters.interface !== "customer" || stage !== "ADMIN_SECURITY_AUDIT")));
}
export const activitySource = (id: string) => id.startsWith("a-") ? "a" : id.startsWith("d-") ? "d" : id.startsWith("j-") ? "j" : id.startsWith("s-") ? "s"
  : id.startsWith("r-") ? "r" : "e";
function scope(kind: IdentityKind, id: string, filters: ActivityFilters, environment: PublicEnvironment) {
  // Preserve existing newest-first cursors; bind oldest-first tokens to their own order.
  return JSON.stringify([kind, id, environment, filters.tab, filters.stage, filters.product, filters.from, filters.to, filters.q,
    ...(filters.order === "oldest" ? ["oldest"] : []), ...(filters.timeZone ? [filters.timeZone] : []),
    ...(filters.interface ? [filters.interface] : [])]);
}
export function encodeActivityCursor(row: Pick<ActivityRow, "id" | "at">, kind: IdentityKind, id: string, filters: ActivityFilters, environment: PublicEnvironment) {
  return Buffer.from(JSON.stringify({ v: 1, at: row.at.toISOString(), id: row.id, scope: scope(kind, id, filters, environment) }), "utf8").toString("base64url");
}
function readActivityCursor(input: string): (ActivityCursor & { scope: string }) | null {
  if (input.length > 1100 || !/^[A-Za-z0-9_-]+$/.test(input)) return null;
  try {
    const item: unknown = JSON.parse(Buffer.from(input, "base64url").toString("utf8"));
    if (!item || typeof item !== "object") return null;
    const x = item as {v?: unknown; id?: unknown; at?: unknown; scope?: unknown};
    if (x.v !== 1 || typeof x.scope !== "string"
      || typeof x.id !== "string" || !/^[adjesr]-[a-z0-9_-]{6,100}$/i.test(x.id)
      || typeof x.at !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x.at)) return null;
    if (!Number.isFinite(new Date(x.at).getTime())) return null;
    return { id: x.id, at: x.at, scope: x.scope };
  } catch { return null; }
}
/** Used only to recover the reporting cutoff before full cursor validation. */
export function activityCursorWindow(input: string): { from: string; to: string } | null {
  const cursor = readActivityCursor(input);
  if (!cursor) return null;
  try {
    const values: unknown = JSON.parse(cursor.scope);
    if (!Array.isArray(values)) return null;
    const [, , , , , , from, to] = values;
    return typeof from === "string" && typeof to === "string"
      && validActivityUtcInstant(from) && validActivityUtcInstant(to) && from < to ? { from, to } : null;
  } catch { return null; }
}
/** Bind cursor to the selected identity and every filter, never accept it as authorization. */
export function decodeActivityCursor(input: string | undefined, kind: IdentityKind, id: string, filters: ActivityFilters, environment: PublicEnvironment): ActivityCursor | null | undefined {
  if (!input) return undefined;
  const cursor = readActivityCursor(input);
  return cursor?.scope === scope(kind, id, filters, environment) ? { id: cursor.id, at: cursor.at } : null;
}
/** Keep text searching consistent for modern stages and older activity rows. */
export function legacyStageLabelMatchesQuery(
  stage: "SEARCH_COMPLETED" | "PROVIDER_HANDOFF_STARTED",
  query: string,
) {
  const label = stage === "SEARCH_COMPLETED" ? "Search completed" : "Provider handoff started";
  return Boolean(query) && label.toLowerCase().includes(query.toLowerCase());
}

/**
 * Suppress a legacy search/handoff when its same-source journey stage is already
 * eligible for this view. Do not seek this exclusion using the page cursor:
 * canonical events on an earlier page must still prevent later duplicates.
 * Reuse the same consent, ownership, date, product and text filters as the
 * canonical query so hidden / out-of-scope events do not mask legacy history.
 */
export function excludeCanonicalLegacyRows(
  stage: "SEARCH_COMPLETED" | "PROVIDER_HANDOFF_STARTED",
  owner: Prisma.JourneyEventWhereInput,
  createdAt: Prisma.DateTimeFilter,
  product: Prisma.JourneyEventWhereInput,
  query: Prisma.JourneyEventWhereInput,
  validReferences?: Prisma.JourneyEventWhereInput,
): { journeyEvents: { none: Prisma.JourneyEventWhereInput } } {
  return {
    journeyEvents: {
      none: { AND: [owner, { type: stage }, { createdAt }, product, query, ...(validReferences ? [validReferences] : [])] },
    },
  };
}

/** Stable cross-table (createdAt DESC, prefixed ID ASC) keyset. */
export function sourceActivitySeek(cursor: ActivityCursor | undefined, prefix: "a" | "j" | "s" | "r" | "e", order: ActivityOrder = "newest") {
  if (!cursor) return {};
  const at = new Date(cursor.at);
  const priorPrefix = activitySource(cursor.id);
  if (order === "oldest") {
    if (prefix < priorPrefix) return { createdAt: { gt: at } };
    if (prefix > priorPrefix) return { createdAt: { gte: at } };
    return { OR: [{ createdAt: { gt: at } }, { createdAt: at, id: { gt: cursor.id.slice(2) } }] };
  }
  if (prefix < priorPrefix) return { createdAt: { lt: at } };
  if (prefix > priorPrefix) return { createdAt: { lte: at } };
  return { OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { gt: cursor.id.slice(2) } }] };
}
export function activityHref(path: string, params: Record<string, string>, updates: Record<string, string | null>) {
  const search = new URLSearchParams(params);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) search.delete(key);
    else search.set(key, value);
  }
  const query = search.toString();
  return path + (query ? "?" + query : "");
}
/** Carry the current activity page into the journey drilldown instead of the
 * unrelated seven-day default. The journey reader allows at most 90 days.
 * Prefer displayed canonical journeys; historical pages remain navigable.
 */
export function relatedJourneysWindow(rows: ActivityRow[], now: Date): { from: string; to: string } | null {
  const dayMs = 86_400_000;
  const nowMs = now.getTime();
  const recorded = rows.filter(row => Number.isFinite(row.at.getTime()) && row.at.getTime() < nowMs);
  const canonical = recorded.filter(row => row.journeyId);
  const focus = canonical.length ? canonical : recorded;
  if (!focus.length) return null;
  let latest = -Infinity;
  let earliest = Infinity;
  for (const row of focus) {
    const timestamp = row.at.getTime();
    latest = Math.max(latest, timestamp);
    earliest = Math.min(earliest, timestamp);
  }
  const end = Math.min(nowMs, latest + dayMs);
  const start = Math.max(earliest - dayMs, end - 89 * dayMs);
  return start < end ? { from: new Date(start).toISOString(), to: new Date(end).toISOString() } : null;
}

export type ActivityGroup = { key: string; journeyId: string | null; startedAt: Date | null; events: ActivityRow[]; products: string[] };
/** Group only adjacent matching journey records. Grouping all events by journey
 * would change chronology when different journeys have interleaved events.
 */
export function groupContiguousActivityRows(rows: ActivityRow[]): ActivityGroup[] {
  const result: ActivityGroup[] = [];
  rows.forEach((event, index) => {
    const journeyId = event.journeyId ?? null;
    const last = result.at(-1);
    if (last && last.journeyId === journeyId) {
      last.events.push(event);
      if (event.product && !last.products.includes(event.product)) last.products.push(event.product);
    } else {
      result.push({
        key: (journeyId ?? "other") + ":" + index,
        journeyId,
        startedAt: event.journeyStartedAt ?? null,
        events: [event],
        products: event.product ? [event.product] : [],
      });
    }
  });
  return result;
}

export function groupActivityRows(rows: ActivityRow[]): ActivityGroup[] {
  const groups = new Map<string, ActivityGroup>();
  for (const event of rows) {
    const key = event.journeyId ?? "other";
    let group = groups.get(key);
    if (!group) {
      group = { key, journeyId: event.journeyId ?? null, startedAt: event.journeyStartedAt ?? null, events: [], products: [] };
      groups.set(key, group);
    }
    group.events.push(event);
    if (event.product && !group.products.includes(event.product)) group.products.push(event.product);
  }
  return [...groups.values()];
}


/**
 * Visually fold a run of consecutive, identically described offer-selection
 * events within a single recorded journey. This is PRESENTATION ONLY: each
 * recorded row stays in order, with its own timestamp and deep link. Never
 * combine events across journeys, providers, products or descriptions, and
 * never collapse unlinked/unknown offers.
 */
export type ActivityDisplayItem =
  | { kind: "event"; row: ActivityRow }
  | { kind: "selection_run"; rows: ActivityRow[] };

export function compactActivityDisplayRows(rows: ActivityRow[]): ActivityDisplayItem[] {
  const result: ActivityDisplayItem[] = [];
  for (let index = 0; index < rows.length;) {
    const first = rows[index];
    if (first.stage !== "OFFER_SELECTED" || !first.journeyId || !first.provider?.trim()
      || !first.product || !first.detail?.trim()) {
      result.push({ kind: "event", row: first });
      index++;
      continue;
    }
    const selected = [first];
    let next = index + 1;
    while (next < rows.length) {
      const event = rows[next];
      if (event.stage !== "OFFER_SELECTED" || event.journeyId !== first.journeyId
        || event.product !== first.product || event.provider !== first.provider
        || event.detail !== first.detail || event.label !== first.label) break;
      selected.push(event);
      next++;
    }
    if (selected.length >= 3) {
      result.push({ kind: "selection_run", rows: selected });
    } else {
      for (const row of selected) result.push({ kind: "event", row });
    }
    index = next;
  }
  return result;
}
