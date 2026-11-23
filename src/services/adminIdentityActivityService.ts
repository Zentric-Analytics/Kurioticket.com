import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { eligibleGuestVisitorWhere, eligibleJourneyLinkedVisitorWhere, eligibleJourneyEventCandidateWhere, eligibleLinkedVisitorWhere, mergeAdminActivity, toAdminJourneyActivity, type ActivityRow, type IdentityKind } from "@/lib/adminIdentityJourney";
import {
  ACTIVITY_FETCH_LIMIT, ACTIVITY_PAGE_SIZE, activityEnvironmentScope, activityWindow, allowedActivityStages,
  decodeActivityCursor, encodeActivityCursor, excludeCanonicalLegacyRows, latestVisibleActivityAt, legacyStageLabelMatchesQuery, sourceActivitySeek,
  type ActivityCursor, type ActivityFilters, type JourneyStage,
} from "@/lib/adminIdentityActivity";
import { completeActivityReadTimeout, readCompleteActivitySource, type ActivitySourcePrefix, type ActivitySourceRow } from "@/lib/adminIdentityActivityComplete";
import { adminRegisteredLastSeenSql, escapePrismaContainsQuery } from "@/lib/adminIdentityDirectory";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";

const journeySelect = {
  id: true, type: true, product: true, provider: true, createdAt: true, metadata: true,
  searchHistoryId: true, redirectLogId: true,
  journey: { select: { id: true, visitorId: true, startedAt: true } },
  searchHistory: { select: { visitorId: true, userId: true, type: true, origin: true, destination: true, status: true, resultCount: true, query: true } },
  redirectLog: { select: { visitorId: true, userId: true, type: true, provider: true, route: true } },
} as const;

const safeAnalyticsLabels = {
  SAVE: "Saved item",
  SHARE: "Shared result",
  ALERT_CREATED: "Price alert activity",
  SIGNUP: "Account signup",
  SUPPORT_TICKET: "Support ticket",
  PROVIDER_FAILURE: "Provider issue",
} as const;
const safeInteractionNames: Record<string, string> = {
  saved_item_confirmed: "Save confirmed",
  saved_item_removed: "Unsaved item",
  local_saved: "Saved locally",
  local_unsaved: "Removed local save",
  share_link_copied: "Result link copied",
  share_sheet_completed: "Share sheet completed",
  price_alert_created: "Price alert enabled",
  price_alert_paused: "Price alert paused",
  price_alert_reactivated: "Price alert resumed",
  price_alert_deleted: "Price alert deleted",
};
function safeSearchPlatform(value: unknown): "WEB" | "IOS" | "ANDROID" | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = (value as Record<string, unknown>).applicationSource;
  return source === "WEB" || source === "IOS" || source === "ANDROID" ? source : null;
}

function safeActivityMetadata(value: unknown): { product: string | null; detail: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { product: null, detail: "Recorded account activity" };
  const item = value as Record<string, unknown>;
  // Legacy Save/Unsave rows may contain savedType without product.
  // Display that verified stored product without altering historical records.
  // Search-only saves need their original searchType; never guess it.
  const stored = typeof item.product === "string" ? item.product : null;
  const inferred = stored ?? (typeof item.savedType === "string" && ["flight", "hotel", "car"].includes(item.savedType)
    ? item.savedType.toUpperCase() : null);
  const product = inferred && ["FLIGHT", "HOTEL", "CAR", "PACKAGE"].includes(inferred) ? inferred : null;
  const ref = [item.resultId, item.savedItemId, item.alertId].find(id => typeof id === "string"
    && id.length <= 128 && /^[a-zA-Z0-9._:-]+$/.test(id)) as string | undefined;
  const source = item.applicationSource === "WEB" ? "Web"
    : item.applicationSource === "IOS" ? "iOS"
      : item.applicationSource === "ANDROID" ? "Android" : null;
  return { product, detail: [product ? product.charAt(0) + product.slice(1).toLowerCase() : null,
    source, ref ? "Reference: " + ref : null].filter(Boolean).join(" · ") || "Recorded account activity" };
}
type SafeAnalyticsType = keyof typeof safeAnalyticsLabels;

export type IdentityActivitySummary = {
  searches: number;
  /** Available on complete reads; uses the same authorized, merged timeline. */
  searchProducts?: { flights: number; hotels: number; cars: number; other: number };
  resultsViewed: number;
  offersSelected: number;
  providerHandoffs: number;
  /** Distinct authorized journeys containing at least one matching recorded event. */
  journeysTracked: number;
};

export type IdentityActivityRecord = {
  id: string;
  kind: IdentityKind;
  title: string;
  email: string | null;
  role: string | null;
  status: string;
  firstSeenAt: Date;
  lastSeenAt: Date | null;
  /** False only when the separate recorded-observation read fails. */
  lastSeenAvailable?: boolean;
  events: ActivityRow[];
  /** Exact matching record counts across all pages, never the current cursor page. */
  summary: IdentityActivitySummary;
  nextCursor: string | null;
  environment: PublicEnvironment;
  /** Operational search records do not imply a consented analytics identity. */
  source: "account" | "visitor" | "operational";
};
export type ActivityReadResult =
  | { status: "ok"; data: IdentityActivityRecord }
  | { status: "not_found" | "unavailable" | "invalid_cursor" };

/** Re-authorize before calling. Never expose token hashes or raw analytics metadata. */
export async function loadAdminIdentityActivity(
  kind: IdentityKind, id: string, filters: ActivityFilters, cursorInput?: string,
  readMode: "page" | "all" = "page",
): Promise<ActivityReadResult> {
  const environment = getPublicEnvironment();
  const complete = readMode === "all";
  const startedAt = Date.now();
  let phase = "identity_lookup";
  let preflightMilliseconds = 0;
  let candidateMilliseconds = 0;
  let snapshotMilliseconds = 0;
  let candidateBatches = 0;
  const cursor = complete ? undefined : decodeActivityCursor(cursorInput, kind, id, filters, environment);
  if (cursor === null) return { status: "invalid_cursor" };
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const environmentScope = activityEnvironmentScope(environment);
    const account = kind === "user" ? await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    }) : null;
    const visitor = kind === "guest" ? await db.visitor.findFirst({
      where: eligibleGuestVisitorWhere(id),
      select: { id: true, firstSeenAt: true, lastSeenAt: true },
    }) : null;
    if (kind === "user" && !account) return { status: "not_found" };
    const isOperationalGuest = kind === "guest" && !visitor;
    // One guest activity reader serves both consented visitor IDs and the
    // short-lived operational session IDs. The history rows themselves persist
    // after the signed credential expires. Never interpret either as a person.
    const operationalSearchOwner: Prisma.SearchHistoryWhereInput = {
      AND: [
        { userId: null, visitorId: null },
        { query: { path: ["operationalSessionId"], equals: id } },
        environmentScope.search,
      ],
    };
    const operationalRedirectOwner: Prisma.RedirectLogWhereInput = {
      AND: [
        { userId: null, visitorId: null },
        { metadata: { path: ["operationalSessionId"], equals: id } },
        environmentScope.handoff,
      ],
    };
    let operationalFirstSeen: Date | null = null;
    let operationalLastSeen: Date | null = null;
    if (isOperationalGuest) {
      // One aggregate reads each source once, rather than scanning the two
      // operational JSON keys four times for separate first/last timestamps.
      // Retained rows remain readable after the 30-minute credential expires.
      const [times] = await db.$queryRaw<Array<{ firstSeenAt: Date | null; lastSeenAt: Date | null }>>(Prisma.sql`
        SELECT MIN(activity."createdAt") AS "firstSeenAt",
          MAX(activity."createdAt") AS "lastSeenAt"
        FROM (
          SELECT s."createdAt"
          FROM "SearchHistory" s
          WHERE s."userId" IS NULL AND s."visitorId" IS NULL
            AND s."query"->>'operationalSessionId' = ${id}
            AND s."query"->>'environment' = ${environment}
          UNION ALL
          SELECT r."createdAt"
          FROM "RedirectLog" r
          WHERE r."userId" IS NULL AND r."visitorId" IS NULL
            AND r."metadata"->>'operationalSessionId' = ${id}
            AND r."metadata"->>'environment' = ${environment}
        ) activity
      `);
      if (!times?.firstSeenAt || !times.lastSeenAt) return { status: "not_found" };
      operationalFirstSeen = times.firstSeenAt;
      operationalLastSeen = times.lastSeenAt;
    }

    // Account-owned history is explicit. Formerly anonymous records are visible only if
    // the visitor has ongoing consent and an exclusive link to this verified identity.
    const linked = eligibleLinkedVisitorWhere(id);
    const searchOwner: Prisma.SearchHistoryWhereInput = isOperationalGuest ? operationalSearchOwner : kind === "guest"
      ? { userId: null, visitorId: id, visitor: { is: eligibleGuestVisitorWhere(id) } }
      : { OR: [{ userId: id }, { userId: null, visitor: { is: linked } }] };
    const redirectOwner: Prisma.RedirectLogWhereInput = isOperationalGuest ? operationalRedirectOwner : kind === "guest"
      ? { userId: null, visitorId: id, visitor: { is: eligibleGuestVisitorWhere(id) } }
      : { OR: [{ userId: id }, { userId: null, visitor: { is: linked } }] };
    // The registered timeline includes consented pre-login events belonging
    // to exclusively linked visitors. Never take other accounts' events,
    // withdrawn identities, or anonymous operational records as account history.
    const analyticsOwner: Prisma.AnalyticsEventWhereInput = kind === "guest"
      ? { userId: null, visitorId: id, visitor: { is: eligibleGuestVisitorWhere(id) } }
      : { OR: [
          { userId: id },
          { userId: null, visitor: { is: linked } },
        ] };
    const journeyOwner: Prisma.JourneyEventWhereInput = {
      journey: { visitor: kind === "guest" ? eligibleGuestVisitorWhere(id) : eligibleJourneyLinkedVisitorWhere(id) },
    };

    const allowed = allowedActivityStages(filters);
    const stages = [...allowed].filter(stage => stage !== "ACCOUNT_ACTIVITY") as JourneyStage[];
    const product = filters.product === "all" ? null : filters.product;
    const q = filters.q ? escapePrismaContainsQuery(filters.q) : "";
    const ci = (value: string) => ({ contains: value, mode: "insensitive" as const });
    const window = activityWindow(filters);
    const order = filters.order === "oldest" ? "oldest" : "newest";
    const createdAtDirection = order === "oldest" ? "asc" : "desc";
    const scopedJourneyOwner: Prisma.JourneyEventWhereInput = { AND: [journeyOwner, environmentScope.journey] };

    const productEventFilter: Prisma.JourneyEventWhereInput = product
      ? { OR: [
          { product },
          { searchHistory: { is: { type: product } } },
          ...(["FLIGHT", "HOTEL", "CAR"].includes(product)
            ? [{ redirectLog: { is: { type: product as "FLIGHT" | "HOTEL" | "CAR" } } }] : []),
        ] } : {};
    const eventQ: Prisma.JourneyEventWhereInput = q ? {
      OR: [
        { provider: ci(q) },
        { searchHistory: { is: { origin: ci(q) } } },
        { searchHistory: { is: { destination: ci(q) } } },
        { redirectLog: { is: { provider: ci(q) } } },
        { redirectLog: { is: { route: ci(q) } } },
        ...stages.filter(stage => stage.replaceAll("_", " ").toLowerCase().includes(q.toLowerCase()))
          .map(type => ({ type })),
      ],
    } : {};

    // Complete timelines and summary aggregates share these unpaginated predicates.
    // Legacy paged callers add a seek only when reading their requested page.
    const journeyWhere: Prisma.JourneyEventWhereInput = {
      AND: [scopedJourneyOwner, { type: { in: stages } }, { createdAt: window }, productEventFilter, eventQ],
    };
    const searchWhere: Prisma.SearchHistoryWhereInput = {
      AND: [
        searchOwner, environmentScope.search, { createdAt: window }, { countAsSearch: true },
        ...(isOperationalGuest ? [] : [excludeCanonicalLegacyRows("SEARCH_COMPLETED", scopedJourneyOwner, window, productEventFilter, eventQ)]),
        ...(product ? [{ type: product }] : []),
        ...(q && !legacyStageLabelMatchesQuery("SEARCH_COMPLETED", q) ? [{ OR: [
          { origin: ci(q) }, { destination: ci(q) },
          ...(product?.toLowerCase().includes(q.toLowerCase()) ? [{ type: product }] : []),
        ] }] : []),
      ],
    };
    const handoffWhere: Prisma.RedirectLogWhereInput = {
      AND: [
        redirectOwner, environmentScope.handoff, { createdAt: window },
        ...(isOperationalGuest ? [] : [excludeCanonicalLegacyRows("PROVIDER_HANDOFF_STARTED", scopedJourneyOwner, window, productEventFilter, eventQ)]),
        ...(product === "FLIGHT" || product === "HOTEL" || product === "CAR" ? [{ type: product }] : []),
        ...(q && !legacyStageLabelMatchesQuery("PROVIDER_HANDOFF_STARTED", q)
          ? [{ OR: [{ provider: ci(q) }, { route: ci(q) }] }] : []),
      ],
    };
    const analyticsWhere: Prisma.AnalyticsEventWhereInput = {
      AND: [
        analyticsOwner, environmentScope.analytics, { createdAt: window },
        { type: { in: Object.keys(safeAnalyticsLabels) as SafeAnalyticsType[] } },
        // The dedicated interaction tab excludes signup, support and provider
        // diagnostics while All activity keeps their operational audit trail.
        ...(filters.tab === "interactions" ? [{
          OR: [{ type: "SAVE" as const }, { type: "SHARE" as const }, { type: "ALERT_CREATED" as const }],
        }] : []),
        ...(product ? [{ OR: [
          { metadata: { path: ["product"], equals: product } },
          // Only legacy SAVEs missing a product may match their saved type.
          // Do not change SHARE/ALERT product semantics or infer saved searches.
          ...(product !== "PACKAGE" ? [{ AND: [
            { type: "SAVE" as const },
            { name: "saved_item_removed" },
            { metadata: { path: ["savedType"], equals: product.toLowerCase() } },
          ] }] : []),
        ] }] : []),
        ...(q ? [{ OR: [
          { type: { in: (Object.keys(safeAnalyticsLabels) as SafeAnalyticsType[])
            .filter(type => safeAnalyticsLabels[type].toLowerCase().includes(q.toLowerCase())) } },
          { name: { in: Object.keys(safeInteractionNames)
            .filter(name => safeInteractionNames[name].toLowerCase().includes(q.toLowerCase())) } },
        ] }] : []),
      ],
    };
    const canReadHandoffs = allowed.has("PROVIDER_HANDOFF_STARTED")
      && (!product || product === "FLIGHT" || product === "HOTEL" || product === "CAR");
    // Candidate selection is a strict superset of final canonical events:
    // use the indexed journey relationship and time/type before evaluating
    // expensive ownership checks for each visitor.
    const candidateVisitors = kind === "user" && stages.length
      ? eligibleJourneyEventCandidateWhere(id, stages, window)
      : null;

    // Only count canonical events that the timeline itself can display.
    // Each attached source must belong to the *same* visitor as its journey;
    // matching any other linked visitor for this account is insufficient.
    const primaryReferenceRequired: Prisma.JourneyEventWhereInput = {
      OR: [
        { type: "PROVIDER_HANDOFF_STARTED", redirectLogId: { not: null } },
        { type: { in: ["SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED",
          "RESULT_SAVED", "RESULT_UNSAVED", "RESULT_SHARED", "PRICE_ALERT_CREATED"] }, searchHistoryId: { not: null } },
      ],
    };
    const canonicalForVisitor = (visitorId: string): Prisma.JourneyEventWhereInput => {
      const searchReference: Prisma.SearchHistoryWhereInput = kind === "guest"
        ? { visitorId, userId: null }
        : { visitorId, OR: [{ userId: null }, { userId: id }] };
      const handoffReference: Prisma.RedirectLogWhereInput = kind === "guest"
        ? { visitorId, userId: null }
        : { visitorId, OR: [{ userId: null }, { userId: id }] };
      return {
        AND: [
          { journey: { visitorId } },
          { OR: [{ searchHistoryId: null }, { searchHistory: { is: searchReference } }] },
          { OR: [{ redirectLogId: null }, { redirectLog: { is: handoffReference } }] },
        ],
      };
    };

    // Estimate complete-read work before opening the snapshot so its transaction
    // budget grows with the full filtered history. These counts are never used to
    // stop fetching; new matching rows are still included by the snapshot reads.
    phase = "complete_preflight";
    const preflightAt = Date.now();
    const readVolume = complete ? await Promise.all([
      stages.length && !isOperationalGuest ? db.journeyEvent.count({ where: journeyWhere }) : Promise.resolve(0),
      allowed.has("SEARCH_COMPLETED") ? db.searchHistory.count({ where: searchWhere }) : Promise.resolve(0),
      canReadHandoffs ? db.redirectLog.count({ where: handoffWhere }) : Promise.resolve(0),
      allowed.has("ACCOUNT_ACTIVITY") && !isOperationalGuest
        ? db.analyticsEvent.count({ where: analyticsWhere }) : Promise.resolve(0),
      candidateVisitors
        ? db.visitor.count({ where: candidateVisitors }) : Promise.resolve(0),
    ]) : null;
    preflightMilliseconds = Date.now() - preflightAt;
    const transactionTimeout = readVolume
      ? completeActivityReadTimeout(readVolume.slice(0, 4), readVolume[4])
      : 30_000;
    phase = "activity_snapshot";
    const snapshotAt = Date.now();

    // A repeatable-read snapshot keeps canonical + legacy de-duplication stable
    // when a source record and its JourneyEvent are inserted concurrently.
    // The timeline, all totals and every visitor-ID batch observe one snapshot.
    const [journey, searches, handoffs, analytics, canonicalCounts, legacySearchTotal, legacyHandoffTotal, journeysTracked] =
      await db.$transaction(async tx => {
        const counts = new Map<string, number>();
        let distinctJourneyCount = 0;
        const countVisitorBatch = async (visitorIds: string[]) => {
          if (!visitorIds.length) return;
          // Count only events whose referenced records belong to the same authorized
          // visitor as their journey. Reuse the exact stage/date/product/text filters.
          const validEvents: Prisma.JourneyEventWhereInput = {
            AND: [journeyWhere, primaryReferenceRequired,
              { OR: visitorIds.map(visitorId => canonicalForVisitor(visitorId)) }],
          };
          const grouped = await tx.journeyEvent.groupBy({
            by: ["type"],
            where: validEvents,
            _count: { _all: true },
          });
          for (const row of grouped) {
            counts.set(row.type, (counts.get(row.type) ?? 0) + row._count._all);
          }
          // SearchJourney is unique by ID: count distinct journeys server-side
          // within the same repeatable-read snapshot, not from the current page.
          // The existing "Journeys tracked" funnel metric retains its
          // original four-stage meaning. Newly visible saved/shared/alert
          // actions do not silently inflate this established metric.
          const funnelEvents: Prisma.JourneyEventWhereInput = {
            AND: [validEvents, { type: { in: [
              "SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED", "PROVIDER_HANDOFF_STARTED",
            ] } }],
          };
          distinctJourneyCount += await tx.searchJourney.count({
            where: { visitorId: { in: visitorIds }, events: { some: funnelEvents } },
          });
        };
        phase = "journey_ownership_counts";
        if (stages.length && !isOperationalGuest) {
          if (kind === "guest") {
            await countVisitorBatch([id]);
          } else {
            // Only candidate visitors with matching stage/time events need
            // reference-ownership checks. The final count still revalidates
            // every event and its referenced record against this same visitor.
            // Keep batches bounded; no visitor or event count is capped.
            let lastVisitorId: string | null = null;
            const candidateAt = Date.now();
            for (;;) {
              const batch: Array<{ id: string }> = await tx.visitor.findMany({
                where: candidateVisitors!,
                select: { id: true },
                orderBy: { id: "asc" },
                take: 100,
                ...(lastVisitorId ? { cursor: { id: lastVisitorId }, skip: 1 } : {}),
              });
              if (!batch.length) break;
              candidateBatches++;
              await countVisitorBatch(batch.map(visitor => visitor.id));
              if (batch.length < 100) break;
              lastVisitorId = batch[batch.length - 1].id;
            }
            candidateMilliseconds = Date.now() - candidateAt;
          }
        }

        phase = "activity_source_reads";
        // Complete mode drains every source in bounded internal batches within
        // this same snapshot. The browser receives all matching records upfront.
        const readSource = <T extends ActivitySourceRow>(
          prefix: ActivitySourcePrefix,
          fetchBatch: (after: ActivityCursor | undefined, take: number) => Promise<T[]>,
        ): Promise<T[]> => complete
          ? readCompleteActivitySource(prefix, fetchBatch)
          : fetchBatch(cursor, ACTIVITY_FETCH_LIMIT);
        const [pageJourney, pageSearches, pageHandoffs, pageAnalytics, searchTotal, handoffTotal] = await Promise.all([
          stages.length && !isOperationalGuest ? readSource("j", (after, take) => tx.journeyEvent.findMany({
            where: { AND: [journeyWhere, sourceActivitySeek(after, "j", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }],
            take, select: journeySelect,
          })) : Promise.resolve([]),
          allowed.has("SEARCH_COMPLETED") ? readSource("s", (after, take) => tx.searchHistory.findMany({
            where: { AND: [searchWhere, sourceActivitySeek(after, "s", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }],
            take,
            select: { id: true, type: true, origin: true, destination: true, status: true, resultCount: true, query: true, createdAt: true },
          })) : Promise.resolve([]),
          canReadHandoffs ? readSource("r", (after, take) => tx.redirectLog.findMany({
            where: { AND: [handoffWhere, sourceActivitySeek(after, "r", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }], take,
            select: { id: true, type: true, provider: true, route: true, createdAt: true },
          })) : Promise.resolve([]),
          allowed.has("ACCOUNT_ACTIVITY") && !isOperationalGuest ? readSource("e", (after, take) => tx.analyticsEvent.findMany({
            where: { AND: [analyticsWhere, sourceActivitySeek(after, "e", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }], take,
            select: { id: true, type: true, name: true, metadata: true, createdAt: true },
          })) : Promise.resolve([]),
          allowed.has("SEARCH_COMPLETED") ? tx.searchHistory.count({ where: searchWhere }) : Promise.resolve(0),
          canReadHandoffs ? tx.redirectLog.count({ where: handoffWhere }) : Promise.resolve(0),
        ]);
        return [pageJourney, pageSearches, pageHandoffs, pageAnalytics, counts, searchTotal, handoffTotal, distinctJourneyCount] as const;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: transactionTimeout });
    snapshotMilliseconds = Date.now() - snapshotAt;

    const summary: IdentityActivitySummary = {
      searches: (canonicalCounts.get("SEARCH_COMPLETED") ?? 0) + legacySearchTotal,
      resultsViewed: canonicalCounts.get("RESULTS_VIEWED") ?? 0,
      offersSelected: canonicalCounts.get("OFFER_SELECTED") ?? 0,
      providerHandoffs: (canonicalCounts.get("PROVIDER_HANDOFF_STARTED") ?? 0) + legacyHandoffTotal,
      journeysTracked,
    };

    const canonical = journey.flatMap(event => {
      // All eligible canonical stages are visible to the authorized activity
      // reader; the existing five top-level metrics still count only their
      // original funnel categories. Never turn an account audit into a journey.
      const row = toAdminJourneyActivity(event, kind, id);
      return row ? [{
        ...row,
        platform: safeSearchPlatform(event.searchHistory?.query),
        resultCount: event.searchHistory?.resultCount ?? null,
      }] : [];
    });
    const legacy: ActivityRow[] = [
      ...searches.map(s => ({
        id: "s-" + s.id, stage: "SEARCH_COMPLETED" as const, product: s.type,
        searchHistoryId: s.id, dedupeKey: "search:" + s.id,
        platform: safeSearchPlatform(s.query), resultCount: s.resultCount,
        label: "Search completed", detail: [s.type, [s.origin, s.destination].filter(Boolean).join(" → "), s.status].filter(Boolean).join(" · "),
        at: s.createdAt,
      })),
      ...handoffs.map(r => ({
        id: "r-" + r.id, stage: "PROVIDER_HANDOFF_STARTED" as const, product: r.type, provider: r.provider,
        redirectLogId: r.id, dedupeKey: "handoff:" + r.id,
        label: "Provider handoff started", detail: [r.type, r.route, r.provider].filter(Boolean).join(" · "),
        at: r.createdAt,
      })),
      ...analytics.flatMap(a => {
        // Once the same interaction has a verified canonical JourneyEvent, it
        // belongs to that journey's Event History, not Unlinked Other Activity.
        const meta = a.metadata && typeof a.metadata === "object" && !Array.isArray(a.metadata)
          ? a.metadata as Record<string, unknown> : null;
        if (typeof meta?.linkedJourneyId === "string" && typeof meta?.linkedSearchHistoryId === "string") return [];
        const baseLabel = safeAnalyticsLabels[a.type as SafeAnalyticsType];
        if (!baseLabel) return [];
        const safe = safeActivityMetadata(a.metadata);
        return [{
          id: "e-" + a.id, stage: "ACCOUNT_ACTIVITY" as const,
          label: safeInteractionNames[a.name] ?? baseLabel,
          detail: safe.detail, product: safe.product, at: a.createdAt,
        }];
      }),
    ];
    const sorted = mergeAdminActivity(canonical, legacy, complete ? canonical.length + legacy.length : ACTIVITY_FETCH_LIMIT * 4, order);
    if (complete) {
      const products = { flights: 0, hotels: 0, cars: 0, other: 0 };
      for (const row of sorted) {
        if (row.stage !== "SEARCH_COMPLETED") continue;
        if (row.product === "FLIGHT") products.flights++;
        else if (row.product === "HOTEL") products.hotels++;
        else if (row.product === "CAR") products.cars++;
        else products.other++;
      }
      summary.searchProducts = products;
    }
    const page = complete ? sorted : sorted.slice(0, ACTIVITY_PAGE_SIZE);
    const last = page.at(-1);
    const hasMore = !complete && (sorted.length > ACTIVITY_PAGE_SIZE
      || [journey.length, searches.length, handoffs.length, analytics.length]
        .some(count => count === ACTIVITY_FETCH_LIMIT));

    const totalMilliseconds = Date.now() - startedAt;
    if (totalMilliseconds > 2_000) {
      // Aggregate-only timings. No IDs, names, emails, raw filters or
      // customer records in logs; log only unusually slow activity reads.
      console.warn("[admin-identity-activity] slow read", {
        kind, mode: readMode, phase: "complete", totalMilliseconds,
        preflightMilliseconds, snapshotMilliseconds, candidateMilliseconds,
        candidateBatches, canonicalEvents: journey.length,
        recordedEvents: sorted.length,
      });
    }
    let accountLastSeen: Date | null = null;
    let lastSeenAvailable = true;
    if (account) {
      try {
        // This is the exact unfiltered observation expression used by Users Directory.
        // A login/heartbeat is a last-seen observation, NOT a search/journey event.
        const [observation] = await db.$queryRaw<Array<{ lastSeenAt: Date | null }>>(Prisma.sql`
          SELECT ${adminRegisteredLastSeenSql(environment)} AS "lastSeenAt"
          FROM "User" u WHERE u."id" = ${id}
        `);
        if (!observation) throw new Error("Recorded account observation missing");
        accountLastSeen = observation.lastSeenAt;
      } catch {
        lastSeenAvailable = false;
      }
    }
    return {
      status: "ok",
      data: {
        id, kind, environment,
        title: isOperationalGuest ? "Guest session" : kind === "guest" ? "Guest visitor" : account?.name || account?.email || "Registered user",
        email: account?.email ?? null,
        role: account?.role ?? null,
        status: account?.status ?? "Anonymous",
        firstSeenAt: account?.createdAt ?? visitor?.firstSeenAt ?? operationalFirstSeen!,
        lastSeenAt: account ? accountLastSeen : visitor?.lastSeenAt ?? operationalLastSeen ?? latestVisibleActivityAt(page),
        lastSeenAvailable,
        source: kind === "user" ? "account" : isOperationalGuest ? "operational" : "visitor",
        events: page,
        summary,
        nextCursor: hasMore && last ? encodeActivityCursor(last, kind, id, filters, environment) : null,
      },
    };
  } catch (error) {
    // Log a stage and safe error category, never raw SQL, identifiers or
    // customer attributes. Database infrastructure logs capture the detail.
    const category = error instanceof Error ? error.name : "UnknownError";
    console.error("[admin-identity-activity] query unavailable", {
      kind, mode: readMode, phase, category, elapsedMilliseconds: Date.now() - startedAt,
      preflightMilliseconds, candidateMilliseconds, candidateBatches,
    });
    return { status: "unavailable" };
  }
}
