import { recordedHotelPropertyCount } from "@/lib/hotels/hotelResultAccounting";
import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { eligibleGuestVisitorWhere, eligibleJourneyLinkedVisitorWhere, eligibleJourneyEventCandidateWhere, eligibleLinkedVisitorWhere, journeyActivityLabels, mergeAdminActivity, recordedSearchContext, sharedJourneyActionLabels, toAdminJourneyActivity, type ActivityRow, type IdentityKind, type JourneyEventRecord } from "@/lib/adminIdentityJourney";
import {
  ACTIVITY_OVERVIEW_LIMIT, ACTIVITY_PAGE_SIZE, activityEnvironmentScope, activityWindow, allowedActivityStages,
  activityJourneyStages, decodeActivityCursor, encodeActivityCursor, excludeCanonicalLegacyRows, latestVisibleActivityAt, legacyStageLabelMatchesQuery, sourceActivitySeek,
  type ActivityCursor, type ActivityFilters,
} from "@/lib/adminIdentityActivity";
import { completeActivityReadTimeout, countEligibleActivitySource, readCompleteActivitySource, readEligibleActivitySource, type ActivitySourcePrefix, type ActivitySourceRow } from "@/lib/adminIdentityActivityComplete";
import { visitorFreeAccountAnalyticsWhere } from "@/lib/adminAnalyticsVisibility";
import { essentialAccountAuditPurpose } from "@/lib/activityTrackingContract";
import { adminRegisteredLastSeenSql, escapePrismaContainsQuery } from "@/lib/adminIdentityDirectory";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import { pageViewCatalog, pageViewInfo, type PageViewKey } from "@/lib/pageViewCatalog";
import { toAdminPageView } from "@/lib/adminPageView";
import { handoffEvidenceForActivitySql } from "@/services/adminHandoffEvidence";
import { isPageHistoryPlatform, pageHistoryPlatformValues, pageHistoryTransport, validPageHistoryPage, type PageHistoryPlatform } from "@/lib/adminPageHistory";
import { adminSecurityAuditActivityWhere, toAdminSecurityAuditActivity } from "@/lib/adminSecurityAuditActivity";
import { safeObservedResult } from "@/lib/adminObservedResult";

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
  ...sharedJourneyActionLabels,
  price_alert_created: "Price alert enabled",
  price_alert_paused: "Price alert paused",
  price_alert_reactivated: "Price alert resumed",
  price_alert_deleted: "Price alert deleted",
  package_search_submitted: "Package search submitted",
};
function safeSearchPlatform(value: unknown): "WEB" | "IOS" | "ANDROID" | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = (value as Record<string, unknown>).applicationSource;
  return source === "WEB" || source === "IOS" || source === "ANDROID" ? source : null;
}

function safeReportedActionPlatform(value: unknown): ActivityRow["reportedActionPlatform"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const platform = (value as Record<string, unknown>).platform;
  if (platform === "Desktop web (reported)" || platform === "Mobile web (reported)"
    || platform === "iOS app (reported)" || platform === "Android app (reported)") return platform;
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
type AnalyticsActivityRecord = ActivitySourceRow & {
  type: string; name: string; metadata: unknown; userId: string | null; visitorId: string | null;
  /** Snapshot-only proof for current direct-owner Essential audits; never stored. */
  essentialAuditReplacement?: boolean;
};

function essentialAuditLink(event: AnalyticsActivityRecord, kind: IdentityKind, id: string) {
  // Purpose is not authorization. Only the current account mutation writer's
  // direct-owner, visitor-free records can use this fallback. Retain the
  // existing suppression policy for optional and unclassified historical rows.
  if (kind !== "user" || event.userId !== id || event.visitorId !== null
    || !event.metadata || typeof event.metadata !== "object" || Array.isArray(event.metadata)) return null;
  const metadata = event.metadata as Record<string, unknown>;
  if (metadata.recordPurpose !== essentialAccountAuditPurpose || metadata.outcome !== "confirmed"
    || typeof metadata.linkedJourneyId !== "string" || typeof metadata.linkedSearchHistoryId !== "string") return null;
  const type = event.type === "SAVE" && event.name === "saved_item_confirmed" ? "RESULT_SAVED"
    : event.type === "SAVE" && event.name === "saved_item_removed" ? "RESULT_UNSAVED"
      : event.type === "ALERT_CREATED" && event.name === "price_alert_created" ? "PRICE_ALERT_CREATED" : null;
  if (!type) return null;
  return { type, journeyId: metadata.linkedJourneyId, searchHistoryId: metadata.linkedSearchHistoryId,
    eventKey: (type === "PRICE_ALERT_CREATED" ? "price-alert:" : "saved-audit:") + event.id } as const;
}

/** One projection is shared by page filling, exact counts and final output. */
function analyticsActivityRow(event: AnalyticsActivityRecord, environment: PublicEnvironment): ActivityRow | null {
  if (event.type === "PAGE_VIEW") return toAdminPageView(event, environment);
  // A current Essential audit is replaced only by its exact eligible canonical
  // event in this view. Withdrawal can hide optional journey evidence without
  // erasing the account operation. Other historical suppression is unchanged.
  const meta = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
    ? event.metadata as Record<string, unknown> : null;
  if (typeof meta?.linkedJourneyId === "string" && typeof meta?.linkedSearchHistoryId === "string"
    && event.essentialAuditReplacement !== false) return null;
  const isPackageSubmission = event.type === "SEARCH" && event.name === "package_search_submitted";
  const baseLabel = isPackageSubmission ? safeInteractionNames.package_search_submitted : safeAnalyticsLabels[event.type as SafeAnalyticsType];
  if (!baseLabel) return null;
  const safe = safeActivityMetadata(event.metadata);
  const observedResult = meta?.observedSource === "customer_display" ? safeObservedResult(meta.observedResult) : null;
  const reportedActionPlatform = safeReportedActionPlatform(meta);
  return {
    id: "e-" + event.id, stage: isPackageSubmission ? "PACKAGE_SEARCH_SUBMITTED" : "ACCOUNT_ACTIVITY",
    label: safeInteractionNames[event.name] ?? baseLabel,
    detail: safe.detail, product: safe.product, at: event.createdAt,
    platform: safeSearchPlatform(event.metadata), platformSource: "action",
    ...(meta?.interface === "customer" || event.type !== "PROVIDER_FAILURE" ? { interface: "customer" as const } : {}),
    ...(event.userId ? { originalIdentity: "registered" as const } : event.visitorId ? { originalIdentity: "guest" as const } : {}),
    ...(observedResult ? { observedResult } : {}),
    ...(reportedActionPlatform ? { reportedActionPlatform } : {}),
  };
}

export type IdentityActivitySummary = {
  searches: number;
  /** Exact eligible action count, including pages; excludes passive access observations. */
  recordedActions?: number;
  /** Exact page-view total under the selected filters. */
  pagesVisited?: number;
  /** Available on complete and summary reads; uses the same authorized records. */
  searchProducts?: { flights: number; hotels: number; cars: number; packages?: number; other: number };
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
  readMode: "page" | "all" | "summary" = "page",
  pageHistory?: { page: number; platform: PageHistoryPlatform },
  authorizeSecurityAudit?: () => Promise<boolean>,
): Promise<ActivityReadResult> {
  const environment = getPublicEnvironment();
  const complete = readMode === "all";
  const overview = readMode === "summary";
  const includeSearchProducts = complete || overview;
  const sourceLimit = overview ? ACTIVITY_OVERVIEW_LIMIT : ACTIVITY_PAGE_SIZE + 1;
  if (pageHistory && (readMode !== "page" || filters.tab !== "pages" || cursorInput || !validPageHistoryPage(pageHistory.page) || !isPageHistoryPlatform(pageHistory.platform))) return { status: "invalid_cursor" };
  const startedAt = Date.now();
  let phase = "identity_lookup";
  let preflightMilliseconds = 0;
  let candidateMilliseconds = 0;
  let snapshotMilliseconds = 0;
  let candidateBatches = 0;
  const cursor = complete || overview ? undefined : decodeActivityCursor(cursorInput, kind, id, filters, environment);
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
    // A withdrawn or account-linked Visitor must never be reinterpreted as an
    // operational session with the same imported ID. Recheck on the canonical
    // page even when navigation previously verified a current guest owner.
    if (kind === "guest" && !visitor && await db.visitor.findUnique({ where: { id }, select: { id: true } })) {
      return { status: "not_found" };
    }
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
    // Direct account ownership only suffices for visitor-free account
    // activity. Any Visitor-backed row remains subject to current consent
    // and the same exclusive linkage as page and journey records.
    const accountVisitor = eligibleJourneyLinkedVisitorWhere(id);
    const analyticsOwner: Prisma.AnalyticsEventWhereInput = kind === "guest"
      ? { userId: null, visitorId: id, visitor: { is: eligibleGuestVisitorWhere(id) } }
      : { OR: [
          { userId: id, ...visitorFreeAccountAnalyticsWhere() },
          { OR: [{ userId: id }, { userId: null }], visitor: { is: accountVisitor } },
        ] };
    const journeyOwner: Prisma.JourneyEventWhereInput = {
      journey: { visitor: kind === "guest" ? eligibleGuestVisitorWhere(id) : eligibleJourneyLinkedVisitorWhere(id) },
    };

    const allowed = allowedActivityStages(filters);
    const stages = activityJourneyStages.filter(stage => allowed.has(stage));
    const readPages = allowed.has("PAGE_VIEW") && !isOperationalGuest;
    const readDirectShares = filters.stage === "RESULT_SHARED" && allowed.has("RESULT_SHARED");
    const readAccountActivity = (allowed.has("ACCOUNT_ACTIVITY") || allowed.has("PACKAGE_SEARCH_SUBMITTED") || readDirectShares) && !isOperationalGuest;
    const canReadAnalytics = readPages || readAccountActivity;
    const product = filters.product === "all" ? null : filters.product;
    const q = filters.q ? escapePrismaContainsQuery(filters.q) : "";
    const ci = (value: string) => ({ contains: value, mode: "insensitive" as const });
    const window = activityWindow(filters);
    const auditWhere = kind === "user" && !product && allowed.has("ADMIN_SECURITY_AUDIT") && await authorizeSecurityAudit?.()
      ? adminSecurityAuditActivityWhere(id, environment, window, filters.q) : null;
    const order = !overview && filters.order === "oldest" ? "oldest" : "newest";
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
        ...stages.filter(stage => stage.replaceAll("_", " ").toLowerCase().includes(q.toLowerCase())
          || journeyActivityLabels[stage].toLowerCase().includes(q.toLowerCase()))
          .map(type => ({ type })),
        ...(stages.includes("RESULT_SHARED") ? Object.entries(sharedJourneyActionLabels)
          .filter(([, label]) => label.toLowerCase().includes(filters.q.toLowerCase()))
          .map(([action]) => ({ type: "RESULT_SHARED" as const, metadata: { path: ["action"], equals: action } })) : []),
      ],
    } : {};

    // Complete timelines and summary aggregates share these unpaginated predicates.
    // Legacy paged callers add a seek only when reading their requested page.
    const journeyWhere: Prisma.JourneyEventWhereInput = {
      AND: [scopedJourneyOwner, { type: { in: stages } }, { createdAt: window }, productEventFilter, eventQ],
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
    const guestReplacementReferences = kind === "guest" ? canonicalForVisitor(id) : undefined;
    const searchScope: Prisma.SearchHistoryWhereInput = {
      AND: [
        searchOwner, environmentScope.search, { createdAt: window }, { countAsSearch: true },
        ...(product ? [{ type: product }] : []),
        ...(q && !legacyStageLabelMatchesQuery("SEARCH_COMPLETED", q) ? [{ OR: [
          { origin: ci(q) }, { destination: ci(q) },
          ...(product?.toLowerCase().includes(q.toLowerCase()) ? [{ type: product }] : []),
        ] }] : []),
      ],
    };
    const searchWhere: Prisma.SearchHistoryWhereInput = { AND: [searchScope,
      ...(isOperationalGuest ? [] : [excludeCanonicalLegacyRows("SEARCH_COMPLETED", scopedJourneyOwner, window, productEventFilter, eventQ, guestReplacementReferences)]),
    ] };
    const handoffScope: Prisma.RedirectLogWhereInput = {
      AND: [
        redirectOwner, environmentScope.handoff, { createdAt: window },
        ...(product === "FLIGHT" || product === "HOTEL" || product === "CAR" ? [{ type: product }] : []),
        ...(q && !legacyStageLabelMatchesQuery("PROVIDER_HANDOFF_STARTED", q)
          ? [{ OR: [{ provider: ci(q) }, { route: ci(q) }] }] : []),
      ],
    };
    const handoffWhere: Prisma.RedirectLogWhereInput = { AND: [handoffScope,
      ...(isOperationalGuest ? [] : [excludeCanonicalLegacyRows("PROVIDER_HANDOFF_STARTED", scopedJourneyOwner, window, productEventFilter, eventQ, guestReplacementReferences)]),
    ] };
    // Page views are optional behaviour, not account-audit evidence. Recheck
    // the linked visitor's current eligibility even for direct account rows.
    const pageOwner: Prisma.AnalyticsEventWhereInput = kind === "guest"
      ? { userId: null, visitorId: id, visitor: { is: eligibleGuestVisitorWhere(id) } }
      : { OR: [{ userId: id }, { userId: null }], visitor: { is: accountVisitor } };
    const pageKeys = (Object.keys(pageViewCatalog) as PageViewKey[]).filter(key => {
      const info = pageViewInfo(key)!;
      const text = [info.label, info.webPath, info.nativePath].join(" ").toLowerCase();
      return (!product || info.product === product)
        && (!q || text.includes(filters.q.toLowerCase()) || "page visited".includes(filters.q.toLowerCase()));
    });
    const platforms = pageHistory ? pageHistoryPlatformValues(pageHistory.platform) : [];
    const platformTransport = pageHistory ? pageHistoryTransport(pageHistory.platform) : null;
    const pageWhere: Prisma.AnalyticsEventWhereInput = {
      AND: [pageOwner, { type: "PAGE_VIEW", name: "page_viewed" }, environmentScope.analytics, { createdAt: window },
        { OR: (["web", "native"] as const).map(transport => ({
          AND: [{ metadata: { path: ["transport"], equals: transport } },
            { OR: pageKeys.filter(key => transport === "web" ? pageViewInfo(key)?.webPath : pageViewInfo(key)?.nativePath)
              .map(key => ({ metadata: { path: ["pageKey"], equals: key } })) }],
        })) },
        ...(platforms.length ? [{ OR: platforms.map(platform => ({ metadata: { path: ["platform"], equals: platform } })) }] : []),
        ...(platformTransport ? [{ metadata: { path: ["transport"], equals: platformTransport } }] : []),
      ],
    };
    const accountAnalyticsTypes: SafeAnalyticsType[] = filters.tab === "interactions" ? ["SAVE", "SHARE", "ALERT_CREATED"]
      : (Object.keys(safeAnalyticsLabels) as SafeAnalyticsType[]).filter(type => filters.interface !== "customer" || type !== "PROVIDER_FAILURE");
    const accountAnalyticsWhere: Prisma.AnalyticsEventWhereInput = {
      AND: [
        analyticsOwner, environmentScope.analytics, { createdAt: window },
        { OR: [
          ...(allowed.has("ACCOUNT_ACTIVITY") ? [{ type: { in: accountAnalyticsTypes } }] : []),
          ...(allowed.has("PACKAGE_SEARCH_SUBMITTED") ? [{ type: "SEARCH" as const, name: "package_search_submitted" }] : []),
          ...(readDirectShares ? [{ type: "SHARE" as const, name: { in: Object.keys(sharedJourneyActionLabels) } }] : []),
          ...(allowed.has("ACCOUNT_ACTIVITY") && filters.interface === "customer" && filters.tab !== "interactions" ? [{
            type: "PROVIDER_FAILURE" as const, metadata: { path: ["interface"], equals: "customer" },
          }] : []),
        ] },
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
    const analyticsWhere: Prisma.AnalyticsEventWhereInput = { OR: [
      ...(readPages ? [pageWhere] : []), ...(readAccountActivity ? [accountAnalyticsWhere] : []),
    ] };
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
        { type: { in: stages.filter(stage => stage !== "PROVIDER_HANDOFF_STARTED") }, searchHistoryId: { not: null } },
      ],
    };
    // Estimate complete-read work before opening the snapshot so its transaction
    // budget grows with the full filtered history. These counts are never used to
    // stop fetching; new matching rows are still included by the snapshot reads.
    phase = "complete_preflight";
    const preflightAt = Date.now();
    const readVolume = complete || overview ? await Promise.all([
      complete && stages.length && !isOperationalGuest ? db.journeyEvent.count({ where: journeyWhere }) : Promise.resolve(0),
      complete && allowed.has("SEARCH_COMPLETED") ? db.searchHistory.count({ where: searchWhere }) : Promise.resolve(0),
      complete && canReadHandoffs ? db.redirectLog.count({ where: handoffWhere }) : Promise.resolve(0),
      (complete ? canReadAnalytics : readAccountActivity)
        ? db.analyticsEvent.count({ where: complete ? analyticsWhere : accountAnalyticsWhere }) : Promise.resolve(0),
      candidateVisitors
        ? db.visitor.count({ where: candidateVisitors }) : Promise.resolve(0),
      complete && auditWhere ? db.adminAuditLog.count({ where: auditWhere }) : Promise.resolve(0),
    ]) : null;
    preflightMilliseconds = Date.now() - preflightAt;
    const transactionTimeout = readVolume
      ? completeActivityReadTimeout([...readVolume.slice(0, 4), readVolume[5]], readVolume[4])
      : 30_000;
    phase = "activity_snapshot";
    const snapshotAt = Date.now();

    // A repeatable-read snapshot keeps canonical + legacy de-duplication stable
    // when a source record and its JourneyEvent are inserted concurrently.
    // The timeline, all totals and every visitor-ID batch observe one snapshot.
    const [journey, searches, handoffs, analytics, audits, canonicalCounts, legacySearchTotal, legacyHandoffTotal, journeysTracked, pagesVisited,
      operationalHandoffLinks, accountActivityTotal, auditTotal, searchProducts] =
      await db.$transaction(async tx => {
        const counts = new Map<string, number>();
        const searchProducts = { flights: 0, hotels: 0, cars: 0, other: 0, packages: 0 };
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
          if (includeSearchProducts && allowed.has("SEARCH_COMPLETED")) {
            // The display product uses the event value, then its exact search.
            // Count with the same fallback without downloading search history.
            const totals = await Promise.all((["FLIGHT", "HOTEL", "CAR", "PACKAGE"] as const).map(product => tx.journeyEvent.count({
              where: { AND: [validEvents, { type: "SEARCH_COMPLETED" }, { OR: [
                { product }, { product: null, searchHistory: { is: { type: product } } },
              ] }] },
            })));
            searchProducts.flights += totals[0];
            searchProducts.hotels += totals[1];
            searchProducts.cars += totals[2];
            searchProducts.packages += totals[3];
            searchProducts.other += (grouped.find(row => row.type === "SEARCH_COMPLETED")?._count._all ?? 0)
              - totals.reduce((total, count) => total + count, 0);
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
        // A malformed canonical link must not mask the valid underlying log.
        // Guests have a fixed visitor predicate in the SQL exclusion above.
        // Registered accounts can have several visitors, so compare their
        // candidate replacements with the already validated per-visitor counts.
        // Only inconsistent histories need bounded projection-based fallback;
        // ordinary reads retain their database totals and short source slices.
        const replacementStages = stages.filter(stage => stage === "SEARCH_COMPLETED" || stage === "PROVIDER_HANDOFF_STARTED");
        const replacementCounts = kind === "user" && replacementStages.length
          ? await tx.journeyEvent.groupBy({ by: ["type"],
              where: { AND: [journeyWhere, primaryReferenceRequired, { type: { in: replacementStages } }] },
              _count: { _all: true } }) : [];
        const needsReplacementValidation = (stage: "SEARCH_COMPLETED" | "PROVIDER_HANDOFF_STARTED") =>
          (replacementCounts.find(row => row.type === stage)?._count._all ?? 0) > (counts.get(stage) ?? 0);
        const validateSearchReplacements = needsReplacementValidation("SEARCH_COMPLETED");
        const validateHandoffReplacements = needsReplacementValidation("PROVIDER_HANDOFF_STARTED");
        const replacementWhere = (stage: "SEARCH_COMPLETED" | "PROVIDER_HANDOFF_STARTED") =>
          excludeCanonicalLegacyRows(stage, scopedJourneyOwner, window, productEventFilter, eventQ).journeyEvents.none;
        const hasNoValidReplacement = (row: { journeyEvents?: JourneyEventRecord[] }) => {
          if (!row.journeyEvents) throw new Error("Missing canonical replacement evidence");
          return !row.journeyEvents.some(event => toAdminJourneyActivity(event, kind, id) !== null);
        };
        const searchEligible = (row: { journeyEvents?: JourneyEventRecord[] }) =>
          !validateSearchReplacements || hasNoValidReplacement(row);
        const handoffEligible = (row: { journeyEvents?: JourneyEventRecord[] }) =>
          !validateHandoffReplacements || hasNoValidReplacement(row);
        const searchSelect = { id: true, userId: true, type: true, origin: true, destination: true, status: true, resultCount: true, query: true, createdAt: true } as const;
        const handoffSelect = { id: true, type: true, provider: true, route: true, createdAt: true } as const;
        type SearchSourceRow = Prisma.SearchHistoryGetPayload<{ select: typeof searchSelect }> & { journeyEvents?: JourneyEventRecord[] };
        type HandoffSourceRow = Prisma.RedirectLogGetPayload<{ select: typeof handoffSelect }> & { journeyEvents?: JourneyEventRecord[] };
        const readSearchBatch = (after: ActivityCursor | undefined, take: number): Promise<SearchSourceRow[]> => {
          const args = {
            where: { AND: [validateSearchReplacements ? searchScope : searchWhere, sourceActivitySeek(after, "s", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" as const }], take,
          } satisfies Prisma.SearchHistoryFindManyArgs;
          return validateSearchReplacements
            ? tx.searchHistory.findMany({ ...args, select: { ...searchSelect,
                journeyEvents: { where: replacementWhere("SEARCH_COMPLETED"), select: journeySelect } } })
            : tx.searchHistory.findMany({ ...args, select: searchSelect });
        };
        const readHandoffBatch = (after: ActivityCursor | undefined, take: number): Promise<HandoffSourceRow[]> => {
          const args = {
            where: { AND: [validateHandoffReplacements ? handoffScope : handoffWhere, sourceActivitySeek(after, "r", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" as const }], take,
          } satisfies Prisma.RedirectLogFindManyArgs;
          return validateHandoffReplacements
            ? tx.redirectLog.findMany({ ...args, select: { ...handoffSelect,
                journeyEvents: { where: replacementWhere("PROVIDER_HANDOFF_STARTED"), select: journeySelect } } })
            : tx.redirectLog.findMany({ ...args, select: handoffSelect });
        };
        const readSearchTotals = async () => {
          if (!allowed.has("SEARCH_COMPLETED")) return { total: 0, products: [] };
          if (!validateSearchReplacements) {
            const [total, products] = await Promise.all([
              tx.searchHistory.count({ where: searchWhere }),
              includeSearchProducts ? tx.searchHistory.groupBy({ by: ["type"], where: searchWhere, _count: { _all: true } }) : Promise.resolve([]),
            ]);
            return { total, products };
          }
          const products = new Map<string, number>();
          const total = await countEligibleActivitySource("s", readSearchBatch, row => {
            if (!searchEligible(row)) return false;
            if (includeSearchProducts) products.set(row.type, (products.get(row.type) ?? 0) + 1);
            return true;
          });
          return { total, products: [...products].map(([type, count]) => ({ type, _count: { _all: count } })) };
        };
        // Complete reads drain sources in bounded batches. Overview and paged
        // reads retain only enough eligible rows for their merged result, even
        // when projection removes an entire raw batch of linked duplicates.
        const readSource = <T extends ActivitySourceRow>(
          prefix: ActivitySourcePrefix,
          fetchBatch: (after: ActivityCursor | undefined, take: number) => Promise<T[]>,
          eligible: (row: T) => boolean = () => true,
        ): Promise<T[]> => complete
          ? readCompleteActivitySource(prefix, fetchBatch)
          : readEligibleActivitySource(prefix, fetchBatch, eligible, sourceLimit, cursor);
        // Page and account events compete in one chronological source. The
        // overview has five latest actions globally, without category quotas.
        const analyticsSelect = { id: true, type: true, name: true, metadata: true, createdAt: true, userId: true, visitorId: true } as const;
        const enrichEssentialAudits = async (rows: AnalyticsActivityRecord[]): Promise<AnalyticsActivityRecord[]> => {
          const candidates = new Map(rows.flatMap(row => {
            const link = essentialAuditLink(row, kind, id);
            return link ? [[link.eventKey, link] as const] : [];
          }));
          if (!candidates.size) return rows;
          const keys = [...candidates].filter(([, link]) => allowed.has(link.type)).map(([key]) => key);
          // eventKey is unique and indexed. One lookup per existing <=500-row
          // source batch shares the same snapshot and full canonical view.
          // Never add a cursor: a replacement on an earlier/later page must
          // still prevent a second presentation of the same account action.
          const replacements = keys.length ? await tx.journeyEvent.findMany({
            where: { AND: [journeyWhere, { eventKey: { in: keys } }] },
            orderBy: { id: "asc" }, take: keys.length, select: { ...journeySelect, eventKey: true },
          }) : [];
          const eligible = new Set<string>();
          for (const event of replacements) {
            const link = candidates.get(event.eventKey);
            if (link && event.type === link.type && event.journey.id === link.journeyId
              && event.searchHistoryId === link.searchHistoryId && toAdminJourneyActivity(event, kind, id)) {
              eligible.add(event.eventKey);
            }
          }
          return rows.map(row => {
            const link = essentialAuditLink(row, kind, id);
            return link ? { ...row, essentialAuditReplacement: eligible.has(link.eventKey) } : row;
          });
        };
        const readAnalyticsBatch = async (where: Prisma.AnalyticsEventWhereInput, after: ActivityCursor | undefined, take: number) =>
          enrichEssentialAudits(await tx.analyticsEvent.findMany({
            where: { AND: [where, sourceActivitySeek(after, "e", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }], take, select: analyticsSelect,
          }));
        const readAnalytics = () => {
          if (pageHistory) return readPages ? tx.analyticsEvent.findMany({
            where: pageWhere, orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            skip: (pageHistory.page - 1) * ACTIVITY_PAGE_SIZE, take: ACTIVITY_PAGE_SIZE, select: analyticsSelect,
          }) : Promise.resolve([]);
          return canReadAnalytics ? readSource("e", (after, take) => readAnalyticsBatch(analyticsWhere, after, take),
            row => analyticsActivityRow(row, environment) !== null) : Promise.resolve([]);
        };
        const [pageJourney, pageSearches, pageHandoffs, pageAnalytics, pageAudits, searchTotals, handoffTotal, pageTotal, securityAuditTotal] = await Promise.all([
          stages.length && !isOperationalGuest ? readSource("j", (after, take) => tx.journeyEvent.findMany({
            where: { AND: [journeyWhere, sourceActivitySeek(after, "j", order)] },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }],
            take, select: journeySelect,
          }), row => toAdminJourneyActivity(row, kind, id) !== null) : Promise.resolve([]),
          allowed.has("SEARCH_COMPLETED") ? readSource("s", readSearchBatch, searchEligible).then(rows => rows.filter(searchEligible)) : Promise.resolve([]),
          canReadHandoffs ? readSource("r", readHandoffBatch, handoffEligible).then(rows => rows.filter(handoffEligible)) : Promise.resolve([]),
          readAnalytics(),
          auditWhere ? readSource("a", (after, take) => tx.adminAuditLog.findMany({
            where: { AND: [auditWhere, sourceActivitySeek(after, "a", order)] },
            select: { id: true, action: true, targetType: true, createdAt: true },
            orderBy: [{ createdAt: createdAtDirection }, { id: "asc" }], take,
          })) : Promise.resolve([]),
          readSearchTotals(),
          canReadHandoffs ? validateHandoffReplacements
            ? countEligibleActivitySource("r", readHandoffBatch, handoffEligible)
            : tx.redirectLog.count({ where: handoffWhere }) : Promise.resolve(0),
          readPages ? tx.analyticsEvent.count({ where: pageWhere }) : Promise.resolve(0),
          auditWhere ? tx.adminAuditLog.count({ where: auditWhere }) : Promise.resolve(0),
        ]);
        for (const row of searchTotals.products) {
          const key = row.type === "FLIGHT" ? "flights" : row.type === "HOTEL" ? "hotels" : row.type === "CAR" ? "cars" : row.type === "PACKAGE" ? "packages" : "other";
          searchProducts[key] += row._count._all;
        }
        // Counts use exactly the same enriched audit eligibility as page filling
        // and final projection. Travel/page history remain database aggregates;
        // this scan retains one 500-row batch and its replacement evidence.
        const accountTotal = !readAccountActivity ? 0 : complete
          ? pageAnalytics.filter(row => row.type !== "PAGE_VIEW" && analyticsActivityRow(row, environment) !== null).length
          : await countEligibleActivitySource("e", (after, take) => readAnalyticsBatch(accountAnalyticsWhere, after, take),
            row => analyticsActivityRow(row, environment) !== null);
        // Resolve only rows already authorized by the identity/environment
        // scope. Bound the SQL parameter count without losing complete history.
        const operationalHandoffLinks = new Map<string, string>();
        const handoffIds = pageHandoffs.map(row => row.id);
        for (let offset = 0; offset < handoffIds.length; offset += 500) {
          const links = await tx.$queryRaw<Array<{ id: string; searchHistoryId: string | null }>>(
            handoffEvidenceForActivitySql(handoffIds.slice(offset, offset + 500), environment),
          );
          for (const link of links) if (link.searchHistoryId) operationalHandoffLinks.set(link.id, link.searchHistoryId);
        }
        return [pageJourney, pageSearches, pageHandoffs, pageAnalytics, pageAudits, counts, searchTotals.total, handoffTotal, distinctJourneyCount, pageTotal,
          operationalHandoffLinks, accountTotal, securityAuditTotal, searchProducts] as const;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: transactionTimeout });
    snapshotMilliseconds = Date.now() - snapshotAt;

    const summary: IdentityActivitySummary = {
      pagesVisited,
      recordedActions: [...canonicalCounts.values()].reduce((total, count) => total + count, 0)
        + legacySearchTotal + legacyHandoffTotal + pagesVisited + accountActivityTotal + auditTotal,
      searches: (canonicalCounts.get("SEARCH_COMPLETED") ?? 0) + legacySearchTotal,
      resultsViewed: canonicalCounts.get("RESULTS_VIEWED") ?? 0,
      offersSelected: canonicalCounts.get("OFFER_SELECTED") ?? 0,
      providerHandoffs: (canonicalCounts.get("PROVIDER_HANDOFF_STARTED") ?? 0) + legacyHandoffTotal,
      journeysTracked,
      ...(includeSearchProducts ? { searchProducts: {
        flights: searchProducts.flights, hotels: searchProducts.hotels, cars: searchProducts.cars, other: searchProducts.other,
        ...(searchProducts.packages ? { packages: searchProducts.packages } : {}),
      } } : {}),
    };

    const canonical = journey.flatMap(event => {
      // All eligible canonical stages are visible to the authorized activity
      // reader; the existing five top-level metrics still count only their
      // original funnel categories. Never turn an account audit into a journey.
      const row = toAdminJourneyActivity(event, kind, id);
      const actionPlatform = safeSearchPlatform(event.metadata);
      const reportedActionPlatform = safeReportedActionPlatform(event.metadata);
      return row ? [{
        ...row,
        platform: actionPlatform ?? safeSearchPlatform(event.searchHistory?.query),
        platformSource: actionPlatform ? "action" as const : "search" as const,
        ...(reportedActionPlatform ? { reportedActionPlatform } : {}),
        resultCount: event.searchHistory?.resultCount ?? null,
        hotelPropertyCount: recordedHotelPropertyCount(event.searchHistory?.type, event.searchHistory?.query, event.searchHistory?.resultCount),
      }] : [];
    });
    const legacy: ActivityRow[] = [
      ...searches.map(s => ({
        id: "s-" + s.id, stage: "SEARCH_COMPLETED" as const, product: s.type,
        interface: "customer" as const,
        searchHistoryId: s.id, dedupeKey: "search:" + s.id,
        platform: safeSearchPlatform(s.query), resultCount: s.resultCount,
        platformSource: "search" as const, ...recordedSearchContext(s),
        hotelPropertyCount: recordedHotelPropertyCount(s.type, s.query, s.resultCount),
        label: "Search completed", detail: [s.type, [s.origin, s.destination].filter(Boolean).join(" → "), s.status].filter(Boolean).join(" · "),
        at: s.createdAt,
      })),
      ...handoffs.map(r => ({
        id: "r-" + r.id, stage: "PROVIDER_HANDOFF_STARTED" as const, product: r.type, provider: r.provider,
        interface: "customer" as const,
        redirectLogId: r.id, dedupeKey: "handoff:" + r.id,
        searchHistoryId: operationalHandoffLinks.get(r.id) ?? null,
        label: "Provider handoff started", detail: [r.type, r.route, r.provider].filter(Boolean).join(" · "),
        at: r.createdAt,
      })),
      ...analytics.flatMap<ActivityRow>(a => {
        const row = analyticsActivityRow(a, environment);
        return row ? [row] : [];
      }),
      ...audits.flatMap(row => toAdminSecurityAuditActivity(row) ?? []),
    ];
    const sorted = mergeAdminActivity(canonical, legacy, canonical.length + legacy.length, order);
    const page = complete ? sorted : sorted.slice(0, overview ? ACTIVITY_OVERVIEW_LIMIT : ACTIVITY_PAGE_SIZE);
    const last = page.at(-1);
    const hasMore = !complete && !overview && !pageHistory && sorted.length > ACTIVITY_PAGE_SIZE;

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
