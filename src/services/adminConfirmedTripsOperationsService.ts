import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import { isConfiguredPartnerConfirmationSecret } from "@/services/partnerBookingConfirmation";

export type ConfirmedTripsOperationsSnapshot = {
  environment: PublicEnvironment;
  readiness: {
    webhookCredentialConfigured: boolean;
    credentialModel: "shared_secret_only";
    currentSearchProviderConfirmationFeed: "none";
  };
  metrics: {
    total: number;
    confirmedLast24h: number;
    upcoming: number;
    past: number;
    cancelled: number;
  };
  byProduct: Array<{
    tripType: string;
    count: number;
  }>;
  byProvider: Array<{
    provider: string;
    count: number;
    lastConfirmationAt: string | null;
  }>;
  recentTrips: Array<{
    id: string;
    userId: string;
    userEmail: string;
    tripType: string;
    status: string;
    providerName: string;
    providerConfirmationCode: string;
    origin: string | null;
    destination: string;
    departureDate: string;
    travelerCount: number;
    confirmedAt: string;
  }>;
};

export async function getConfirmedTripsOperationsSnapshot(
  environment: PublicEnvironment = getPublicEnvironment(),
): Promise<ConfirmedTripsOperationsSnapshot | null> {
  const db = getOptionalPrisma();
  if (!db) return null;

  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const confirmedWhere: Prisma.MyTripWhereInput = {
    source: "PARTNER_CONFIRMATION",
    partnerConfirmationOccurredAt: { not: null },
  };

  try {
    return await db.$transaction(async (tx) => {
      const [
        total,
        confirmedLast24h,
        upcoming,
        past,
        cancelled,
        byProduct,
        byProvider,
        recentTrips,
      ] = await Promise.all([
        tx.myTrip.count({ where: confirmedWhere }),
        tx.myTrip.count({
          where: {
            ...confirmedWhere,
            partnerConfirmationOccurredAt: { gte: since, lte: now },
          },
        }),
        tx.myTrip.count({ where: { ...confirmedWhere, status: "UPCOMING" } }),
        tx.myTrip.count({ where: { ...confirmedWhere, status: "PAST" } }),
        tx.myTrip.count({ where: { ...confirmedWhere, status: "CANCELLED" } }),
        tx.myTrip.groupBy({
          by: ["tripType"],
          where: confirmedWhere,
          _count: { _all: true },
        }),
        tx.myTrip.groupBy({
          by: ["providerName"],
          where: confirmedWhere,
          _count: { _all: true },
          _max: { partnerConfirmationOccurredAt: true },
        }),
        tx.myTrip.findMany({
          where: confirmedWhere,
          orderBy: [
            { partnerConfirmationOccurredAt: "desc" },
            { id: "desc" },
          ],
          take: 20,
          select: {
            id: true,
            userId: true,
            user: { select: { email: true } },
            tripType: true,
            status: true,
            providerName: true,
            providerConfirmationCode: true,
            origin: true,
            destination: true,
            departureDate: true,
            travelerCount: true,
            partnerConfirmationOccurredAt: true,
          },
        }),
      ]);

      return {
        environment,
        readiness: {
          webhookCredentialConfigured: isConfiguredPartnerConfirmationSecret(
            process.env.PARTNER_CONFIRMATION_WEBHOOK_SECRET,
          ),
          credentialModel: "shared_secret_only",
          currentSearchProviderConfirmationFeed: "none",
        },
        metrics: {
          total,
          confirmedLast24h,
          upcoming,
          past,
          cancelled,
        },
        byProduct: byProduct
          .map((row) => ({ tripType: row.tripType, count: row._count._all }))
          .sort((a, b) => b.count - a.count || a.tripType.localeCompare(b.tripType)),
        byProvider: byProvider
          .map((row) => ({
            provider: row.providerName,
            count: row._count._all,
            lastConfirmationAt: row._max.partnerConfirmationOccurredAt?.toISOString() ?? null,
          }))
          .sort((a, b) => b.count - a.count || a.provider.localeCompare(b.provider)),
        recentTrips: recentTrips.map((trip) => ({
          id: trip.id,
          userId: trip.userId,
          userEmail: trip.user.email,
          tripType: trip.tripType,
          status: trip.status,
          providerName: trip.providerName,
          providerConfirmationCode: trip.providerConfirmationCode,
          origin: trip.origin,
          destination: trip.destination,
          departureDate: trip.departureDate.toISOString(),
          travelerCount: trip.travelerCount,
          confirmedAt: trip.partnerConfirmationOccurredAt!.toISOString(),
        })),
      };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    console.error("[admin:confirmed-trips-operations]", error);
    return null;
  }
}
