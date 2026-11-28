import { advanceHotelResultAccounting } from "@/lib/hotels/hotelResultAccounting";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import {
  clientJourneyDecisionTypes,
  clientJourneyEventTypes,
  getJourneyActivityCutoff,
  journeyDecisionSourceProduct,
  journeyEventKey,
  safeJourneySearchEditFields,
  type ClientJourneyEventType,
  type JourneyEventReceipt,
  type JourneyFilterGroup,
  type JourneySortMode,
  type JourneySortChoice,
  type JourneyFilterSelection,
  type JourneyObservedResult,
  type JourneySearchEditField,
} from "@/lib/search-journey";
import { getPublicEnvironment, withEnvironmentMetadata } from "@/lib/stagingSafety";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";
import { applicationMetadata, type ApplicationAttribution } from "@/lib/application-source";
import { completeSearchNetworkObservation, recordedSearchNetwork } from "@/lib/searchNetworkObservation";
import { carFilterGroups } from "@/lib/cars/carFilterPresentation";
import { customerPageProvenance, optionalAnalyticsPurpose, type customerObservedPlatform } from "@/lib/activityTrackingContract";
import { customerJourneySourcePath } from "@/lib/pageViewCatalog";

export { clientJourneyEventTypes, journeyEventKey, type ClientJourneyEventType };
export type SearchJourneyDatabase = Pick<PrismaClient, "$transaction">;

type JourneyEventType = ClientJourneyEventType | "SEARCH_COMPLETED" | "PROVIDER_HANDOFF_STARTED";
export type JourneyEventInput = {
  visitorId?: string | null;
  userId?: string | null;
  type: JourneyEventType;
  eventKey: string;
  product?: "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";
  provider?: string | null;
  searchHistoryId?: string | null;
  redirectLogId?: string | null;
  metadata?: Record<string, unknown>;
};
export type ClientJourneyEventInput = ApplicationAttribution & {
  visitorId?: string | null;
  userId?: string | null;
  eventId: string;
  type: ClientJourneyEventType;
  requestId: string;
  provider?: string;
  sourcePage?: string;
  platform?: ReturnType<typeof customerObservedPlatform>;
  /** Canonical offer reference from the validated search response. Not an arbitrary URL. */
  offerId?: string;
  filterGroup?: JourneyFilterGroup;
  sortMode?: JourneySortMode;
  sortChoice?: JourneySortChoice;
  filterSelections?: JourneyFilterSelection[];
  editFields?: JourneySearchEditField[];
  observedResult?: JourneyObservedResult;
};
export type SearchHistoryInput = ApplicationAttribution & {
  userId?: string | null;
  visitorId?: string | null;
  requestId?: string | null;
  type: "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";
  origin?: string | null;
  destination?: string | null;
  checkIn?: Date | null;
  checkOut?: Date | null;
  query: Record<string, unknown>;
  resultCount: number;
  latencyMs: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  /** Package accounting does not create new anonymous operational histories. */
  requiresActivityOwner?: boolean;
  progressive?: boolean;
  completed?: boolean;
};

/** Optional geolocation, only after the search row and journey event exist.
 * Never delay search recording or overwrite later verified network evidence. */
async function enrichRecordedSearchCountry(
  db: SearchJourneyDatabase,
  history: { id: string; requestId: string | null; query: Prisma.JsonValue },
  countryLookup?: (ip: string) => Promise<string | null>,
) {
  const observed = recordedSearchNetwork(history.query);
  if (!observed.ipAddress || observed.countryCode) return;
  const original = history.query;
  if (!original || typeof original !== "object" || Array.isArray(original)) return;
  const enriched = countryLookup
    ? await completeSearchNetworkObservation(original as Record<string, unknown>, countryLookup)
    : await completeSearchNetworkObservation(original as Record<string, unknown>);
  const country = recordedSearchNetwork(enriched).countryCode;
  if (!country) return;
  try {
    await db.$transaction(async tx => {
      // The query also holds the cumulative hotel counts. Share the existing
      // search request lock so enrichment cannot overwrite a newer batch.
      if (history.requestId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('search-history-request'), hashtext(${history.requestId}))`;
      const current = await tx.searchHistory.findUnique({
        where: { id: history.id },
        select: { query: true },
      });
      if (!current || !current.query || typeof current.query !== "object" || Array.isArray(current.query)) return;
      const currentNetwork = recordedSearchNetwork(current.query);
      if (currentNetwork.ipAddress !== observed.ipAddress || currentNetwork.countryCode) return;
      await tx.searchHistory.update({
        where: { id: history.id },
        data: {
          query: {
            ...(current.query as Record<string, unknown>),
            searchNetwork: { ipAddress: observed.ipAddress, countryCode: country },
          } as Prisma.InputJsonValue,
        },
      });
    });
  } catch {
    // Search history was already committed; a failed country lookup is optional.
  }
}

type OwnedActivity = { visitorId: string | null; userId: string | null };
function ownsActivity(activity: OwnedActivity, visitorId: string, userId: string | null) {
  return activity.visitorId === visitorId && (!activity.userId || activity.userId === userId);
}

async function appendEvent(tx: Prisma.TransactionClient, input: JourneyEventInput & { visitorId: string }, now: Date) {
  const existing = await tx.journeyEvent.findUnique({
    where: { eventKey: input.eventKey },
    select: { journeyId: true, type: true, searchHistoryId: true, redirectLogId: true, provider: true, metadata: true, journey: { select: { visitorId: true } } },
  });
  if (existing) {
    // A reused key is an acknowledgement only for the same owner and activity;
    // retries must never extend a session or touch another visitor's journey.
    if (existing.journey.visitorId !== input.visitorId || existing.type !== input.type
      || existing.redirectLogId !== (input.redirectLogId ?? null)
      || existing.provider !== (input.provider ?? null)) return null;
    if (input.metadata?.recordPurpose === optionalAnalyticsPurpose && existing.metadata
      && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)) {
      if (existing.metadata.environment !== getPublicEnvironment()) return null;
      if (existing.metadata.originalIdentity !== undefined && existing.metadata.originalIdentity !== input.metadata.originalIdentity) return null;
    }
    if (existing.searchHistoryId !== (input.searchHistoryId ?? null)) {
      // A deferred history row can enrich the same verified handoff on retry.
      // It cannot replace a known search or move/extend the original journey.
      if (input.type !== "PROVIDER_HANDOFF_STARTED" || !input.redirectLogId
        || existing.searchHistoryId || !input.searchHistoryId) return null;
      await tx.journeyEvent.update({ where: { eventKey: input.eventKey }, data: { searchHistoryId: input.searchHistoryId } });
    }
    return { journeyId: existing.journeyId, created: false };
  }

  const activeJourney = await tx.searchJourney.findFirst({
    where: { visitorId: input.visitorId, lastActivityAt: { gte: getJourneyActivityCutoff(now) } },
    orderBy: { lastActivityAt: "desc" },
    select: { id: true },
  });
  const journey = activeJourney
    ? await tx.searchJourney.update({ where: { id: activeJourney.id }, data: { lastActivityAt: now }, select: { id: true } })
    : await tx.searchJourney.create({ data: { visitorId: input.visitorId, startedAt: now, lastActivityAt: now }, select: { id: true } });
  await tx.journeyEvent.create({
    data: {
      journeyId: journey.id,
      type: input.type,
      eventKey: input.eventKey,
      product: input.product,
      provider: input.provider || undefined,
      searchHistoryId: input.searchHistoryId || undefined,
      redirectLogId: input.redirectLogId || undefined,
      metadata: withEnvironmentMetadata(input.metadata) as Prisma.InputJsonValue,
    },
  });
  return { journeyId: journey.id, created: true };
}

/** The same transactional implementation is used by production and lifecycle tests. */
export function createSearchJourneyService(
  getDatabase: () => SearchJourneyDatabase | null,
  now = () => new Date(),
  countryLookup?: (ip: string) => Promise<string | null>,
) {
  async function recordJourneyEvent(input: JourneyEventInput) {
    const visitorId = input.visitorId;
    if (!visitorId) return null;
    try {
      const db = getDatabase();
      if (!db) return null;
      return await db.$transaction(async tx => {
        if (!(await lockConsentedVisitor(tx, visitorId, input.userId ?? null))) return null;
        let searchRequestId: string | null = null;
        if (input.searchHistoryId) {
          const search = await tx.searchHistory.findUnique({ where: { id: input.searchHistoryId }, select: { visitorId: true, userId: true, requestId: true, type: true } });
          if (!search || !ownsActivity(search, visitorId, input.userId ?? null)) return null;
          if (input.product && search.type !== input.product) return null;
          searchRequestId = search.requestId;
        }
        if (input.redirectLogId) {
          const redirect = await tx.redirectLog.findUnique({ where: { id: input.redirectLogId }, select: { visitorId: true, userId: true, metadata: true, type: true, provider: true } });
          if (!redirect || !ownsActivity(redirect, visitorId, input.userId ?? null)) return null;
          if ((input.product && redirect.type !== input.product) || redirect.provider !== input.provider) return null;
          if (input.searchHistoryId) {
            const metadata = redirect.metadata && typeof redirect.metadata === "object" && !Array.isArray(redirect.metadata)
              ? redirect.metadata : {};
            if (!searchRequestId || metadata.requestId !== searchRequestId) return null;
          }
        }
        return appendEvent(tx, { ...input, visitorId }, now());
      });
    } catch {
      // Optional analytics cannot reject searches or expose database/identity data.
      return null;
    }
  }

  async function recordClientJourneyEvent(input: ClientJourneyEventInput): Promise<JourneyEventReceipt> {
    const visitorId = input.visitorId;
    if (!visitorId) return { accepted: false };
    try {
      const db = getDatabase();
      if (!db) return { accepted: false, retryable: true };
      return await db.$transaction(async tx => {
        if (!(await lockConsentedVisitor(tx, visitorId, input.userId ?? null, { requireExclusiveLink: true }))) return { accepted: false };
        const search = await tx.searchHistory.findUnique({
          where: { requestId: input.requestId },
          select: { id: true, type: true, visitorId: true, userId: true, query: true },
        });
        // Search responses are deliberately sent before optional history writes.
        // Retry this race, but never retry an already-known ownership mismatch.
        if (!search) return { accepted: false, retryable: true };
        if (!ownsActivity(search, visitorId, input.userId ?? null)) return { accepted: false };
        const query = search.query;
        if (!query || typeof query !== "object" || Array.isArray(query) || query.environment !== getPublicEnvironment()) return { accepted: false };
        const sourcePage = input.sourcePage
          ? customerJourneySourcePath(input.sourcePage, "web") ?? customerJourneySourcePath(input.sourcePage, "native")
          : undefined;
        if ((clientJourneyDecisionTypes as readonly string[]).includes(input.type)
          && journeyDecisionSourceProduct(sourcePage) !== search.type) return { accepted: false };
        const editFields = safeJourneySearchEditFields(input.editFields, search.type);
        if (input.editFields && editFields.length !== input.editFields.length) return { accepted: false };
        if (search.type === "CAR" && input.filterSelections?.some(choice =>
          !carFilterGroups.some(group => group.id === choice.group && group.options.some(option => option.id === choice.option))
        )) return { accepted: false };
        // These stages are specific to native flight navigation. Do not allow
        // other product searches to be recast as a flight action.
        if ((input.type === "FLIGHT_DETAILS_VIEWED" || input.type === "PROVIDER_DEAL_SELECTED")
          && search.type !== "FLIGHT") return { accepted: false };
        const result = await appendEvent(tx, {
          visitorId,
          userId: input.userId,
          type: input.type,
          eventKey: journeyEventKey("client", `${visitorId}:${input.eventId.toLowerCase()}`),
          product: search.type,
          provider: input.provider,
          searchHistoryId: search.id,
          metadata: { recordPurpose: optionalAnalyticsPurpose, ...customerPageProvenance(input.userId ?? null),
            ...applicationMetadata(input), ...(sourcePage ? { sourcePage } : {}),
            ...(input.platform ? { platform: input.platform } : {}),
            ...(input.offerId ? { resultId: input.offerId } : {}),
            ...(input.filterGroup ? { filterGroup: input.filterGroup } : {}),
            ...(input.sortMode ? { sortMode: input.sortMode } : {}),
            ...(input.sortChoice ? { sortChoice: input.sortChoice } : {}),
            ...(input.filterSelections ? { filterSelections: input.filterSelections } : {}),
            ...(input.type === "SEARCH_EDIT_APPLIED" && editFields.length ? { editFields } : {}),
            ...(input.observedResult ? { observedResult: input.observedResult, observedSource: "customer_display" } : {}) },
        }, now());
        return { accepted: Boolean(result) };
      });
    } catch {
      return { accepted: false, retryable: true };
    }
  }

  async function recordSearchHistory(input: SearchHistoryInput) {
    try {
      const db = getDatabase();
      if (!db) return null;
      const userId = input.userId ?? null;
      const history = await db.$transaction(async tx => {
        // The request key is unique globally. A duplicate may never overwrite a
        // different identity's search; progressive pages update the same row.
        if (input.requestId) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('search-history-request'), hashtext(${input.requestId}))`;
        }
        const visitorId = input.visitorId && await lockConsentedVisitor(tx, input.visitorId, userId,
          input.requiresActivityOwner ? { requireExclusiveLink: true } : undefined) ? input.visitorId : null;
        if (input.requiresActivityOwner && !userId && !visitorId) return null;
        const existing = input.requestId ? await tx.searchHistory.findUnique({ where: { requestId: input.requestId } }) : null;
        if (existing) {
          const sameOwner = existing.visitorId === visitorId
            && (existing.userId === userId || (!existing.userId && Boolean(visitorId)));
          if (!sameOwner || existing.type !== input.type) return null;
          // Snapshot-bound progressive rows may only be advanced by the same
          // operational owner and snapshot. A replayed cursor cannot rebind them.
          const original = existing.query && typeof existing.query === "object" && !Array.isArray(existing.query) ? existing.query : {};
          if (original.operationalHotelSnapshotId && (existing.userId !== userId ||
              original.environment !== getPublicEnvironment() || original.operationalSessionId !== input.query.operationalSessionId ||
              original.operationalHotelSnapshotId !== input.query.operationalHotelSnapshotId)) return null;
          // A completed success wins over delayed partial/failure callbacks.
          // A completed failure also cannot be reopened by an earlier page.
          if (input.progressive && existing.status !== "SUCCESS"
            && !(existing.status === "FAILED" && input.completed === false)) {
            return tx.searchHistory.update({
              where: { id: existing.id },
              data: {
                resultCount: Math.max(existing.resultCount, input.resultCount),
                ...(input.type === "HOTEL" ? { query: advanceHotelResultAccounting(original, existing.resultCount, input.query, input.resultCount) as Prisma.InputJsonValue } : {}),
                latencyMs: Math.max(existing.latencyMs ?? 0, input.latencyMs),
                status: input.completed === false ? "PARTIAL" : input.status,
              },
            });
          }
          return existing;
        }
        return tx.searchHistory.create({ data: {
          userId,
          visitorId,
          requestId: input.requestId || undefined,
          type: input.type,
          origin: input.origin || undefined,
          destination: input.destination || undefined,
          checkIn: input.checkIn || undefined,
          checkOut: input.checkOut || undefined,
          query: withEnvironmentMetadata({ ...input.query, ...applicationMetadata(input) }) as Prisma.InputJsonValue,
          resultCount: input.resultCount,
          latencyMs: input.latencyMs,
          status: input.completed === false ? "PARTIAL" : input.status,
        } });
      });
      if (history?.visitorId && input.completed !== false) {
        await recordJourneyEvent({
          visitorId: history.visitorId,
          userId,
          type: "SEARCH_COMPLETED",
          eventKey: journeyEventKey("search", history.id),
          product: history.type,
          searchHistoryId: history.id,
          metadata: { requestId: input.requestId || undefined, resultCount: history.resultCount, status: history.status, ...applicationMetadata(input) },
        });
      }
      if (history) await enrichRecordedSearchCountry(db, history, countryLookup);
      return history ? { id: history.id } : null;
    } catch {
      return null;
    }
  }

  return { recordJourneyEvent, recordClientJourneyEvent, recordSearchHistory };
}

export const { recordJourneyEvent, recordClientJourneyEvent, recordSearchHistory } = createSearchJourneyService(getOptionalPrisma);
