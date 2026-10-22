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
  stage?: "SEARCH_COMPLETED" | "RESULTS_VIEWED" | "OFFER_SELECTED" | "PROVIDER_HANDOFF_STARTED" | "ACCOUNT_ACTIVITY";
  product?: string | null;
  provider?: string | null;
  searchHistoryId?: string | null;
  redirectLogId?: string | null;
};

export type JourneyEventRecord = {
  id: string;
  type: "SEARCH_COMPLETED" | "RESULTS_VIEWED" | "OFFER_SELECTED" | "PROVIDER_HANDOFF_STARTED";
  product: string | null;
  provider: string | null;
  createdAt: Date;
  searchHistoryId: string | null;
  redirectLogId: string | null;
  journey: { id: string; visitorId: string; startedAt: Date };
  searchHistory: {
    visitorId: string | null;
    userId: string | null;
    type: string;
    origin: string | null;
    destination: string | null;
    status: string;
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

const eventLabels = {
  SEARCH_COMPLETED: "Search completed",
  RESULTS_VIEWED: "Results viewed",
  OFFER_SELECTED: "Offer selected",
  PROVIDER_HANDOFF_STARTED: "Provider handoff started",
} satisfies Record<JourneyEventRecord["type"], string>;

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
  const detail = [product, route, provider, status].filter(Boolean).join(" · ");

  return {
    id: "j-" + event.id,
    label: eventLabels[event.type],
    detail: detail || "No additional details recorded",
    at: event.createdAt,
    journeyId: event.journey.id,
    journeyStartedAt: event.journey.startedAt,
    stage: event.type,
    product: event.product ?? event.searchHistory?.type ?? event.redirectLog?.type ?? null,
    provider,
    searchHistoryId: event.searchHistoryId,
    redirectLogId: event.redirectLogId,
    ...(event.type === "SEARCH_COMPLETED" && event.searchHistoryId
      ? { dedupeKey: "search:" + event.searchHistoryId }
      : {}),
    ...(isHandoff && event.redirectLogId ? { dedupeKey: "handoff:" + event.redirectLogId } : {}),
  };
}

/** Prefer canonical journey records; keep older activity where no journey stage was recorded. */
export function mergeAdminActivity(journey: ActivityRow[], legacy: ActivityRow[], limit = 30) {
  const recorded = new Set(journey.map(row => row.dedupeKey).filter(Boolean));
  return [
    ...journey,
    ...legacy.filter(row => !row.dedupeKey || !recorded.has(row.dedupeKey)),
  ].sort((a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id)).slice(0, limit);
}
