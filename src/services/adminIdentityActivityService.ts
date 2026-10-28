import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { eligibleGuestVisitorWhere, eligibleJourneyLinkedVisitorWhere, eligibleLinkedVisitorWhere, mergeAdminActivity, toAdminJourneyActivity, type ActivityRow, type IdentityKind } from "@/lib/adminIdentityJourney";
import {
  ACTIVITY_FETCH_LIMIT, ACTIVITY_PAGE_SIZE, activityEnvironmentScope, activityWindow, allowedActivityStages,
  decodeActivityCursor, encodeActivityCursor, excludeCanonicalLegacyRows, latestVisibleActivityAt, legacyStageLabelMatchesQuery, sourceActivitySeek,
  type ActivityFilters, type JourneyStage,
} from "@/lib/adminIdentityActivity";
import { escapePrismaContainsQuery } from "@/lib/adminIdentityDirectory";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";

const journeySelect = {
  id: true, type: true, product: true, provider: true, createdAt: true,
  searchHistoryId: true, redirectLogId: true,
  journey: { select: { id: true, visitorId: true, startedAt: true } },
  searchHistory: { select: { visitorId: true, userId: true, type: true, origin: true, destination: true, status: true } },
  redirectLog: { select: { visitorId: true, userId: true, type: true, provider: true, route: true } },
} as const;

const safeAnalyticsLabels = {
  SAVE: "Saved item",
  ALERT_CREATED: "Price alert created",
  SIGNUP: "Account signup",
  SUPPORT_TICKET: "Support ticket",
  PROVIDER_FAILURE: "Provider issue",
} as const;
type SafeAnalyticsType = keyof typeof safeAnalyticsLabels;

export type IdentityActivitySummary = {
  searches: number;
  resultsViewed: number;
  providerHandoffs: number;
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
): Promise<ActivityReadResult> {
  const environment = getPublicEnvironment();
  const cursor = decodeActivityCursor(cursorInput, kind, id, filters, environment);
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
    const analyticsOwner: Prisma.AnalyticsEventWhereInput = kind === "guest"
      ? { userId: null, visitorId: id, visitor: { is: eligibleGuestVisitorWhere(id) } }
      : { userId: id };
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
          ...(["FLIGHT", "HOTEL"].includes(product)
            ? [{ redirectLog: { is: { type: product as "FLIGHT" | "HOTEL" } } }] : []),
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

    // The timeline is cursor-paginated. Reuse these *unpaginated* predicates for
    // database aggregates so Activity summary always reflects all matching records,
    // including events on earlier and later pages.
    const journeyWhere: Prisma.JourneyEventWhereInput = {
      AND: [scopedJourneyOwner, { type: { in: stages } }, { createdAt: window }, productEventFilter, eventQ],
    };
    const searchWhere: Prisma.SearchHistoryWhereInput = {
      AND: [
        searchOwner, environmentScope.search, { createdAt: window },
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
        ...(product === "FLIGHT" || product === "HOTEL" ? [{ type: product }] : []),
        ...(q && !legacyStageLabelMatchesQuery("PROVIDER_HANDOFF_STARTED", q)
          ? [{ OR: [{ provider: ci(q) }, { route: ci(q) }] }] : []),
      ],
    };
    const analyticsWhere: Prisma.AnalyticsEventWhereInput = {
      AND: [
        analyticsOwner, environmentScope.analytics, { createdAt: window },
        { type: { in: Object.keys(safeAnalyticsLabels) as SafeAnalyticsType[] } },
        ...(q ? [{ type: { in: (Object.keys(safeAnalyticsLabels) as SafeAnalyticsType[])
          .filter(type => safeAnalyticsLabels[type].toLowerCase().includes(q.toLowerCase())) } }] : []),
      ],
    };
    const canReadHandoffs = allowed.has("PROVIDER_HANDOFF_STARTED")
      && (!product || product === "FLIGHT" || product === "HOTEL");

    // Only count canonical events that the timeline itself can display.
    // Each attached source must belong to the *same* visitor as its journey;
    // matching any other linked visitor for this account is insufficient.
    const primaryReferenceRequired: Prisma.JourneyEventWhereInput = {
      OR: [
        { type: "PROVIDER_HANDOFF_STARTED", redirectLogId: { not: null } },
        { type: { in: ["SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED"] }, searchHistoryId: { not: null } },
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

    // A repeatable-read snapshot keeps canonical + legacy de-duplication stable
    // when a source record and its JourneyEvent are inserted concurrently.
    // The timeline, all totals and every visitor-ID batch observe one snapshot.
    const [journey, searches, handoffs, analytics, canonicalCounts, legacySearchTotal, legacyHandoffTotal] =
      await db.$transaction(async tx => {
        const counts = new Map<string, number>();
        const countVisitorBatch = async (visitorIds: string[]) => {
          if (!visitorIds.length) return;
          const grouped = await tx.journeyEvent.groupBy({
            by: ["type"],
            where: {
              AND: [journeyWhere, primaryReferenceRequired,
                { OR: visitorIds.map(visitorId => canonicalForVisitor(visitorId)) }],
            },
            _count: { _all: true },
          });
          for (const row of grouped) {
            counts.set(row.type, (counts.get(row.type) ?? 0) + row._count._all);
          }
        };
        if (stages.length && !isOperationalGuest) {
          if (kind === "guest") {
            await countVisitorBatch([id]);
          } else {
            // Bound the query size without capping the number of linked visitors
            // or loading full event records into application memory.
            let lastVisitorId: string | null = null;
            for (;;) {
              const batch = await tx.visitor.findMany({
                where: eligibleJourneyLinkedVisitorWhere(id),
                select: { id: true },
                orderBy: { id: "asc" },
                take: 100,
                ...(lastVisitorId ? { cursor: { id: lastVisitorId }, skip: 1 } : {}),
              });
              if (!batch.length) break;
              await countVisitorBatch(batch.map(visitor => visitor.id));
              if (batch.length < 100) break;
              lastVisitorId = batch[batch.length - 1].id;
            }
          }
        }

        // Page reads remain bounded; count queries reuse the same scope but
        // deliberately omit the pagination cursor.
        const [pageJourney, pageSearches, pageHandoffs, pageAnalytics, searchTotal, handoffTotal] = await Promise.all([
          stages.length && !isOperationalGuest ? tx.journeyEvent.findMany({
            where: { AND: [journeyWhere, sourceActivitySeek(cursor, "j", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }],
            take: ACTIVITY_FETCH_LIMIT, select: journeySelect,
          }) : Promise.resolve([]),
          allowed.has("SEARCH_COMPLETED") ? tx.searchHistory.findMany({
            where: { AND: [searchWhere, sourceActivitySeek(cursor, "s", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }],
            take: ACTIVITY_FETCH_LIMIT,
            select: { id: true, type: true, origin: true, destination: true, status: true, createdAt: true },
          }) : Promise.resolve([]),
          canReadHandoffs ? tx.redirectLog.findMany({
            where: { AND: [handoffWhere, sourceActivitySeek(cursor, "r", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }], take: ACTIVITY_FETCH_LIMIT,
            select: { id: true, type: true, provider: true, route: true, createdAt: true },
          }) : Promise.resolve([]),
          allowed.has("ACCOUNT_ACTIVITY") && !product && !isOperationalGuest ? tx.analyticsEvent.findMany({
            where: { AND: [analyticsWhere, sourceActivitySeek(cursor, "e", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }], take: ACTIVITY_FETCH_LIMIT,
            select: { id: true, type: true, createdAt: true },
          }) : Promise.resolve([]),
          allowed.has("SEARCH_COMPLETED") ? tx.searchHistory.count({ where: searchWhere }) : Promise.resolve(0),
          canReadHandoffs ? tx.redirectLog.count({ where: handoffWhere }) : Promise.resolve(0),
        ]);
        return [pageJourney, pageSearches, pageHandoffs, pageAnalytics, counts, searchTotal, handoffTotal] as const;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30_000 });

    const summary: IdentityActivitySummary = {
      searches: (canonicalCounts.get("SEARCH_COMPLETED") ?? 0) + legacySearchTotal,
      resultsViewed: canonicalCounts.get("RESULTS_VIEWED") ?? 0,
      providerHandoffs: (canonicalCounts.get("PROVIDER_HANDOFF_STARTED") ?? 0) + legacyHandoffTotal,
    };

    const canonical = journey.flatMap(event => {
      const row = toAdminJourneyActivity(event, kind, id);
      return row ? [row] : [];
    });
    const legacy: ActivityRow[] = [
      ...searches.map(s => ({
        id: "s-" + s.id, stage: "SEARCH_COMPLETED" as const, product: s.type,
        searchHistoryId: s.id, dedupeKey: "search:" + s.id,
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
        const label = safeAnalyticsLabels[a.type as SafeAnalyticsType];
        return label ? [{
          id: "e-" + a.id, stage: "ACCOUNT_ACTIVITY" as const,
          label, detail: "Recorded account activity", at: a.createdAt,
        }] : [];
      }),
    ];
    const sorted = mergeAdminActivity(canonical, legacy, ACTIVITY_FETCH_LIMIT * 4, order);
    const page = sorted.slice(0, ACTIVITY_PAGE_SIZE);
    const last = page.at(-1);
    const hasMore = sorted.length > ACTIVITY_PAGE_SIZE
      || [journey.length, searches.length, handoffs.length, analytics.length]
        .some(count => count === ACTIVITY_FETCH_LIMIT);

    return {
      status: "ok",
      data: {
        id, kind, environment,
        title: isOperationalGuest ? "Guest session" : kind === "guest" ? "Guest visitor" : account?.name || account?.email || "Registered user",
        email: account?.email ?? null,
        role: account?.role ?? null,
        status: account?.status ?? "Anonymous",
        firstSeenAt: account?.createdAt ?? visitor?.firstSeenAt ?? operationalFirstSeen!,
        lastSeenAt: visitor?.lastSeenAt ?? operationalLastSeen ?? latestVisibleActivityAt(page),
        source: kind === "user" ? "account" : isOperationalGuest ? "operational" : "visitor",
        events: page,
        summary,
        nextCursor: hasMore && last ? encodeActivityCursor(last, kind, id, filters, environment) : null,
      },
    };
  } catch (error) {
    // Admin must distinguish an unavailable database from genuinely empty activity.
    console.error("[admin-identity-activity] query unavailable", error);
    return { status: "unavailable" };
  }
}
