import { Prisma } from "@/generated/prisma/client";
import type { FlightOperationalStatus, MyTripType } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";

const freshnessWindowMs = 15 * 60_000;
const maximumFutureEventSkewMs = 5 * 60_000;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/;

type ObjectValue = Record<string, unknown>;

type StatusSnapshotRecord = {
  myTripId: string;
  status: FlightOperationalStatus;
  flightNumber: string;
  carrierCode: string;
  originAirport: string;
  destinationAirport: string;
  scheduledDepartureAt: Date;
  scheduledArrivalAt: Date | null;
  estimatedDepartureAt: Date | null;
  actualDepartureAt: Date | null;
  estimatedArrivalAt: Date | null;
  actualArrivalAt: Date | null;
  observedAt: Date;
};

type FlightStatusDatabase = {
  myTrip: {
    findUnique(args: unknown): Promise<{
      id: string;
      tripType: MyTripType;
      source: "PARTNER_CONFIRMATION" | "CONFIRMATION_IMPORT" | "MIGRATED_LEGACY";
      partnerConfirmationOccurredAt: Date | null;
    } | null>;
    findFirst(args: unknown): Promise<{
      id: string;
      providerName: string;
      source: "PARTNER_CONFIRMATION" | "CONFIRMATION_IMPORT" | "MIGRATED_LEGACY";
      partnerConfirmationOccurredAt: Date | null;
      flightStatusSnapshot: StatusSnapshotRecord | null;
    } | null>;
  };
  flightStatusSnapshot: {
    create(args: unknown): Promise<StatusSnapshotRecord>;
    findUnique(args: unknown): Promise<StatusSnapshotRecord | null>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
};

export type PartnerFlightStatusInput = {
  providerName: string;
  partnerConversionId: string;
  observedAt: Date;
  status: FlightOperationalStatus;
  flightNumber: string;
  carrierCode: string;
  originAirport: string;
  destinationAirport: string;
  scheduledDepartureAt: Date;
  scheduledArrivalAt: Date | null;
  estimatedDepartureAt: Date | null;
  actualDepartureAt: Date | null;
  estimatedArrivalAt: Date | null;
  actualArrivalAt: Date | null;
};

export type PublicFlightOperationalStatus = "scheduled" | "delayed" | "departed" | "arrived" | "cancelled" | "unknown";

export type UserFlightStatus =
  | { dataAvailable: false; providerName: string }
  | {
      dataAvailable: true;
      providerName: string;
      status: PublicFlightOperationalStatus;
      flight: {
        flightNumber: string;
        carrierCode: string;
        originAirport: string;
        destinationAirport: string;
        scheduledDepartureAt: string;
        scheduledArrivalAt: string | null;
      };
      timing: {
        estimatedDepartureAt: string | null;
        actualDepartureAt: string | null;
        estimatedArrivalAt: string | null;
        actualArrivalAt: string | null;
      };
      lastUpdatedAt: string;
      freshness: "current" | "stale";
    };

export class PartnerFlightStatusPayloadError extends Error {
  constructor() {
    super("The flight status payload is invalid.");
    this.name = "PartnerFlightStatusPayloadError";
  }
}

function invalidPayload(): never {
  throw new PartnerFlightStatusPayloadError();
}

function object(value: unknown): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidPayload();
  return value as ObjectValue;
}

function text(value: unknown, maximumLength: number) {
  if (typeof value !== "string") invalidPayload();
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength || /[\u0000-\u001f\u007f]/.test(normalized)) invalidPayload();
  return normalized;
}

function timestamp(value: unknown) {
  const source = text(value, 40);
  if (!timestampPattern.test(source)) invalidPayload();
  const date = new Date(source);
  const normalized = source.includes(".") ? source : source.replace("Z", ".000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString() !== normalized) invalidPayload();
  return date;
}

function optionalTimestamp(value: unknown) {
  return value === undefined || value === null ? null : timestamp(value);
}

function airport(value: unknown) {
  const result = text(value, 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(result)) invalidPayload();
  return result;
}

function flightStatus(value: unknown): FlightOperationalStatus {
  const statuses = {
    scheduled: "SCHEDULED",
    delayed: "DELAYED",
    departed: "DEPARTED",
    arrived: "ARRIVED",
    cancelled: "CANCELLED",
    unknown: "UNKNOWN",
  } as const;
  if (typeof value !== "string" || !(value in statuses)) invalidPayload();
  return statuses[value as keyof typeof statuses];
}

/** Parses only the allowlisted values needed for a primary flight status snapshot. */
export function parsePartnerFlightStatus(value: unknown, now: Date = new Date()): PartnerFlightStatusInput {
  const payload = object(value);
  const scheduledDepartureAt = timestamp(payload.scheduledDepartureAt);
  const scheduledArrivalAt = optionalTimestamp(payload.scheduledArrivalAt);
  const actualDepartureAt = optionalTimestamp(payload.actualDepartureAt);
  const actualArrivalAt = optionalTimestamp(payload.actualArrivalAt);
  if ((scheduledArrivalAt && scheduledArrivalAt < scheduledDepartureAt)
    || (actualArrivalAt && actualDepartureAt && actualArrivalAt < actualDepartureAt)) invalidPayload();

  const originAirport = airport(payload.originAirport);
  const destinationAirport = airport(payload.destinationAirport);
  if (originAirport === destinationAirport) invalidPayload();
  const carrierCode = text(payload.carrierCode, 3).toUpperCase();
  const flightNumber = text(payload.flightNumber, 8).toUpperCase();
  if (!/^[A-Z0-9]{2,3}$/.test(carrierCode) || !/^[A-Z0-9]{1,8}$/.test(flightNumber)) invalidPayload();
  const observedAt = timestamp(payload.occurredAt);
  if (observedAt.getTime() > now.getTime() + maximumFutureEventSkewMs) invalidPayload();

  return {
    providerName: text(payload.providerName, 100),
    partnerConversionId: text(payload.partnerConversionId, 191),
    observedAt,
    status: flightStatus(payload.status),
    flightNumber,
    carrierCode,
    originAirport,
    destinationAirport,
    scheduledDepartureAt,
    scheduledArrivalAt,
    estimatedDepartureAt: optionalTimestamp(payload.estimatedDepartureAt),
    actualDepartureAt,
    estimatedArrivalAt: optionalTimestamp(payload.estimatedArrivalAt),
    actualArrivalAt,
  };
}

export function flightStatusFreshness(observedAt: Date, currentTime: Date = new Date()): "current" | "stale" {
  const age = currentTime.getTime() - observedAt.getTime();
  return age >= 0 && age <= freshnessWindowMs ? "current" : "stale";
}

export const flightStatusLimits = {
  freshnessWindowMs,
  maximumFutureEventSkewMs,
};

const publicStatus = {
  SCHEDULED: "scheduled",
  DELAYED: "delayed",
  DEPARTED: "departed",
  ARRIVED: "arrived",
  CANCELLED: "cancelled",
  UNKNOWN: "unknown",
} as const satisfies Record<FlightOperationalStatus, PublicFlightOperationalStatus>;

function snapshotData(input: PartnerFlightStatusInput, myTripId: string) {
  return {
    myTripId,
    status: input.status,
    flightNumber: input.flightNumber,
    carrierCode: input.carrierCode,
    originAirport: input.originAirport,
    destinationAirport: input.destinationAirport,
    scheduledDepartureAt: input.scheduledDepartureAt,
    scheduledArrivalAt: input.scheduledArrivalAt,
    estimatedDepartureAt: input.estimatedDepartureAt,
    actualDepartureAt: input.actualDepartureAt,
    estimatedArrivalAt: input.estimatedArrivalAt,
    actualArrivalAt: input.actualArrivalAt,
    observedAt: input.observedAt,
  };
}

function isSnapshotCollision(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === "P2002"
    && (error.meta?.target === "FlightStatusSnapshot_myTripId_key"
      || Array.isArray(error.meta?.target) && error.meta.target.length === 1 && error.meta.target[0] === "myTripId");
}

export function createFlightStatusService(
  getDatabase: () => FlightStatusDatabase,
  now: () => Date = () => new Date(),
) {
  async function recordPartnerFlightStatus(input: PartnerFlightStatusInput) {
    const currentTime = now();
    if (input.observedAt.getTime() > currentTime.getTime() + maximumFutureEventSkewMs) return { applied: false };
    const database = getDatabase();
    const trip = await database.myTrip.findUnique({
      where: { providerName_partnerConversionId: { providerName: input.providerName, partnerConversionId: input.partnerConversionId } },
      select: { id: true, tripType: true, source: true, partnerConfirmationOccurredAt: true },
    });
    if (!trip
      || trip.tripType !== "FLIGHT"
      || trip.source !== "PARTNER_CONFIRMATION"
      || !trip.partnerConfirmationOccurredAt) return { applied: false };

    const data = snapshotData(input, trip.id);
    try {
      await database.flightStatusSnapshot.create({ data });
      return { applied: true };
    } catch (error) {
      if (!isSnapshotCollision(error)) throw error;
    }

    const existing = await database.flightStatusSnapshot.findUnique({ where: { myTripId: trip.id } });
    if (!existing || existing.observedAt >= input.observedAt) return { applied: false };
    const updated = await database.flightStatusSnapshot.updateMany({
      where: { myTripId: trip.id, observedAt: { lt: input.observedAt } },
      data,
    });
    return { applied: updated.count === 1 };
  }

  async function getUserFlightStatus(userId: string, myTripId: string): Promise<UserFlightStatus | null> {
    const database = getDatabase();
    const trip = await database.myTrip.findFirst({
      where: { id: myTripId, userId, tripType: "FLIGHT" },
      select: { id: true, providerName: true, source: true, partnerConfirmationOccurredAt: true, flightStatusSnapshot: true },
    });
    if (!trip) return null;
    const snapshot = trip.source === "PARTNER_CONFIRMATION" && trip.partnerConfirmationOccurredAt
      ? trip.flightStatusSnapshot
      : null;
    if (!snapshot) return { dataAvailable: false, providerName: trip.providerName };
    return {
      dataAvailable: true,
      providerName: trip.providerName,
      status: publicStatus[snapshot.status],
      flight: {
        flightNumber: snapshot.flightNumber,
        carrierCode: snapshot.carrierCode,
        originAirport: snapshot.originAirport,
        destinationAirport: snapshot.destinationAirport,
        scheduledDepartureAt: snapshot.scheduledDepartureAt.toISOString(),
        scheduledArrivalAt: snapshot.scheduledArrivalAt?.toISOString() ?? null,
      },
      timing: {
        estimatedDepartureAt: snapshot.estimatedDepartureAt?.toISOString() ?? null,
        actualDepartureAt: snapshot.actualDepartureAt?.toISOString() ?? null,
        estimatedArrivalAt: snapshot.estimatedArrivalAt?.toISOString() ?? null,
        actualArrivalAt: snapshot.actualArrivalAt?.toISOString() ?? null,
      },
      lastUpdatedAt: snapshot.observedAt.toISOString(),
      freshness: flightStatusFreshness(snapshot.observedAt, now()),
    };
  }

  return { recordPartnerFlightStatus, getUserFlightStatus };
}

export const { recordPartnerFlightStatus, getUserFlightStatus } = createFlightStatusService(
  () => getPrisma() as unknown as FlightStatusDatabase,
);
