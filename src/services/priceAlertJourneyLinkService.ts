import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { journeyRequestId } from "@/lib/journeyEventClient";
import { matchesInteractionSearch } from "@/lib/verifiedInteractionSearch";
import { priceAlertMatchesRecordedSearch } from "@/lib/priceAlertJourneyCorrelation";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";

/** Best-effort optional analytics attribution AFTER a real price alert exists.
 * Request UUID is not proof of ownership. Never join by identity, route or
 * timestamp alone; every required search and consent check must succeed.
 */
export async function linkCreatedPriceAlertToJourney(input: {
  alertId: string;
  userId: string;
  visitorId: string | null;
  requestId: string | null | undefined;
}) {
  const requestId = journeyRequestId(input.requestId);
  if (!requestId || !input.visitorId) return;
  try {
    const db = getOptionalPrisma();
    if (!db) return;
    await db.$transaction(async tx => {
      if (!await lockConsentedVisitor(tx, input.visitorId!, input.userId)) return;
      const alert = await tx.priceAlert.findFirst({
        where: { id: input.alertId, userId: input.userId },
        select: { id: true, userId: true, type: true, origin: true, destination: true, query: true,
          targetPrice: true, baselinePrice: true, currency: true, mode: true },
      });
      const search = await tx.searchHistory.findUnique({
        where: { requestId },
        select: { id: true, userId: true, visitorId: true, type: true,
          origin: true, destination: true, checkIn: true, checkOut: true, query: true, createdAt: true },
      });
      if (!alert || !search || !matchesInteractionSearch(search, {
        userId: input.userId, visitorId: input.visitorId,
      }, alert.type, getPublicEnvironment(), new Date())) return;
      // Account alerts require an account-linked search, not a guest record
      // that merely happens to share a visitor.
      if (search.userId !== input.userId || !priceAlertMatchesRecordedSearch(search, alert)) return;
      const journeys = await tx.journeyEvent.findMany({
        where: { type: "SEARCH_COMPLETED", searchHistoryId: search.id,
          journey: { visitorId: input.visitorId! },
          metadata: { path: ["environment"], equals: getPublicEnvironment() } },
        select: { journeyId: true }, distinct: ["journeyId"], take: 2,
      });
      if (journeys.length !== 1) return;
      const audit = await tx.analyticsEvent.findFirst({
        where: { userId: input.userId, type: "ALERT_CREATED", name: "price_alert_created",
          AND: [
            { metadata: { path: ["alertId"], equals: alert.id } },
            { metadata: { path: ["product"], equals: alert.type } },
            { metadata: { path: ["environment"], equals: getPublicEnvironment() } },
          ] },
        select: { id: true, metadata: true, createdAt: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      if (!audit) return;
      const eventKey = "price-alert:" + audit.id;
      // One canonical event for one server-written account alert audit.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('journey-price-alert'), hashtext(${audit.id}))`;
      if (await tx.journeyEvent.findUnique({ where: { eventKey }, select: { id: true } })) return;
      const metadata = audit.metadata && typeof audit.metadata === "object" && !Array.isArray(audit.metadata)
        ? audit.metadata as Record<string, unknown> : {};
      await tx.journeyEvent.create({ data: {
        eventKey, journeyId: journeys[0].journeyId, searchHistoryId: search.id,
        createdAt: audit.createdAt,
        type: "PRICE_ALERT_CREATED", product: alert.type,
        metadata: { environment: getPublicEnvironment(), alertId: alert.id, action: "price_alert_created",
          requestId, auditEventId: audit.id,
          alertCurrency: alert.currency, alertMode: alert.mode,
          ...(alert.targetPrice !== null ? { alertTargetPrice: alert.targetPrice.toString() } : {}),
          ...(alert.baselinePrice !== null ? { alertBaselinePrice: alert.baselinePrice.toString() } : {}),
        } as Prisma.InputJsonValue,
      } });
      await tx.analyticsEvent.update({ where: { id: audit.id },
        data: { metadata: { ...metadata, linkedJourneyId: journeys[0].journeyId,
          linkedSearchHistoryId: search.id, linkedRequestId: requestId } as Prisma.InputJsonValue },
      });
    });
  } catch {
    // Alert creation must succeed even if optional journey evidence cannot
    // be written. The original account audit remains a genuine record.
  }
}
