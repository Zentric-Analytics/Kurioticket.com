import { recordedHotelPropertyCount } from "@/lib/hotels/hotelResultAccounting";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isJourneySourcePath, journeySourcePath, safeJourneySearchEditFields } from "@/lib/search-journey";
import { toAdminPageView } from "@/lib/adminPageView";
import { safeObservedResult } from "@/lib/adminObservedResult";
import { safeAdminJourneySearchDetails } from "./adminJourneySearchDetails";
import {
  adminJourneyProducts,
  adminJourneyStages,
  encodeAdminJourneyCursor,
  parseAdminJourneyQuery,
  type AdminJourneyDetail,
  type AdminJourneyEnvironment,
  type AdminJourneyEvent,
  type AdminJourneyEventType,
  type AdminJourneyList,
  type AdminJourneyProduct,
  type AdminJourneyQuery,
  type AdminJourneyQueryInput,
  type AdminJourneyQueryKind,
  type AdminJourneyResult,
  type AdminJourneyRow,
  type AdminJourneyScope,
  type AdminJourneySearchCounts,
  type AdminJourneySummary,
} from "./adminJourneyContract";

export type AdminJourneyDatabase = Pick<PrismaClient, "$transaction">;
type Dependencies = {
  authorize: () => Promise<boolean>;
  database: () => AdminJourneyDatabase | null;
  environment: () => AdminJourneyEnvironment;
  now?: () => Date;
};
type Count = number | bigint;
type JourneyRecord = {
  id: string; visitorId: string; userId: string | null;
  startedAt: Date; firstEventAt: Date; lastEventAt: Date;
  products: string[]; providers: string[]; providerCount: Count; eventCount: Count; searchCount: Count;
  searchCompleted: Count; resultsViewed: Count; flightDetailsViewed: Count; offerSelected: Count; providerDealSelected: Count; handoffStarted: Count;
};
type EventRecord = {
  id: string; type: AdminJourneyEventType; createdAt: Date; product: AdminJourneyProduct | null;
  action: string | null; resultReference: string | null; filterGroup: string | null; sortMode: string | null; sortChoice?: string | null; filterSelections?: unknown;
  editFields?: unknown;
  alertMode?: string | null; alertCurrency?: string | null; alertTargetPrice?: string | null; alertBaselinePrice?: string | null;
  observedResult?: unknown;
  pageViewMetadata?: unknown;
  pageViewUserId?: string | null;
  provider: string | null; sourcePage: string | null;
  searchHistoryId: string | null; requestId: string | null; searchProduct: AdminJourneyProduct | null;
  origin: string | null; destination: string | null; checkIn: Date | null; checkOut: Date | null; searchQuery?: unknown;
  searchStatus: "SUCCESS" | "PARTIAL" | "FAILED" | null; resultCount: number | null; latencyMs: number | null;
  redirectLogId: string | null; redirectProvider: string | null; route: string | null; destinationUrl: string | null;
};
type SummaryRecord = {
  identities: Count; guests: Count; registered: Count; registeredAccounts: Count; journeys: Count; rawEvents: Count;
  searchCompletedIdentities: Count; searchCompletedJourneys: Count; searchCompletedEvents: Count;
  resultsViewedIdentities: Count; resultsViewedJourneys: Count; resultsViewedEvents: Count;
  flightDetailsViewedIdentities: Count; flightDetailsViewedJourneys: Count; flightDetailsViewedEvents: Count;
  offerSelectedIdentities: Count; offerSelectedJourneys: Count; offerSelectedEvents: Count;
  providerDealSelectedIdentities: Count; providerDealSelectedJourneys: Count; providerDealSelectedEvents: Count;
  handoffStartedIdentities: Count; handoffStartedJourneys: Count; handoffStartedEvents: Count;
  searches: Count; successfulSearches: Count; partialSearches: Count; failedSearches: Count;
  exactHandoffs: Count; uncorrelatedHandoffs: Count;
};
type OperationalRecord = { total: Count; success: Count; partial: Count; failed: Count; partialWithResults: Count; partialWithoutResults: Count };
type OperationalHandoffRecord = {
  total: Count;
  withVisitorIdentity: Count;
  withoutVisitorIdentity: Count;
  inConsentedJourneys: Count;
  outsideConsentedJourneys: Count;
  exactSearchLinks: Count;
  eligibleWithoutExactSearch: Count;
  withRequestId: Count;
  flights: Count;
  hotels: Count;
  cars: Count;
};

/** Shared SQL scope keeps every view on the same consent, ownership, date and environment rules. */
function scopedEvents(scope: AdminJourneyScope, journeyId?: string) {
  const identity = scope.identity === "guest" ? Prisma.sql`AND v."currentUserId" IS NULL`
    : scope.identity === "registered" ? Prisma.sql`AND v."currentUserId" IS NOT NULL` : Prisma.empty;
  return Prisma.sql`
    WITH eligible_events AS (
      SELECT e."id", e."journeyId", e."type"::text AS "type", e."product"::text AS "product", e."provider", e."createdAt",
        e."metadata"->>'sourcePage' AS "sourcePage", e."metadata"->>'action' AS "action", e."metadata"->>'resultId' AS "resultReference",
        e."metadata"->'observedResult' AS "observedResult",
        e."metadata"->>'filterGroup' AS "filterGroup", e."metadata"->'filterSelections' AS "filterSelections", e."metadata"->>'sortMode' AS "sortMode", e."metadata"->>'sortChoice' AS "sortChoice",
        e."metadata"->'editFields' AS "editFields",
        e."metadata"->>'alertMode' AS "alertMode", e."metadata"->>'alertCurrency' AS "alertCurrency",
        e."metadata"->>'alertTargetPrice' AS "alertTargetPrice", e."metadata"->>'alertBaselinePrice' AS "alertBaselinePrice", j."visitorId", v."currentUserId" AS "userId", j."startedAt",
        s."id" AS "searchHistoryId", s."requestId", s."type"::text AS "searchProduct", s."origin", s."destination",
        s."checkIn", s."checkOut", s."query" AS "searchQuery", s."status"::text AS "searchStatus", s."resultCount", s."latencyMs",
        r."id" AS "redirectLogId", r."provider" AS "redirectProvider", r."route", r."destinationUrl"
      FROM "JourneyEvent" e
      JOIN "SearchJourney" j ON j."id" = e."journeyId"
      JOIN "Visitor" v ON v."id" = j."visitorId"
      LEFT JOIN "User" u ON u."id" = v."currentUserId"
      LEFT JOIN "SearchHistory" s ON s."id" = e."searchHistoryId"
      LEFT JOIN "RedirectLog" r ON r."id" = e."redirectLogId"
      WHERE v."consentStatus" = 'GRANTED' AND v."trackingDisabledAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "VisitorIdentityLink" l WHERE l."visitorId" = v."id"
            AND (v."currentUserId" IS NULL OR l."userId" <> v."currentUserId")
        )
        AND (v."currentUserId" IS NULL OR (
          u."status" = 'ACTIVE' AND u."emailVerified" IS NOT NULL
          AND EXISTS (SELECT 1 FROM "VisitorIdentityLink" l WHERE l."visitorId" = v."id" AND l."userId" = v."currentUserId")
        ))
        AND e."createdAt" >= ${new Date(scope.from)} AND e."createdAt" < ${new Date(scope.to)}
        AND e."metadata"->>'environment' = ${scope.environment}
        ${journeyId ? Prisma.sql`AND e."journeyId" = ${journeyId}` : Prisma.empty}
        AND (e."searchHistoryId" IS NULL OR (
          s."id" IS NOT NULL AND s."visitorId" = v."id"
          AND (s."userId" IS NULL OR s."userId" = v."currentUserId")
          AND s."query"->>'environment' = ${scope.environment}
          AND (e."product" IS NULL OR e."product" = s."type")
        ))
        AND (e."redirectLogId" IS NULL OR (
          r."id" IS NOT NULL AND r."visitorId" = v."id"
          AND (r."userId" IS NULL OR r."userId" = v."currentUserId")
          AND (e."product" IS NULL OR e."product"::text = r."type"::text)
          AND (r."metadata"->>'environment' IS NULL OR r."metadata"->>'environment' = ${scope.environment})
          AND (e."searchHistoryId" IS NULL OR (s."requestId" IS NOT NULL AND r."metadata"->>'requestId' = s."requestId"))
        ))
        AND (
          (e."type" IN ('SEARCH_COMPLETED', 'RESULTS_VIEWED', 'FLIGHT_DETAILS_VIEWED', 'OFFER_SELECTED', 'PROVIDER_DEAL_SELECTED', 'RESULT_SAVED', 'RESULT_UNSAVED', 'RESULT_SHARED', 'PRICE_ALERT_CREATED', 'SEARCH_EDIT_APPLIED', 'SEARCH_FILTER_APPLIED', 'SEARCH_SORT_CHANGED', 'RESULT_DETAILS_OPENED', 'RATE_DETAILS_OPENED') AND s."id" IS NOT NULL AND e."redirectLogId" IS NULL)
          OR (e."type" = 'PROVIDER_HANDOFF_STARTED' AND r."id" IS NOT NULL)
        )
        ${identity}
        ${scope.userId ? Prisma.sql`AND v."currentUserId" = ${scope.userId}` : Prisma.empty}
        ${scope.visitorId ? Prisma.sql`AND v."id" = ${scope.visitorId}` : Prisma.empty}
    ), matching_journeys AS (
      SELECT "journeyId" FROM eligible_events GROUP BY "journeyId"
      HAVING TRUE
        ${scope.product ? Prisma.sql`AND bool_or("product" = ${scope.product})` : Prisma.empty}
        ${scope.provider ? Prisma.sql`AND bool_or("provider" = ${scope.provider})` : Prisma.empty}
        ${scope.stage ? Prisma.sql`AND bool_or("type" = ${scope.stage})` : Prisma.empty}
    ), scoped_events AS (
      SELECT e.* FROM eligible_events e JOIN matching_journeys m ON m."journeyId" = e."journeyId"
    )`;
}

function journeyRollups() {
  return Prisma.sql`, journey_rollups AS (
    SELECT "journeyId" AS "id", "visitorId", "userId", min("startedAt") AS "startedAt",
      min("createdAt") AS "firstEventAt", max("createdAt") AS "lastEventAt",
      array_agg(DISTINCT "product" ORDER BY "product") FILTER (WHERE "product" IS NOT NULL) AS "products",
      count(DISTINCT "provider") AS "providerCount", count(*) AS "eventCount", count(DISTINCT "searchHistoryId") AS "searchCount",
      count(*) FILTER (WHERE "type" = 'SEARCH_COMPLETED') AS "searchCompleted",
      count(*) FILTER (WHERE "type" = 'RESULTS_VIEWED') AS "resultsViewed",
      count(*) FILTER (WHERE "type" = 'FLIGHT_DETAILS_VIEWED') AS "flightDetailsViewed",
      count(*) FILTER (WHERE "type" = 'OFFER_SELECTED') AS "offerSelected",
      count(*) FILTER (WHERE "type" = 'PROVIDER_DEAL_SELECTED') AS "providerDealSelected",
      count(*) FILTER (WHERE "type" = 'PROVIDER_HANDOFF_STARTED') AS "handoffStarted"
    FROM scoped_events GROUP BY "journeyId", "visitorId", "userId"
  )`;
}

function listSql(query: AdminJourneyQuery, journeyId?: string) {
  const { scope, cursor, limit } = query;
  return Prisma.sql`${scopedEvents(scope, journeyId)} ${journeyRollups()}, page AS (
    SELECT * FROM journey_rollups WHERE TRUE
      ${journeyId ? Prisma.sql`AND "id" = ${journeyId}` : Prisma.empty}
      ${cursor && !journeyId ? Prisma.sql`AND ("lastEventAt", "id") < (${new Date(cursor.at)}, ${cursor.id})` : Prisma.empty}
    ORDER BY "lastEventAt" DESC, "id" DESC LIMIT ${journeyId ? 1 : limit + 1}
  ) SELECT p.*, ARRAY(
    SELECT DISTINCT e."provider" FROM scoped_events e
    WHERE e."journeyId" = p."id" AND e."provider" IS NOT NULL ORDER BY e."provider" LIMIT 10
  ) AS "providers" FROM page p ORDER BY p."lastEventAt" DESC, p."id" DESC`;
}

function detailSql(query: AdminJourneyQuery, journeyId: string) {
  // Navigation observations remain single AnalyticsEvent records. Include
  // only those with an exact canonical search link in this authorized
  // journey; never inflate the existing funnel rollups or guess a match.
  return Prisma.sql`${scopedEvents(query.scope, journeyId)},
    exact_searches AS (
      SELECT DISTINCT ON ("journeyId", "searchHistoryId") *
      FROM scoped_events WHERE "type" = 'SEARCH_COMPLETED'
      ORDER BY "journeyId", "searchHistoryId", "createdAt", "id"
    ), detail_events AS (
      SELECT *, NULL::jsonb AS "pageViewMetadata", NULL::text AS "pageViewUserId" FROM scoped_events
      UNION ALL
      SELECT 'pv-' || a."id", s."journeyId", 'PAGE_VIEW', s."product", NULL, a."createdAt",
        NULL, NULL, NULL, NULL::jsonb, NULL, NULL::jsonb, NULL, NULL, NULL::jsonb AS "editFields",
        NULL, NULL, NULL, NULL,
        s."visitorId", s."userId", s."startedAt",
        s."searchHistoryId", s."requestId", s."searchProduct", s."origin", s."destination",
        s."checkIn", s."checkOut", s."searchQuery", s."searchStatus", s."resultCount", s."latencyMs",
        NULL, NULL, NULL, NULL, a."metadata", a."userId"
      FROM "AnalyticsEvent" a
      JOIN exact_searches s ON s."visitorId" = a."visitorId"
        AND s."journeyId" = a."metadata"->>'linkedJourneyId'
        AND s."searchHistoryId" = a."metadata"->>'linkedSearchHistoryId'
      WHERE a."type" = 'PAGE_VIEW' AND a."name" = 'page_viewed'
        AND (a."userId" IS NULL OR a."userId" = s."userId")
        AND a."metadata"->>'environment' = ${query.scope.environment}
        AND a."createdAt" >= ${new Date(query.scope.from)} AND a."createdAt" < ${new Date(query.scope.to)}
        AND a."metadata"->>'transport' IN ('web', 'native')
        AND ((s."product" = 'FLIGHT' AND a."metadata"->>'pageKey' IN ('flight_results', 'flight_details'))
          OR (s."product" = 'HOTEL' AND a."metadata"->>'pageKey' IN ('hotel_results', 'hotel_details'))
          OR (s."product" = 'CAR' AND a."metadata"->>'pageKey' IN ('car_results', 'car_details'))
          OR (s."product" = 'PACKAGE' AND a."metadata"->>'pageKey' = 'package_results'))
    ) SELECT * FROM detail_events
    WHERE "journeyId" = ${journeyId}
      ${query.cursor ? Prisma.sql`AND ("createdAt", "id") > (${new Date(query.cursor.at)}, ${query.cursor.id})` : Prisma.empty}
    ORDER BY "createdAt" ASC, "id" ASC LIMIT ${query.limit + 1}`;
}

function summarySql(scope: AdminJourneyScope) {
  return Prisma.sql`${scopedEvents(scope)} SELECT
    count(DISTINCT "visitorId") AS "identities",
    count(DISTINCT "visitorId") FILTER (WHERE "userId" IS NULL) AS "guests",
    count(DISTINCT "visitorId") FILTER (WHERE "userId" IS NOT NULL) AS "registered",
    count(DISTINCT "userId") AS "registeredAccounts", count(DISTINCT "journeyId") AS "journeys", count(*) AS "rawEvents",
    count(DISTINCT "visitorId") FILTER (WHERE "type" = 'SEARCH_COMPLETED') AS "searchCompletedIdentities",
    count(DISTINCT "journeyId") FILTER (WHERE "type" = 'SEARCH_COMPLETED') AS "searchCompletedJourneys",
    count(*) FILTER (WHERE "type" = 'SEARCH_COMPLETED') AS "searchCompletedEvents",
    count(DISTINCT "visitorId") FILTER (WHERE "type" = 'RESULTS_VIEWED') AS "resultsViewedIdentities",
    count(DISTINCT "journeyId") FILTER (WHERE "type" = 'RESULTS_VIEWED') AS "resultsViewedJourneys",
    count(*) FILTER (WHERE "type" = 'RESULTS_VIEWED') AS "resultsViewedEvents",
    count(DISTINCT "visitorId") FILTER (WHERE "type" = 'FLIGHT_DETAILS_VIEWED') AS "flightDetailsViewedIdentities",
    count(DISTINCT "journeyId") FILTER (WHERE "type" = 'FLIGHT_DETAILS_VIEWED') AS "flightDetailsViewedJourneys",
    count(*) FILTER (WHERE "type" = 'FLIGHT_DETAILS_VIEWED') AS "flightDetailsViewedEvents",
    count(DISTINCT "visitorId") FILTER (WHERE "type" = 'OFFER_SELECTED') AS "offerSelectedIdentities",
    count(DISTINCT "journeyId") FILTER (WHERE "type" = 'OFFER_SELECTED') AS "offerSelectedJourneys",
    count(*) FILTER (WHERE "type" = 'OFFER_SELECTED') AS "offerSelectedEvents",
    count(DISTINCT "visitorId") FILTER (WHERE "type" = 'PROVIDER_DEAL_SELECTED') AS "providerDealSelectedIdentities",
    count(DISTINCT "journeyId") FILTER (WHERE "type" = 'PROVIDER_DEAL_SELECTED') AS "providerDealSelectedJourneys",
    count(*) FILTER (WHERE "type" = 'PROVIDER_DEAL_SELECTED') AS "providerDealSelectedEvents",
    count(DISTINCT "visitorId") FILTER (WHERE "type" = 'PROVIDER_HANDOFF_STARTED') AS "handoffStartedIdentities",
    count(DISTINCT "journeyId") FILTER (WHERE "type" = 'PROVIDER_HANDOFF_STARTED') AS "handoffStartedJourneys",
    count(*) FILTER (WHERE "type" = 'PROVIDER_HANDOFF_STARTED') AS "handoffStartedEvents",
    count(DISTINCT "searchHistoryId") AS "searches",
    count(DISTINCT "searchHistoryId") FILTER (WHERE "searchStatus" = 'SUCCESS') AS "successfulSearches",
    count(DISTINCT "searchHistoryId") FILTER (WHERE "searchStatus" = 'PARTIAL') AS "partialSearches",
    count(DISTINCT "searchHistoryId") FILTER (WHERE "searchStatus" = 'FAILED') AS "failedSearches",
    count(*) FILTER (WHERE "type" = 'PROVIDER_HANDOFF_STARTED' AND "searchHistoryId" IS NOT NULL) AS "exactHandoffs",
    count(*) FILTER (WHERE "type" = 'PROVIDER_HANDOFF_STARTED' AND "searchHistoryId" IS NULL) AS "uncorrelatedHandoffs"
    FROM scoped_events`;
}

function operationalSql(scope: AdminJourneyScope) {
  return Prisma.sql`SELECT count(*) AS "total",
    count(*) FILTER (WHERE "status" = 'SUCCESS') AS "success",
    count(*) FILTER (WHERE "status" = 'PARTIAL') AS "partial",
    count(*) FILTER (WHERE "status" = 'PARTIAL' AND "resultCount" > 0) AS "partialWithResults",
    count(*) FILTER (WHERE "status" = 'PARTIAL' AND "resultCount" <= 0) AS "partialWithoutResults",
    count(*) FILTER (WHERE "status" = 'FAILED') AS "failed"
    FROM "SearchHistory" WHERE "createdAt" >= ${new Date(scope.from)} AND "createdAt" < ${new Date(scope.to)}
      AND "query"->>'environment' = ${scope.environment}
      AND "countAsSearch" = TRUE`;
}

/**
 * Count all environment-tagged redirect records independently of consented
 * journey cohorts. A separately aggregated set of *eligible* events uses
 * the exact same consent, ownership and environment rules as journey reads.
 * Never infer a missing search by time or associate an anonymous redirect
 * with a visitor who has not consented.
 *
 * A redirect is counted once even if historical stage rows repeat it.
 * Redirects use their own createdAt window; eligible events use theirs.
 */
function operationalHandoffsSql(scope: AdminJourneyScope) {
  const unfiltered: AdminJourneyScope = {
    from: scope.from, to: scope.to, environment: scope.environment, identity: "all",
  };
  return Prisma.sql`${scopedEvents(unfiltered)},
    eligible_handoff_redirects AS (
      SELECT "redirectLogId", bool_or("searchHistoryId" IS NOT NULL) AS "exactSearch"
      FROM eligible_events
      WHERE "type" = 'PROVIDER_HANDOFF_STARTED' AND "redirectLogId" IS NOT NULL
      GROUP BY "redirectLogId"
    )
    SELECT
      count(*) AS "total",
      count(*) FILTER (WHERE r."type"::text = 'FLIGHT') AS "flights",
      count(*) FILTER (WHERE r."type"::text = 'HOTEL') AS "hotels",
      count(*) FILTER (WHERE r."type"::text = 'CAR') AS "cars",
      count(*) FILTER (WHERE r."visitorId" IS NOT NULL) AS "withVisitorIdentity",
      count(*) FILTER (WHERE r."visitorId" IS NULL) AS "withoutVisitorIdentity",
      count(*) FILTER (WHERE h."redirectLogId" IS NOT NULL) AS "inConsentedJourneys",
      count(*) FILTER (WHERE h."redirectLogId" IS NULL) AS "outsideConsentedJourneys",
      count(*) FILTER (WHERE h."exactSearch" = TRUE) AS "exactSearchLinks",
      count(*) FILTER (WHERE h."redirectLogId" IS NOT NULL AND h."exactSearch" = FALSE) AS "eligibleWithoutExactSearch",
      count(*) FILTER (WHERE nullif(r."metadata"->>'requestId', '') IS NOT NULL) AS "withRequestId"
    FROM "RedirectLog" r
    LEFT JOIN eligible_handoff_redirects h ON h."redirectLogId" = r."id"
    WHERE r."createdAt" >= ${new Date(scope.from)}
      AND r."createdAt" < ${new Date(scope.to)}
      AND r."metadata"->>'environment' = ${scope.environment}`;
}

function count(value: Count) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error("Invalid admin aggregate.");
  return result;
}
function text(value: string | null, max = 160) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || null;
}
function safePath(value: string | null) {
  if (!value) return null;
  const path = journeySourcePath(value);
  return path && isJourneySourcePath(path) ? path : null;
}
function safeDomain(value: string | null) {
  try {
    if (!value) return null;
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.hostname.slice(0, 253) : null;
  } catch { return null; }
}
function journeyDto(row: JourneyRecord): AdminJourneyRow {
  return {
    id: row.id,
    identity: { kind: row.userId ? "registered" : "guest", visitorId: row.visitorId, userId: row.userId },
    startedAt: row.startedAt.toISOString(), firstEventAt: row.firstEventAt.toISOString(), lastEventAt: row.lastEventAt.toISOString(),
    products: (row.products ?? []).filter((product): product is AdminJourneyProduct => adminJourneyProducts.includes(product as AdminJourneyProduct)),
    providers: row.providers.slice(0, 10).map(provider => text(provider, 100)).filter((provider): provider is string => Boolean(provider)),
    providerCount: count(row.providerCount), eventCount: count(row.eventCount), searchCount: count(row.searchCount),
    stages: { SEARCH_COMPLETED: count(row.searchCompleted), RESULTS_VIEWED: count(row.resultsViewed),
      FLIGHT_DETAILS_VIEWED: count(row.flightDetailsViewed), OFFER_SELECTED: count(row.offerSelected),
      PROVIDER_DEAL_SELECTED: count(row.providerDealSelected), PROVIDER_HANDOFF_STARTED: count(row.handoffStarted) },
  };
}
function eventDto(row: EventRecord): AdminJourneyEvent {
  const page = row.type === "PAGE_VIEW" ? toAdminPageView({ id: row.id, createdAt: row.createdAt, metadata: row.pageViewMetadata, userId: row.pageViewUserId }, (row.pageViewMetadata as { environment?: string } | null)?.environment === "staging" ? "staging" : "production") : null;
  return {
    id: row.id, type: row.type, createdAt: row.createdAt.toISOString(), product: row.product,
    ...(page?.pageView ? { pageView: { ...page.pageView, label: page.label } } : {}),
    observedResult: ["RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED", "FLIGHT_DETAILS_VIEWED", "RESULT_SAVED", "RESULT_UNSAVED", "RESULT_SHARED"].includes(row.type) ? safeObservedResult(row.observedResult) : null,
    filterGroup: row.type === "SEARCH_FILTER_APPLIED" && ["all", "price", "stops", "airlines", "airports", "duration", "baggage", "stars", "facilities", "roomTypes", "vehicle", "transmission", "other"].includes(row.filterGroup ?? "") ? row.filterGroup : null,
    sortMode: row.type === "SEARCH_SORT_CHANGED" && ["price", "best", "fastest", "stops", "rating", "recommended", "other"].includes(row.sortMode ?? "") ? row.sortMode : null,
    sortChoice: row.type === "SEARCH_SORT_CHANGED" && ["best", "cheapest", "fastest", "stops", "bestValue", "topRated", "recommended", "lowestTotal", "price", "duration", "departure-asc", "departure-desc"].includes(row.sortChoice ?? "") ? row.sortChoice : null,
    ...(row.type === "SEARCH_EDIT_APPLIED" ? { editFields: safeJourneySearchEditFields(row.editFields, row.product ?? row.searchProduct) } : {}),
    filterSelections: row.type === "SEARCH_FILTER_APPLIED" && Array.isArray(row.filterSelections)
      ? row.filterSelections.slice(0, 20).flatMap((choice: unknown) => {
          if (!choice || typeof choice !== "object" || Array.isArray(choice)) return [];
          const entry = choice as Record<string, unknown>;
          if (typeof entry.group !== "string" || typeof entry.option !== "string") return [];
          if (!/^[A-Za-z][A-Za-z0-9]{0,30}$/.test(entry.group) || !/^[\p{L}\p{N} ._:+\-']{1,72}$/u.test(entry.option)) return [];
          return [{ group: entry.group, option: entry.option }];
        }) : null,
    ...(row.type === "PRICE_ALERT_CREATED" && /^(TARGET|AUTOMATIC)$/.test(row.alertMode ?? "")
      && /^[A-Z]{3}$/.test(row.alertCurrency ?? "")
      ? { alertDetails: {
          mode: row.alertMode as "TARGET" | "AUTOMATIC", currency: row.alertCurrency!,
          targetPrice: row.alertTargetPrice && /^\d{1,12}(?:\.\d{1,2})?$/.test(row.alertTargetPrice) ? row.alertTargetPrice : null,
          baselinePrice: row.alertBaselinePrice && /^\d{1,12}(?:\.\d{1,2})?$/.test(row.alertBaselinePrice) ? row.alertBaselinePrice : null,
        } } : {}),
    ...(["RESULT_SAVED", "RESULT_UNSAVED", "RESULT_SHARED", "FLIGHT_DETAILS_VIEWED", "OFFER_SELECTED", "PROVIDER_DEAL_SELECTED", "RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED"].includes(row.type) ? {
      action: ["local_saved", "local_unsaved", "saved_item_confirmed", "saved_item_removed", "share_link_copied", "share_sheet_completed", "share_sheet_requested"].includes(row.action ?? "")
        ? row.action as AdminJourneyEvent["action"] : null,
      resultReference: row.resultReference && /^[A-Za-z0-9._:+~=-]{1,128}$/.test(row.resultReference) ? row.resultReference : null,
    } : {}),
    provider: text(row.provider, 100), sourcePage: safePath(row.sourcePage),
    search: row.searchHistoryId && row.searchProduct && row.searchStatus ? {
      id: row.searchHistoryId, requestId: row.requestId, product: row.searchProduct,
      origin: text(row.origin), destination: text(row.destination), checkIn: row.checkIn?.toISOString() ?? null, checkOut: row.checkOut?.toISOString() ?? null,
      status: row.searchStatus, resultCount: count(row.resultCount ?? 0), latencyMs: row.latencyMs,
      ...(row.searchProduct === "HOTEL" ? { hotelPropertyCount: recordedHotelPropertyCount(row.searchProduct, row.searchQuery, row.resultCount) } : {}),
      details: safeAdminJourneySearchDetails(row.searchProduct, row.searchQuery),
    } : null,
    handoff: row.redirectLogId ? {
      id: row.redirectLogId, provider: text(row.redirectProvider, 100) ?? "Unknown provider", route: text(row.route),
      destinationDomain: safeDomain(row.destinationUrl), searchCorrelation: row.searchHistoryId ? "exact" : "unavailable",
    } : null,
  };
}
function summaryDto(
  scope: AdminJourneyScope,
  row: SummaryRecord,
  operational: OperationalRecord,
  handoffs: OperationalHandoffRecord,
): AdminJourneySummary {
  const prefixes = ["searchCompleted", "resultsViewed", "flightDetailsViewed", "offerSelected", "providerDealSelected", "handoffStarted"] as const;
  const stages = Object.fromEntries(adminJourneyStages.map((stage, index) => {
    const prefix = prefixes[index];
    return [stage, { identities: count(row[`${prefix}Identities`]), journeys: count(row[`${prefix}Journeys`]), events: count(row[`${prefix}Events`]) }];
  })) as AdminJourneySummary["stages"];
  const searches: AdminJourneySearchCounts = { total: count(row.searches), success: count(row.successfulSearches), partial: count(row.partialSearches), failed: count(row.failedSearches) };
  const totalRedirects = count(handoffs.total);
  const withVisitorIdentity = count(handoffs.withVisitorIdentity);
  const withoutVisitorIdentity = count(handoffs.withoutVisitorIdentity);
  const inConsentedJourneys = count(handoffs.inConsentedJourneys);
  const outsideConsentedJourneys = count(handoffs.outsideConsentedJourneys);
  const exactSearchLinks = count(handoffs.exactSearchLinks);
  const eligibleWithoutExactSearch = count(handoffs.eligibleWithoutExactSearch);
  const withRequestId = count(handoffs.withRequestId);
  const flights = count(handoffs.flights);
  const hotels = count(handoffs.hotels);
  const cars = count(handoffs.cars);
  // A broken aggregate must not turn missing data into a convincing zero.
  if (
    totalRedirects !== withVisitorIdentity + withoutVisitorIdentity ||
    totalRedirects !== inConsentedJourneys + outsideConsentedJourneys ||
    inConsentedJourneys !== exactSearchLinks + eligibleWithoutExactSearch ||
    withRequestId > totalRedirects ||
    flights + hotels + cars !== totalRedirects ||
    inConsentedJourneys > withVisitorIdentity
  ) throw new Error("Inconsistent operational handoff coverage.");
  return {
    scope, identities: { total: count(row.identities), guests: count(row.guests), registered: count(row.registered), registeredAccounts: count(row.registeredAccounts) },
    journeys: count(row.journeys), rawEvents: count(row.rawEvents), stages, recordedSearches: searches,
    handoffCorrelation: { exactEvents: count(row.exactHandoffs), uncorrelatedEvents: count(row.uncorrelatedHandoffs) },
    operationalHandoffs: {
      scope: "environment_and_date_only",
      total: totalRedirects,
      withVisitorIdentity,
      withoutVisitorIdentity,
      inConsentedJourneys,
      outsideConsentedJourneys,
      exactSearchLinks,
      eligibleWithoutExactSearch,
      withRequestId,
      flights,
      hotels,
      cars,
    },
    operationalSearches: { scope: "environment_and_date_only", total: count(operational.total), success: count(operational.success), partial: count(operational.partial), failed: count(operational.failed), partialWithResults: count(operational.partialWithResults ?? 0), partialWithoutResults: count(operational.partialWithoutResults ?? 0) },
  };
}

export function createAdminJourneyService(dependencies: Dependencies) {
  async function read<T>(kind: AdminJourneyQueryKind, input: AdminJourneyQueryInput, work: (tx: Prisma.TransactionClient, query: AdminJourneyQuery) => Promise<AdminJourneyResult<T>>, journeyId?: string, calendarTimeZone?: string): Promise<AdminJourneyResult<T>> {
    try {
      // Authorization precedes validation and storage, including for direct server-component callers.
      if (!(await dependencies.authorize())) return { status: "forbidden" };
      const parsed = parseAdminJourneyQuery(input, kind, (dependencies.now ?? (() => new Date()))(), dependencies.environment(), journeyId, calendarTimeZone);
      if (parsed.status !== "ok") return parsed;
      const database = dependencies.database();
      if (!database) return { status: "unavailable" };
      return await database.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL statement_timeout = '4000ms'`;
        return work(tx, parsed.data);
      }, { isolationLevel: "RepeatableRead", maxWait: 1000, timeout: 10000 });
    } catch {
      return { status: "unavailable" };
    }
  }

  return {
    list(input: AdminJourneyQueryInput = {}, calendarTimeZone?: string): Promise<AdminJourneyResult<AdminJourneyList>> {
      return read<AdminJourneyList>("list", input, async (tx, query) => {
        const records = await tx.$queryRaw<JourneyRecord[]>(listSql(query));
        const page = records.slice(0, query.limit);
        const last = page.at(-1);
        return { status: "ok", data: { scope: query.scope, items: page.map(journeyDto), nextCursor: records.length > query.limit && last ? encodeAdminJourneyCursor({ version: 1, kind: "list", at: last.lastEventAt.toISOString(), id: last.id, scope: query.scope }) : null } };
      }, undefined, calendarTimeZone);
    },
    detail(journeyId: string, input: AdminJourneyQueryInput = {}, calendarTimeZone?: string): Promise<AdminJourneyResult<AdminJourneyDetail>> {
      return read<AdminJourneyDetail>("detail", input, async (tx, query) => {
        const [journey] = await tx.$queryRaw<JourneyRecord[]>(listSql(query, journeyId));
        if (!journey) return { status: "not_found" };
        const records = await tx.$queryRaw<EventRecord[]>(detailSql(query, journeyId));
        const page = records.slice(0, query.limit);
        const last = page.at(-1);
        return { status: "ok", data: { scope: query.scope, journey: journeyDto(journey), events: page.map(eventDto), nextCursor: records.length > query.limit && last ? encodeAdminJourneyCursor({ version: 1, kind: "detail", journeyId, at: last.createdAt.toISOString(), id: last.id, scope: query.scope }) : null } };
      }, journeyId, calendarTimeZone);
    },
    summary(input: AdminJourneyQueryInput = {}, calendarTimeZone?: string): Promise<AdminJourneyResult<AdminJourneySummary>> {
      return read<AdminJourneySummary>("summary", input, async (tx, query) => {
        const [row] = await tx.$queryRaw<SummaryRecord[]>(summarySql(query.scope));
        const [operational] = await tx.$queryRaw<OperationalRecord[]>(operationalSql(query.scope));
        const [handoffs] = await tx.$queryRaw<OperationalHandoffRecord[]>(operationalHandoffsSql(query.scope));
        if (!row || !operational || !handoffs) throw new Error("Missing journey summary aggregates.");
        return { status: "ok", data: summaryDto(query.scope, row, operational, handoffs) };
      }, undefined, calendarTimeZone);
    },
  };
}

export type AdminJourneyService = ReturnType<typeof createAdminJourneyService>;
