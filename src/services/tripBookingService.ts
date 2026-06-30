import { getPrisma } from "@/lib/prisma";
import type { TripBookingStatus as PrismaTripBookingStatus, TripBookingType as PrismaTripBookingType } from "@/generated/prisma/enums";

export const publicTripBookingStatuses = ["upcoming", "past", "cancelled"] as const;
export type PublicTripBookingStatus = (typeof publicTripBookingStatuses)[number];

export type PublicTripBooking = {
  id: string;
  bookingReference: string;
  provider: string;
  tripType: "flight" | "hotel" | "car" | "package";
  status: PublicTripBookingStatus;
  origin: string | null;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  passengerCount: number;
  currency: string;
  totalAmount: number | null;
  externalBookingId: string | null;
};

export type TripBookingSummary = Record<PublicTripBookingStatus, number> & {
  total: number;
};

type TripBookingRecord = {
  id: string;
  bookingReference: string;
  provider: string;
  tripType: PrismaTripBookingType;
  status: PrismaTripBookingStatus;
  origin: string | null;
  destination: string;
  departureDate: Date;
  returnDate: Date | null;
  passengerCount: number;
  currency: string;
  totalAmount: { toString(): string } | number | string | null;
  externalBookingId: string | null;
};

const publicStatusToPrisma = {
  upcoming: "UPCOMING",
  past: "PAST",
  cancelled: "CANCELLED",
} as const satisfies Record<PublicTripBookingStatus, PrismaTripBookingStatus>;

const prismaStatusToPublic = {
  UPCOMING: "upcoming",
  PAST: "past",
  CANCELLED: "cancelled",
} as const satisfies Record<PrismaTripBookingStatus, PublicTripBookingStatus>;

const prismaTypeToPublic = {
  FLIGHT: "flight",
  HOTEL: "hotel",
  CAR: "car",
  PACKAGE: "package",
} as const satisfies Record<PrismaTripBookingType, PublicTripBooking["tripType"]>;

const tripBookingSelect = {
  id: true,
  bookingReference: true,
  provider: true,
  tripType: true,
  status: true,
  origin: true,
  destination: true,
  departureDate: true,
  returnDate: true,
  passengerCount: true,
  currency: true,
  totalAmount: true,
  externalBookingId: true,
} as const;

export function isPublicTripBookingStatus(value: string): value is PublicTripBookingStatus {
  return publicTripBookingStatuses.includes(value as PublicTripBookingStatus);
}

export async function listUserTripBookings(userId: string, status?: PublicTripBookingStatus) {
  const prisma = getPrisma();
  const orderBy = status === "past" || status === "cancelled"
    ? { departureDate: "desc" as const }
    : { departureDate: "asc" as const };

  const where = {
    userId,
    ...(status ? { status: publicStatusToPrisma[status] } : {}),
  };

  const [trips, upcoming, past, cancelled] = await prisma.$transaction([
    prisma.tripBooking.findMany({
      where,
      orderBy,
      select: tripBookingSelect,
    }),
    prisma.tripBooking.count({ where: { userId, status: "UPCOMING" } }),
    prisma.tripBooking.count({ where: { userId, status: "PAST" } }),
    prisma.tripBooking.count({ where: { userId, status: "CANCELLED" } }),
  ]);

  return {
    trips: trips.map(serializeTripBooking),
    summary: {
      upcoming,
      past,
      cancelled,
      total: upcoming + past + cancelled,
    },
  };
}

export async function findUserTripBookingByReference(userId: string, bookingReference: string) {
  const trip = await getPrisma().tripBooking.findFirst({
    where: {
      userId,
      bookingReference,
    },
    select: tripBookingSelect,
  });

  return trip ? serializeTripBooking(trip) : null;
}

function serializeTripBooking(trip: TripBookingRecord): PublicTripBooking {
  return {
    id: trip.id,
    bookingReference: trip.bookingReference,
    provider: trip.provider,
    tripType: prismaTypeToPublic[trip.tripType],
    status: prismaStatusToPublic[trip.status],
    origin: trip.origin,
    destination: trip.destination,
    departureDate: trip.departureDate.toISOString(),
    returnDate: trip.returnDate?.toISOString() ?? null,
    passengerCount: trip.passengerCount,
    currency: trip.currency,
    totalAmount: trip.totalAmount === null ? null : Number(trip.totalAmount.toString()),
    externalBookingId: trip.externalBookingId,
  };
}
