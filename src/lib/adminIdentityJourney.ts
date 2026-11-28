import type { Prisma, JourneyEventType } from "@/generated/prisma/client";
import type { ActivityIdentityAtOccurrence, ActivityInterface, ActivityOutcome } from "./activityTrackingContract";
import { safeObservedResult } from "./adminObservedResult";
import { journeySearchEditFieldLabels, safeJourneySearchEditFields } from "./search-journey";

/** Safe, read-only presentation of server-recorded journey events in Admin.
 * Never expose raw event metadata, search query JSON, or destination URLs.
 */
export type IdentityKind = "user" | "guest";

export type ActivityRow = {
  id: string;
  label: string;
  detail: string;
  at: Date;
  journeyId?: string;
  journeyStartedAt?: Date;
  dedupeKey?: string;
  stage?: JourneyEventType | "ACCOUNT_ACTIVITY" | "PAGE_VIEW" | "PACKAGE_SEARCH_SUBMITTED" | "ADMIN_SECURITY_AUDIT";
  interface?: ActivityInterface;
  originalIdentity?: ActivityIdentityAtOccurrence;
  outcome?: ActivityOutcome;
  observedResult?: NonNullable<ReturnType<typeof safeObservedResult>>;
  pageView?: {
    path: string; previousPath: string | null; transport: "web" | "native"; platform: string; href: string | null;
    interface?: "customer"; originalIdentity?: "guest" | "registered";
  };
  product?: string | null;
  provider?: string | null;
  searchHistoryId?: string | null;
  redirectLogId?: string | null;
  /** Sanitized, server-recorded platform; the source distinguishes action from search evidence. */
  platform?: "WEB" | "IOS" | "ANDROID" | null;
  platformSource?: "search" | "action";
  reportedActionPlatform?: "Desktop web (reported)" | "Mobile web (reported)" | "iOS app (reported)" | "Android app (reported)";
  /** Original stored search identity, never rewritten from a later visitor/account link. */
  originalSearchIdentity?: "registered" | "guest";
  searchOutcome?: "SUCCESS" | "PARTIAL" | "FAILED";
  resultUnit?: "component_results";
  resultCount?: number | null;
  hotelPropertyCount?: number | null;
};

export type JourneyEventRecord = {
  id: string;
  type: JourneyEventType;
  product: string | null;
  provider: string | null;
  createdAt: Date;
  searchHistoryId: string | null;
  redirectLogId: string | null;
  metadata?: unknown;
  journey: { id: string; visitorId: string; startedAt: Date };
  searchHistory: {
    visitorId: string | null;
    userId: string | null;
    type: string;
    origin: string | null;
    destination: string | null;
    status: string;
    query?: unknown;
  } | null;
  redirectLog: {
    visitorId: string | null;
    userId: string | null;
    type: string;
    provider: string;
    route: string | null;
  } | null;
};

export function eligibleGuestVisitorWhere(id: string) {
  return {
    id,
    consentStatus: "GRANTED" as const,
    trackingDisabledAt: null,
    currentUserId: null,
    identityLinks: { none: {} },
  };
}

export function eligibleLinkedVisitorWhere(userId: string) {
  return {
    currentUserId: userId,
    consentStatus: "GRANTED" as const,
    trackingDisabledAt: null,
    identityLinks: {
      some: { userId },
      none: { userId: { not: userId } },
    },
  };
}

/** The journey details reader additionally requires a verified, active linked account.
 * Keep this narrower scope for journey events without hiding direct legacy activity.
 */
export function eligibleJourneyLinkedVisitorWhere(userId: string) {
  return {
    ...eligibleLinkedVisitorWhere(userId),
    currentUser: { is: { status: "ACTIVE" as const, emailVerified: { not: null } } },
  };
}
/**
 * A safe superset of visitors who can contribute canonical events to the
 * selected window. The final event count still enforces the full consent,
 * ownership, environment, stage, product and query predicates.
 *
 * Preselecting by event existence prevents large registered accounts with
 * many inactive/empty visitor links from building hundreds of complex,
 * per-visitor OR branches. It does not cap or discard historical events.
 */
export function eligibleJourneyEventCandidateWhere(
  userId: string,
  stages: ReadonlyArray<JourneyEventRecord["type"]>,
  createdAt: Prisma.DateTimeFilter,
): Prisma.VisitorWhereInput {
  return {
    AND: [
      eligibleJourneyLinkedVisitorWhere(userId),
      { journeys: { some: { events: { some: {
        type: { in: [...stages] },
        createdAt,
      } } } } },
    ],
  };
}


function relatedRecordAllowed(
  record: { visitorId: string | null; userId: string | null } | null,
  journeyVisitorId: string,
  kind: IdentityKind,
  id: string,
) {
  return Boolean(record
    && record.visitorId === journeyVisitorId
    && (record.userId === null || (kind === "user" && record.userId === id)));
}

export const journeyActivityLabels = {
  SEARCH_COMPLETED: "Search completed",
  RESULTS_VIEWED: "Results viewed",
  FLIGHT_DETAILS_VIEWED: "Flight details viewed",
  OFFER_SELECTED: "Offer selected",
  PROVIDER_DEAL_SELECTED: "Provider deal selected",
  PROVIDER_HANDOFF_STARTED: "Provider handoff started",
  RESULT_SAVED: "Result saved",
  RESULT_UNSAVED: "Result unsaved",
  RESULT_SHARED: "Result shared",
  PRICE_ALERT_CREATED: "Price alert created",
  SEARCH_EDIT_APPLIED: "Search edit submitted",
  SEARCH_FILTER_APPLIED: "Results filter applied",
  SEARCH_SORT_CHANGED: "Results sort changed",
  RESULT_DETAILS_OPENED: "Result details opened",
  RATE_DETAILS_OPENED: "Rate details opened",
} satisfies Record<JourneyEventRecord["type"], string>;

export const sharedJourneyActionLabels = {
  share_link_copied: "Result link copied",
  share_sheet_completed: "Share sheet completed",
  share_sheet_requested: "Share sheet requested",
} as const;

/** A display-only projection of the exact referenced search. Missing source
 * data is unknown; it must never become a fabricated Guest label. */
export function recordedSearchContext(search: { userId?: string | null; status?: string; type?: string; query?: unknown } | null | undefined): Pick<ActivityRow, "originalSearchIdentity" | "searchOutcome" | "resultUnit"> {
  if (!search) return {};
  const query = search.query && typeof search.query === "object" && !Array.isArray(search.query) ? search.query as Record<string, unknown> : null;
  return {
    ...(search.userId === null ? { originalSearchIdentity: "guest" as const }
      : typeof search.userId === "string" && search.userId.length ? { originalSearchIdentity: "registered" as const } : {}),
    ...(search.status === "SUCCESS" || search.status === "PARTIAL" || search.status === "FAILED"
      ? { searchOutcome: search.status } : {}),
    ...(search.type === "PACKAGE" && query?.resultUnit === "component_results" ? { resultUnit: "component_results" as const } : {}),
  };
}

function displayProduct(product: string | null) {
  if (product === "FLIGHT") return "Flight";
  if (product === "HOTEL") return "Hotel";
  if (product === "CAR") return "Car";
  if (product === "PACKAGE") return "Package";
  return null;
}

function searchRoute(origin: string | null | undefined, destination: string | null | undefined) {
  return [origin, destination].filter(Boolean).join(" → ") || null;
}

/** Defense in depth: the journey's visitor and each referenced log must agree on ownership. */
export function toAdminJourneyActivity(event: JourneyEventRecord, kind: IdentityKind, id: string): ActivityRow | null {
  const isHandoff = event.type === "PROVIDER_HANDOFF_STARTED";
  if (isHandoff ? !event.redirectLogId : !event.searchHistoryId) return null;
  if (event.searchHistoryId && !relatedRecordAllowed(event.searchHistory, event.journey.visitorId, kind, id)) return null;
  if (event.redirectLogId && !relatedRecordAllowed(event.redirectLog, event.journey.visitorId, kind, id)) return null;

  const product = displayProduct(event.product ?? event.searchHistory?.type ?? event.redirectLog?.type ?? null);
  const route = isHandoff
    ? event.redirectLog?.route
    : searchRoute(event.searchHistory?.origin, event.searchHistory?.destination);
  const provider = isHandoff ? (event.redirectLog?.provider ?? event.provider) : event.provider;
  const status = event.type === "SEARCH_COMPLETED" ? event.searchHistory?.status : null;
  // Read only a closed list of actions from server-owned event metadata.
  // Never put raw client metadata or a complete URL into an admin timeline.
  const rawAction = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
    ? (event.metadata as Record<string, unknown>).action : null;
  const allowedActions: Partial<Record<JourneyEventRecord["type"], Record<string, string>>> = {
    RESULT_SAVED: { local_saved: "Saved locally", saved_item_confirmed: "Saved to account" },
    RESULT_UNSAVED: { local_unsaved: "Removed local save", saved_item_removed: "Removed saved item" },
    RESULT_SHARED: sharedJourneyActionLabels,
    PRICE_ALERT_CREATED: { price_alert_created: "Price alert created" },
  };
  const action = typeof rawAction === "string" ? allowedActions[event.type]?.[rawAction] : undefined;
  const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
    ? event.metadata as Record<string, unknown> : null;
  const observedResult = metadata?.observedSource === "customer_display" ? safeObservedResult(metadata.observedResult) : null;
  const fareIsExplicit = event.type === "OFFER_SELECTED" && event.product === "FLIGHT"
    && metadata?.sourcePage === "/flight-details"
    && typeof metadata.resultId === "string"
    && /^[A-Za-z0-9._:+~=-]{1,128}$/.test(metadata.resultId);
  const label = fareIsExplicit ? "Fare selected"
    : event.type === "RESULT_SAVED" || event.type === "RESULT_UNSAVED"
      || event.type === "RESULT_SHARED" || event.type === "PRICE_ALERT_CREATED"
      ? action ?? journeyActivityLabels[event.type] : journeyActivityLabels[event.type];
  const editFields = event.type === "SEARCH_EDIT_APPLIED"
    ? safeJourneySearchEditFields(metadata?.editFields, event.product ?? event.searchHistory?.type ?? null)
    : [];
  const edited = editFields.map(field => journeySearchEditFieldLabels[field]).join(", ");
  const detail = [product, route, provider, status, edited].filter(Boolean).join(" · ");

  return {
    id: "j-" + event.id,
    label,
    detail: detail || "No additional details recorded",
    at: event.createdAt,
    journeyId: event.journey.id,
    journeyStartedAt: event.journey.startedAt,
    stage: event.type,
    interface: "customer",
    ...(metadata?.originalIdentity === "guest" || metadata?.originalIdentity === "registered" ? { originalIdentity: metadata.originalIdentity } : {}),
    ...(observedResult ? { observedResult } : {}),
    product: event.product ?? event.searchHistory?.type ?? event.redirectLog?.type ?? null,
    provider,
    searchHistoryId: event.searchHistoryId,
    redirectLogId: event.redirectLogId,
    ...recordedSearchContext(event.searchHistory),
    ...(event.type === "SEARCH_COMPLETED" && event.searchHistoryId
      ? { dedupeKey: "search:" + event.searchHistoryId }
      : {}),
    ...(isHandoff && event.redirectLogId ? { dedupeKey: "handoff:" + event.redirectLogId } : {}),
  };
}

/** Prefer canonical journey records; keep older activity where no journey stage was recorded. */
export function mergeAdminActivity(journey: ActivityRow[], legacy: ActivityRow[], limit = 30, order: "newest" | "oldest" = "newest") {
  const recorded = new Set(journey.map(row => row.dedupeKey).filter(Boolean));
  return [
    ...journey,
    ...legacy.filter(row => !row.dedupeKey || !recorded.has(row.dedupeKey)),
  ].sort((a, b) => (order === "oldest" ? a.at.getTime() - b.at.getTime() : b.at.getTime() - a.at.getTime())
    || a.id.localeCompare(b.id)).slice(0, limit);
}
