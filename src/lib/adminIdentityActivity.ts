import type { Prisma } from "@/generated/prisma/client";
import type { ActivityRow, IdentityKind } from "./adminIdentityJourney";

export const ACTIVITY_PAGE_SIZE = 20;
export const ACTIVITY_FETCH_LIMIT = ACTIVITY_PAGE_SIZE + 25;
export const activityTabs = ["all", "searches", "selections", "handoffs"] as const;
export const activityStages = ["all", "SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED", "PROVIDER_HANDOFF_STARTED", "ACCOUNT_ACTIVITY"] as const;
export const activityProducts = ["all", "FLIGHT", "HOTEL", "CAR", "PACKAGE"] as const;

export type ActivityTab = (typeof activityTabs)[number];
export type ActivityStage = (typeof activityStages)[number];
export type ActivityProduct = (typeof activityProducts)[number];
export type ActivityFilters = {
  tab: ActivityTab;
  stage: ActivityStage;
  product: ActivityProduct;
  from: string;
  to: string;
  q: string;
};
export type ActivityCursor = { at: string; id: string };
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
/** Dates represent inclusive UTC calendar days; an empty pair means all recorded dates. */
export function parseActivityFilters(raw: Query): ParseResult {
  if (Object.values(raw).some(Array.isArray)) return { ok: false, error: "Repeated filters are not supported." };
  const tab = one(raw.tab) || "all";
  const stage = one(raw.stage) || "all";
  const product = one(raw.product) || "all";
  const from = one(raw.from);
  const to = one(raw.to);
  const q = one(raw.q).trim();
  if (!activityTabs.includes(tab as ActivityTab) || !activityStages.includes(stage as ActivityStage)
    || !activityProducts.includes(product as ActivityProduct)) return { ok: false, error: "Unsupported activity filter." };
  if ((from && !validDay(from)) || (to && !validDay(to))
    || (from && to && from > to)) return { ok: false, error: "Enter a valid UTC date range." };
  if (q.length > 80 || /[\u0000-\u001f\u007f]/.test(q)) return { ok: false, error: "Search text must contain at most 80 ordinary characters." };
  return { ok: true, filters: { tab: tab as ActivityTab, stage: stage as ActivityStage, product: product as ActivityProduct, from, to, q } };
}
export function activityWindow(filters: ActivityFilters) {
  return {
    ...(filters.from ? { gte: new Date(filters.from + "T00:00:00.000Z") } : {}),
    ...(filters.to ? { lt: new Date(new Date(filters.to + "T00:00:00.000Z").getTime() + 86_400_000) } : {}),
  };
}
export type JourneyStage = Exclude<ActivityStage, "all" | "ACCOUNT_ACTIVITY">;
const allJourneyStages: JourneyStage[] = ["SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED", "PROVIDER_HANDOFF_STARTED"];
export function allowedActivityStages(filters: ActivityFilters): Set<ActivityStage> {
  const available: ActivityStage[] = filters.tab === "all"
    ? [...allJourneyStages, "ACCOUNT_ACTIVITY"]
    : filters.tab === "searches" ? ["SEARCH_COMPLETED", "RESULTS_VIEWED"]
    : filters.tab === "selections" ? ["OFFER_SELECTED"] : ["PROVIDER_HANDOFF_STARTED"];
  return new Set(filters.stage === "all" ? available : available.filter(stage => stage === filters.stage));
}
export const activitySource = (id: string) => id.startsWith("j-") ? "j" : id.startsWith("s-") ? "s"
  : id.startsWith("r-") ? "r" : "e";
function scope(kind: IdentityKind, id: string, filters: ActivityFilters) {
  return JSON.stringify([kind, id, filters.tab, filters.stage, filters.product, filters.from, filters.to, filters.q]);
}
export function encodeActivityCursor(row: Pick<ActivityRow, "id" | "at">, kind: IdentityKind, id: string, filters: ActivityFilters) {
  return Buffer.from(JSON.stringify({ v: 1, at: row.at.toISOString(), id: row.id, scope: scope(kind, id, filters) }), "utf8").toString("base64url");
}
/** Bind cursor to the selected identity and every filter, never accept it as authorization. */
export function decodeActivityCursor(input: string | undefined, kind: IdentityKind, id: string, filters: ActivityFilters): ActivityCursor | null | undefined {
  if (!input) return undefined;
  if (input.length > 1100 || !/^[A-Za-z0-9_-]+$/.test(input)) return null;
  try {
    const item: unknown = JSON.parse(Buffer.from(input, "base64url").toString("utf8"));
    if (!item || typeof item !== "object") return null;
    const x = item as {v?: unknown; id?: unknown; at?: unknown; scope?: unknown};
    if (x.v !== 1 || x.scope !== scope(kind, id, filters)
      || typeof x.id !== "string" || !/^[jesr]-[a-z0-9_-]{6,80}$/i.test(x.id)
      || typeof x.at !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x.at)) return null;
    if (!Number.isFinite(new Date(x.at).getTime())) return null;
    return { id: x.id, at: x.at };
  } catch { return null; }
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
): Prisma.SearchHistoryWhereInput {
  return {
    journeyEvents: {
      none: { AND: [owner, { type: stage }, { createdAt }, product, query] },
    },
  };
}

/** Stable cross-table (createdAt DESC, prefixed ID ASC) keyset. */
export function sourceActivitySeek(cursor: ActivityCursor | undefined, prefix: "j" | "s" | "r" | "e") {
  if (!cursor) return {};
  const at = new Date(cursor.at);
  const priorPrefix = activitySource(cursor.id);
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
export type ActivityGroup = { key: string; journeyId: string | null; startedAt: Date | null; events: ActivityRow[]; products: string[] };
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
