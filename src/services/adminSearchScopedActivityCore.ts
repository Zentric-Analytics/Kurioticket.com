import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { eligibleGuestVisitorWhere, eligibleJourneyLinkedVisitorWhere } from "@/lib/adminIdentityJourney";
import type { PublicEnvironment } from "@/lib/stagingSafety";

export type SearchScopedEvent = {
  id: string;
  stage: "SEARCH_COMPLETED" | "RESULTS_VIEWED" | "OFFER_SELECTED" | "PROVIDER_HANDOFF_STARTED";
  occurredAt: string;
  provider: string | null;
  /** Verified handoff details only; no unverified offer selection or destination URL. */
  handoff: { route: string | null; price: string | null; currency: string | null } | null;
};

export type SearchScopedActivityResult =
  | { status: "ok"; data: { events: SearchScopedEvent[]; nextCursor: string | null; searchOnly: boolean } }
  | { status: "invalid"; issues: Array<{ field: string; message: string }> }
  | { status: "forbidden" | "not_found" | "unavailable" };

type Database = Pick<PrismaClient, "searchHistory" | "journeyEvent">;
type Dependencies = {
  authorize: () => Promise<boolean>;
  database: () => Database | null;
  environment: () => PublicEnvironment;
};

const MAX_EVENTS = 25;
const ID = /^[a-z0-9_-]{6,128}$/i;

const searchSelect = {
  id: true,
  requestId: true,
  type: true,
  userId: true,
  visitorId: true,
  visitor: { select: { consentStatus: true, trackingDisabledAt: true } },
} satisfies Prisma.SearchHistorySelect;

const eventSelect = {
  id: true, type: true, product: true, provider: true, createdAt: true, redirectLogId: true,
  redirectLog: { select: { provider: true, route: true, price: true, currency: true } },
} satisfies Prisma.JourneyEventSelect;

type SearchRecord = Prisma.SearchHistoryGetPayload<{ select: typeof searchSelect }>;
type EventRecord = Prisma.JourneyEventGetPayload<{ select: typeof eventSelect }>;

type PageCursor = { at: string; id: string };
function invalid(field: string, message: string): SearchScopedActivityResult {
  return { status: "invalid", issues: [{ field, message }] };
}
function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function encodeCursor(searchId: string, environment: PublicEnvironment, cursor: PageCursor) {
  return Buffer.from(JSON.stringify({
    version: 1, searchId, environment, at: cursor.at, id: cursor.id,
  }), "utf8").toString("base64url");
}
function decodeCursor(value: string | null, searchId: string, environment: PublicEnvironment):
  | { ok: true; cursor: PageCursor | null }
  | { ok: false } {
  if (!value) return { ok: true, cursor: null };
  if (value.length > 2048 || !/^[a-zA-Z0-9_-]+$/.test(value)) return { ok: false };
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    if (parsed.version !== 1 || parsed.searchId !== searchId || parsed.environment !== environment
      || !isTimestamp(parsed.at) || typeof parsed.id !== "string" || !ID.test(parsed.id)) return { ok: false };
    return { ok: true, cursor: { at: parsed.at, id: parsed.id } };
  } catch {
    return { ok: false };
  }
}

/**
 * Search Detail owns this narrowly scoped read. Never return a customer timeline,
 * unrelated searches, raw metadata, query JSON, or provider destination URLs.
 * Authorization happens before parameter validation and database access.
 */
export function createAdminSearchScopedActivityReader(deps: Dependencies) {
  return async function read(searchId: string, params: URLSearchParams): Promise<SearchScopedActivityResult> {
    try {
      if (!(await deps.authorize())) return { status: "forbidden" };
      if (!ID.test(searchId)) return invalid("searchId", "Invalid search record.");
      for (const key of params.keys()) {
        if (key !== "environment" && key !== "cursor") return invalid(key, "Unknown query parameter.");
      }
      if (params.getAll("environment").length !== 1 || params.getAll("cursor").length > 1) {
        return invalid("environment", "Specify one environment and at most one cursor.");
      }
      const environment = params.get("environment");
      if (environment !== "staging" && environment !== "production") {
        return invalid("environment", "Invalid environment.");
      }
      const pagination = decodeCursor(params.get("cursor"), searchId, environment);
      if (!pagination.ok) return invalid("cursor", "Cursor does not match this search.");
      if (environment !== deps.environment()) {
        // A Search Detail may be inspected across environments, but activity must
        // never be inferred from another deployment's customer or guest history.
        return { status: "ok", data: { events: [], nextCursor: null, searchOnly: true } };
      }
      const db = deps.database();
      if (!db) return { status: "unavailable" };

      // The exact search is the authority for the activity query. A supplied
      // session/user ID can never expand its scope or select another identity.
      const search: SearchRecord | null = await db.searchHistory.findFirst({
        where: { id: searchId, query: { path: ["environment"], equals: environment } },
        select: searchSelect,
      });
      if (!search) return { status: "not_found" };

      // No consented, attributable visitor means no journey event read.
      // The Search Detail page still shows its independent recorded search.
      if (!search.visitorId || search.visitor?.consentStatus !== "GRANTED"
        || search.visitor.trackingDisabledAt !== null) {
        return { status: "ok", data: { events: [], nextCursor: null, searchOnly: true } };
      }

      // For guest searches, enforce current, unlinked consent. For registered
      // searches, enforce an exclusively verified active account association.
      const eligibleVisitor = search.userId
        ? eligibleJourneyLinkedVisitorWhere(search.userId)
        : eligibleGuestVisitorWhere(search.visitorId);

      const cursor = pagination.cursor;
      // FLIGHT, HOTEL, and CAR can link to verified redirects; PACKAGE has no redirect type.
      const handoffProduct = search.type === "FLIGHT" || search.type === "HOTEL" || search.type === "CAR" ? search.type : null;
      const where: Prisma.JourneyEventWhereInput = {
        searchHistoryId: search.id,
        metadata: { path: ["environment"], equals: environment },
        journey: { is: {
          visitorId: search.visitorId,
          visitor: { is: eligibleVisitor },
        } },
        AND: [
          { OR: [{ product: search.type }, { product: null }] },
          { OR: [
          { type: { in: ["SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED"] }, redirectLogId: null },
          ...(search.requestId && handoffProduct ? [{
            type: "PROVIDER_HANDOFF_STARTED" as const,
            redirectLog: { is: {
              visitorId: search.visitorId, userId: search.userId, type: handoffProduct,
              AND: [
                { metadata: { path: ["environment"], equals: environment } },
                { metadata: { path: ["requestId"], equals: search.requestId } },
              ],
            } },
          }] : []),
          ] },
          ...(cursor ? [{
          OR: [
            { createdAt: { gt: new Date(cursor.at) } },
            { createdAt: new Date(cursor.at), id: { gt: cursor.id } },
          ],
        }] : []),
        ],
      };

      const rows: EventRecord[] = await db.journeyEvent.findMany({
        where, select: eventSelect,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: MAX_EVENTS + 1,
      });
      const page = rows.slice(0, MAX_EVENTS);
      const events: SearchScopedEvent[] = page
        // Search Activity intentionally exposes its original four search and
        // handoff stages; save/share detail steps belong to Journey Details.
        .filter((event): event is typeof event & { type: SearchScopedEvent["stage"] } =>
          event.type === "SEARCH_COMPLETED" || event.type === "RESULTS_VIEWED"
          || event.type === "OFFER_SELECTED" || event.type === "PROVIDER_HANDOFF_STARTED")
        .filter(event => event.product === null || event.product === search.type)
        .filter(event => event.type !== "PROVIDER_HANDOFF_STARTED" ||
          Boolean(event.redirectLogId && event.redirectLog &&
            (!event.provider || event.provider === event.redirectLog.provider)))
        .map(event => ({
          id: event.id,
          stage: event.type,
          occurredAt: event.createdAt.toISOString(),
          provider: event.provider?.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 100) || null,
          handoff: event.type === "PROVIDER_HANDOFF_STARTED" && event.redirectLog
            ? {
                route: event.redirectLog.route?.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 160) || null,
                price: event.redirectLog.price == null ? null : String(event.redirectLog.price),
                currency: /^[A-Z]{3}$/.test(event.redirectLog.currency) ? event.redirectLog.currency : null,
              }
            : null,
        }));
      const last = page.at(-1);
      return { status: "ok", data: {
        events,
        searchOnly: false,
        nextCursor: rows.length > MAX_EVENTS && last
          ? encodeCursor(search.id, environment, { at: last.createdAt.toISOString(), id: last.id })
          : null,
      } };
    } catch {
      return { status: "unavailable" };
    }
  };
}
