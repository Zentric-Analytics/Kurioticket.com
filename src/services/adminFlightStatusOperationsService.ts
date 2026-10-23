import "server-only";

import { createHash } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import { isConfiguredPartnerConfirmationSecret } from "@/services/partnerBookingConfirmation";
import { flightStatusFreshness, flightStatusLimits } from "@/services/flightStatusService";

export type FlightStatusIntegrationReadiness = {
  providerName: string | null;
  providerConfigured: boolean;
  webhookCredentialConfigured: boolean;
  feedReady: boolean;
  credentialModel: "single_provider_bound_secret";
  currentSearchProviderStatusFeed: "none";
};

export type FlightStatusOperationsSnapshot = {
  environment: PublicEnvironment;
  metrics: {
    confirmedFlights: number;
    feedEligibleFlights: number;
    monitoringFlights: number;
    trackedFlights: number;
    missingSnapshots: number;
    missingSnapshotFingerprint: string;
    currentSnapshots: number;
    staleSnapshots: number;
    staleSnapshotFingerprint: string;
  };
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  awaitingFirstSnapshot: Array<{
    id: string;
    userId: string;
    userEmail: string | null;
    providerName: string;
    providerConfirmationCode: string;
    origin: string | null;
    destination: string;
    departureDate: string;
    confirmedAt: string;
  }>;
  recentSnapshots: Array<{
    id: string;
    myTripId: string;
    userId: string;
    userEmail: string | null;
    providerName: string;
    providerConfirmationCode: string;
    status: string;
    freshness: "current" | "stale";
    flightNumber: string;
    carrierCode: string;
    originAirport: string;
    destinationAirport: string;
    scheduledDepartureAt: string;
    estimatedDepartureAt: string | null;
    actualDepartureAt: string | null;
    estimatedArrivalAt: string | null;
    actualArrivalAt: string | null;
    observedAt: string;
  }>;
};

function fingerprintFlightStatusIdentities(values: string[][]) {
  return createHash("sha256")
    .update(JSON.stringify(values))
    .digest("hex")
    .slice(0, 24);
}

export function getFlightStatusIntegrationReadiness(): FlightStatusIntegrationReadiness {
  const providerName = process.env.FLIGHT_STATUS_PROVIDER_NAME?.trim() || null;
  const webhookCredentialConfigured = isConfiguredPartnerConfirmationSecret(
    process.env.FLIGHT_STATUS_WEBHOOK_SECRET,
  );
  return {
    providerName,
    providerConfigured: Boolean(providerName),
    webhookCredentialConfigured,
    feedReady: Boolean(providerName) && webhookCredentialConfigured,
    credentialModel: "single_provider_bound_secret",
    currentSearchProviderStatusFeed: "none",
  };
}

export async function getFlightStatusOperationsSnapshot(
  environment: PublicEnvironment = getPublicEnvironment(),
  readiness: FlightStatusIntegrationReadiness = getFlightStatusIntegrationReadiness(),
): Promise<FlightStatusOperationsSnapshot | null> {
  const db = getOptionalPrisma();
  if (!db) return null;

  const now = new Date();
  const currentSince = new Date(now.getTime() - flightStatusLimits.freshnessWindowMs);
  const confirmedFlightWhere: Prisma.MyTripWhereInput = {
    tripType: "FLIGHT",
    source: "PARTNER_CONFIRMATION",
    partnerConfirmationOccurredAt: { not: null },
  };
  const feedEligibleWhere: Prisma.MyTripWhereInput = readiness.providerName
    ? { ...confirmedFlightWhere, providerName: readiness.providerName }
    : { ...confirmedFlightWhere, id: "__no_configured_flight_status_provider__" };
  const monitoringFlightWhere: Prisma.MyTripWhereInput = {
    ...feedEligibleWhere,
    status: "UPCOMING",
    OR: [
      { flightStatusSnapshot: { is: null } },
      {
        flightStatusSnapshot: {
          is: { status: { notIn: ["ARRIVED", "CANCELLED"] } },
        },
      },
    ],
  };

  try {
    return await db.$transaction(async (tx) => {
      const [
        confirmedFlights,
        feedEligibleFlights,
        monitoringFlights,
        trackedFlights,
        missingSnapshots,
        currentSnapshots,
        statusDistribution,
        missingSnapshotIdentities,
        staleSnapshotIdentities,
        awaitingFirstSnapshot,
        recentSnapshots,
      ] = await Promise.all([
        tx.myTrip.count({ where: confirmedFlightWhere }),
        tx.myTrip.count({ where: feedEligibleWhere }),
        tx.myTrip.count({ where: monitoringFlightWhere }),
        tx.myTrip.count({
          where: { ...monitoringFlightWhere, flightStatusSnapshot: { isNot: null } },
        }),
        tx.myTrip.count({
          where: { ...monitoringFlightWhere, flightStatusSnapshot: { is: null } },
        }),
        tx.flightStatusSnapshot.count({
          where: {
            observedAt: { gte: currentSince, lte: now },
            myTrip: { is: monitoringFlightWhere },
          },
        }),
        tx.flightStatusSnapshot.groupBy({
          by: ["status"],
          where: { myTrip: { is: feedEligibleWhere } },
          _count: { _all: true },
        }),
        tx.myTrip.findMany({
          where: { ...monitoringFlightWhere, flightStatusSnapshot: { is: null } },
          orderBy: [{ id: "asc" }],
          select: {
            id: true,
            partnerConfirmationOccurredAt: true,
          },
        }),
        tx.flightStatusSnapshot.findMany({
          where: {
            observedAt: { lt: currentSince },
            myTrip: { is: monitoringFlightWhere },
          },
          orderBy: [{ myTripId: "asc" }, { observedAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            myTripId: true,
            observedAt: true,
          },
        }),
        tx.myTrip.findMany({
          where: { ...monitoringFlightWhere, flightStatusSnapshot: { is: null } },
          orderBy: [{ departureDate: "asc" }, { id: "asc" }],
          take: 20,
          select: {
            id: true,
            userId: true,
            user: { select: { email: true } },
            providerName: true,
            providerConfirmationCode: true,
            origin: true,
            destination: true,
            departureDate: true,
            partnerConfirmationOccurredAt: true,
          },
        }),
        tx.flightStatusSnapshot.findMany({
          where: { myTrip: { is: feedEligibleWhere } },
          orderBy: [{ observedAt: "desc" }, { id: "desc" }],
          take: 20,
          select: {
            id: true,
            myTripId: true,
            status: true,
            flightNumber: true,
            carrierCode: true,
            originAirport: true,
            destinationAirport: true,
            scheduledDepartureAt: true,
            estimatedDepartureAt: true,
            actualDepartureAt: true,
            estimatedArrivalAt: true,
            actualArrivalAt: true,
            observedAt: true,
            myTrip: {
              select: {
                userId: true,
                user: { select: { email: true } },
                providerName: true,
                providerConfirmationCode: true,
              },
            },
          },
        }),
      ]);

      return {
        environment,
        metrics: {
          confirmedFlights,
          feedEligibleFlights,
          monitoringFlights,
          trackedFlights,
          missingSnapshots,
          missingSnapshotFingerprint: fingerprintFlightStatusIdentities(
            missingSnapshotIdentities.map((trip) => [
              trip.id,
              trip.partnerConfirmationOccurredAt?.toISOString() ?? "none",
            ]),
          ),
          currentSnapshots,
          staleSnapshots: Math.max(0, trackedFlights - currentSnapshots),
          staleSnapshotFingerprint: fingerprintFlightStatusIdentities(
            staleSnapshotIdentities.map((snapshot) => [
              snapshot.myTripId,
              snapshot.id,
              snapshot.observedAt.toISOString(),
            ]),
          ),
        },
        statusDistribution: statusDistribution
          .map((row) => ({ status: row.status, count: row._count._all }))
          .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status)),
        awaitingFirstSnapshot: awaitingFirstSnapshot.map((trip) => ({
          id: trip.id,
          userId: trip.userId,
          userEmail: trip.user.email,
          providerName: trip.providerName,
          providerConfirmationCode: trip.providerConfirmationCode,
          origin: trip.origin,
          destination: trip.destination,
          departureDate: trip.departureDate.toISOString(),
          confirmedAt: trip.partnerConfirmationOccurredAt!.toISOString(),
        })),
        recentSnapshots: recentSnapshots.map((snapshot) => ({
          id: snapshot.id,
          myTripId: snapshot.myTripId,
          userId: snapshot.myTrip.userId,
          userEmail: snapshot.myTrip.user.email,
          providerName: snapshot.myTrip.providerName,
          providerConfirmationCode: snapshot.myTrip.providerConfirmationCode,
          status: snapshot.status,
          freshness: flightStatusFreshness(snapshot.observedAt, now),
          flightNumber: snapshot.flightNumber,
          carrierCode: snapshot.carrierCode,
          originAirport: snapshot.originAirport,
          destinationAirport: snapshot.destinationAirport,
          scheduledDepartureAt: snapshot.scheduledDepartureAt.toISOString(),
          estimatedDepartureAt: snapshot.estimatedDepartureAt?.toISOString() ?? null,
          actualDepartureAt: snapshot.actualDepartureAt?.toISOString() ?? null,
          estimatedArrivalAt: snapshot.estimatedArrivalAt?.toISOString() ?? null,
          actualArrivalAt: snapshot.actualArrivalAt?.toISOString() ?? null,
          observedAt: snapshot.observedAt.toISOString(),
        })),
      };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    console.error("[admin:flight-status-operations]", error);
    return null;
  }
}
