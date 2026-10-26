import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { isConfiguredPartnerConfirmationSecret } from "@/services/partnerBookingConfirmation";

/** One explicitly bound provider per secret. No implicit shared-secret fallback. */
export function getPartnerConfirmationBinding() {
  const providerName = process.env.PARTNER_CONFIRMATION_PROVIDER_NAME?.trim() || null;
  const secret = process.env.PARTNER_CONFIRMATION_WEBHOOK_SECRET?.trim();
  return {
    providerName,
    secret: providerName && isConfiguredPartnerConfirmationSecret(secret) ? secret : null,
    configured: Boolean(providerName && isConfiguredPartnerConfirmationSecret(secret)),
  };
}

export type ConfirmationDeliveryOutcome = {
  providerName: string;
  myTripId?: string | null;
  outcome: "ACCEPTED" | "REJECTED";
  reason: "accepted" | "ownership_mismatch" | "invalid_payload" | "provider_mismatch" | "ingestion_unavailable";
  eventOccurredAt?: Date | null;
  reportedStatus?: "UPCOMING" | "PAST" | "CANCELLED" | null;
};

/**
 * Never log callback body, secrets, customer IDs, reference numbers or URLs.
 * Best-effort audit failures must not silently count a callback as recorded.
 */
export async function recordConfirmationDelivery(outcome: ConfirmationDeliveryOutcome) {
  const db = getOptionalPrisma();
  if (!db) return false;
  try {
    await db.partnerConfirmationDelivery.create({
      data: {
        providerName: outcome.providerName,
        myTripId: outcome.myTripId ?? null,
        outcome: outcome.outcome,
        reason: outcome.reason,
        eventOccurredAt: outcome.eventOccurredAt ?? null,
        reportedStatus: outcome.reportedStatus ?? null,
      },
    });
    return true;
  } catch (error) {
    console.error("[partner-confirmation:receipt] delivery audit unavailable", error instanceof Error ? error.name : "unknown");
    return false;
  }
}

export type ConfirmationDeliveryHealth = {
  providerName: string;
  receivedLast24h: number;
  acceptedLast24h: number;
  rejectedLast24h: number;
  lastReceivedAt: string | null;
  lastAcceptedAt: string | null;
  lastRejectedAt: string | null;
  recent: Array<{
    id: string;
    outcome: "ACCEPTED" | "REJECTED";
    reason: string;
    receivedAt: string;
    eventOccurredAt: string | null;
    reportedStatus: string | null;
    myTripId: string | null;
  }>;
};

export async function getConfirmationDeliveryHealth(): Promise<ConfirmationDeliveryHealth | null> {
  const binding = getPartnerConfirmationBinding();
  if (!binding.configured || !binding.providerName) return null;
  const db = getOptionalPrisma();
  if (!db) return null;
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60_000);
  try {
    const where = { providerName: binding.providerName };
    const [receivedLast24h, acceptedLast24h, rejectedLast24h, latest, lastAccepted, lastRejected, recent] = await db.$transaction([
      db.partnerConfirmationDelivery.count({ where: { ...where, receivedAt: { gte: since, lte: now } } }),
      db.partnerConfirmationDelivery.count({ where: { ...where, outcome: "ACCEPTED", receivedAt: { gte: since, lte: now } } }),
      db.partnerConfirmationDelivery.count({ where: { ...where, outcome: "REJECTED", receivedAt: { gte: since, lte: now } } }),
      db.partnerConfirmationDelivery.findFirst({ where, orderBy: { receivedAt: "desc" }, select: { receivedAt: true } }),
      db.partnerConfirmationDelivery.findFirst({ where: { ...where, outcome: "ACCEPTED" }, orderBy: { receivedAt: "desc" }, select: { receivedAt: true } }),
      db.partnerConfirmationDelivery.findFirst({ where: { ...where, outcome: "REJECTED", receivedAt: { gte: since, lte: now } }, orderBy: { receivedAt: "desc" }, select: { receivedAt: true } }),
      db.partnerConfirmationDelivery.findMany({
        where,
        take: 20,
        orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
        select: { id: true, outcome: true, reason: true, receivedAt: true, eventOccurredAt: true, reportedStatus: true, myTripId: true },
      }),
    ], { isolationLevel: "RepeatableRead" });
    return {
      providerName: binding.providerName,
      receivedLast24h, acceptedLast24h, rejectedLast24h,
      lastReceivedAt: latest?.receivedAt.toISOString() ?? null,
      lastAcceptedAt: lastAccepted?.receivedAt.toISOString() ?? null,
      lastRejectedAt: lastRejected?.receivedAt.toISOString() ?? null,
      recent: recent.map(row => ({
        id: row.id, outcome: row.outcome, reason: row.reason,
        receivedAt: row.receivedAt.toISOString(),
        eventOccurredAt: row.eventOccurredAt?.toISOString() ?? null,
        reportedStatus: row.reportedStatus,
        myTripId: row.myTripId,
      })),
    };
  } catch (error) {
    console.error("[admin:confirmation-deliveries] telemetry unavailable", error instanceof Error ? error.name : "unknown");
    return null;
  }
}


export async function getAdminConfirmationDeliveryHistory(myTripId: string) {
  const db = getOptionalPrisma();
  if (!db) return { status: "unavailable" as const };
  try {
    const rows = await db.partnerConfirmationDelivery.findMany({
      where: { myTripId },
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      take: 50,
      select: {
        id: true, outcome: true, reason: true, receivedAt: true,
        eventOccurredAt: true, reportedStatus: true,
      },
    });
    return {
      status: "ok" as const,
      rows: rows.map(row => ({
        id: row.id,
        outcome: row.outcome,
        reason: row.reason,
        receivedAt: row.receivedAt.toISOString(),
        eventOccurredAt: row.eventOccurredAt?.toISOString() ?? null,
        reportedStatus: row.reportedStatus,
      })),
    };
  } catch (error) {
    console.error("[admin:confirmation-history] history unavailable", error instanceof Error ? error.name : "unknown");
    return { status: "unavailable" as const };
  }
}
