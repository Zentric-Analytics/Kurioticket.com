import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { eligibleGuestVisitorWhere, eligibleJourneyLinkedVisitorWhere, eligibleLinkedVisitorWhere, mergeAdminActivity, toAdminJourneyActivity, type ActivityRow, type IdentityKind } from "@/lib/adminIdentityJourney";
import {
  ACTIVITY_FETCH_LIMIT, ACTIVITY_PAGE_SIZE, activityEnvironmentScope, activityWindow, allowedActivityStages,
  decodeActivityCursor, encodeActivityCursor, excludeCanonicalLegacyRows, legacyStageLabelMatchesQuery, sourceActivitySeek,
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
  nextCursor: string | null;
  environment: PublicEnvironment;
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
    const account = kind === "user" ? await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    }) : null;
    const visitor = kind === "guest" ? await db.visitor.findFirst({
      where: eligibleGuestVisitorWhere(id),
      select: { id: true, firstSeenAt: true, lastSeenAt: true },
    }) : null;
    if (kind === "user" ? !account : !visitor) return { status: "not_found" };

    // Account-owned history is explicit. Formerly anonymous records are visible only if
    // the visitor has ongoing consent and an exclusive link to this verified identity.
    const linked = eligibleLinkedVisitorWhere(id);
    const searchOwner: Prisma.SearchHistoryWhereInput = kind === "guest"
      ? { userId: null, visitorId: id, visitor: { is: eligibleGuestVisitorWhere(id) } }
      : { OR: [{ userId: id }, { userId: null, visitor: { is: linked } }] };
    const redirectOwner: Prisma.RedirectLogWhereInput = kind === "guest"
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
    const environmentScope = activityEnvironmentScope(environment);
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

    // Each source is separately seek-paginated in its own existing index.
    // Bounded per-source reads prevent a busy visitor from loading their full history.
    const [journey, searches, handoffs, analytics] = await Promise.all([
      stages.length ? db.journeyEvent.findMany({
        where: { AND: [scopedJourneyOwner, { type: { in: stages } }, { createdAt: window }, sourceActivitySeek(cursor, "j"), productEventFilter, eventQ] },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: ACTIVITY_FETCH_LIMIT, select: journeySelect,
      }) : Promise.resolve([]),
      allowed.has("SEARCH_COMPLETED") ? db.searchHistory.findMany({
        where: { AND: [
          searchOwner, environmentScope.search, { createdAt: window }, sourceActivitySeek(cursor, "s"),
          excludeCanonicalLegacyRows("SEARCH_COMPLETED", scopedJourneyOwner, window, productEventFilter, eventQ),
          ...(product ? [{ type: product }] : []),
          ...(q && !legacyStageLabelMatchesQuery("SEARCH_COMPLETED", q) ? [{ OR: [
            { origin: ci(q) }, { destination: ci(q) },
            ...(product?.toLowerCase().includes(q.toLowerCase()) ? [{ type: product }] : []),
          ] }] : []),
        ] },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        take: ACTIVITY_FETCH_LIMIT,
        select: { id: true, type: true, origin: true, destination: true, status: true, createdAt: true },
      }) : Promise.resolve([]),
      allowed.has("PROVIDER_HANDOFF_STARTED") && (!product || product === "FLIGHT" || product === "HOTEL")
        ? db.redirectLog.findMany({
          where: { AND: [
            redirectOwner, environmentScope.handoff, { createdAt: window }, sourceActivitySeek(cursor, "r"),
            excludeCanonicalLegacyRows("PROVIDER_HANDOFF_STARTED", scopedJourneyOwner, window, productEventFilter, eventQ),
            ...(product ? [{ type: product }] : []),
            ...(q && !legacyStageLabelMatchesQuery("PROVIDER_HANDOFF_STARTED", q) ? [{ OR: [{ provider: ci(q) }, { route: ci(q) }] }] : []),
          ] },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: ACTIVITY_FETCH_LIMIT,
          select: { id: true, type: true, provider: true, route: true, createdAt: true },
        }) : Promise.resolve([]),
      allowed.has("ACCOUNT_ACTIVITY") && !product ? db.analyticsEvent.findMany({
        where: { AND: [
          analyticsOwner, environmentScope.analytics, { createdAt: window }, sourceActivitySeek(cursor, "e"),
          { type: { in: Object.keys(safeAnalyticsLabels) as SafeAnalyticsType[] } },
          ...(q ? [{ type: { in: (Object.keys(safeAnalyticsLabels) as SafeAnalyticsType[])
            .filter(type => safeAnalyticsLabels[type].toLowerCase().includes(q.toLowerCase())) } }] : []),
        ] },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: ACTIVITY_FETCH_LIMIT,
        select: { id: true, type: true, createdAt: true },
      }) : Promise.resolve([]),
    ]);

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
    const sorted = mergeAdminActivity(canonical, legacy, ACTIVITY_FETCH_LIMIT * 4);
    const page = sorted.slice(0, ACTIVITY_PAGE_SIZE);
    const last = page.at(-1);
    const hasMore = sorted.length > ACTIVITY_PAGE_SIZE
      || [journey.length, searches.length, handoffs.length, analytics.length]
        .some(count => count === ACTIVITY_FETCH_LIMIT);

    return {
      status: "ok",
      data: {
        id, kind, environment,
        title: kind === "guest" ? "Guest visitor" : account?.name || account?.email || "Registered user",
        email: account?.email ?? null,
        role: account?.role ?? null,
        status: account?.status ?? "Anonymous",
        firstSeenAt: account?.createdAt ?? visitor!.firstSeenAt,
        lastSeenAt: visitor?.lastSeenAt ?? (cursor ? null : page[0]?.at ?? null),
        events: page,
        nextCursor: hasMore && last ? encodeActivityCursor(last, kind, id, filters, environment) : null,
      },
    };
  } catch (error) {
    // Admin must distinguish an unavailable database from genuinely empty activity.
    console.error("[admin-identity-activity] query unavailable", error);
    return { status: "unavailable" };
  }
}
