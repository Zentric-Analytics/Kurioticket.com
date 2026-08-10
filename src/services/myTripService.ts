import { getPrisma } from "@/lib/prisma";
import { requireProviderUrl, validateProviderUrl } from "@/lib/provider-url";
import type { MyTripSource, MyTripStatus, MyTripType } from "@/generated/prisma/enums";

export const publicMyTripStatuses = ["upcoming", "past", "cancelled"] as const;
export type PublicMyTripStatus = (typeof publicMyTripStatuses)[number];

export type PublicMyTrip = {
  id: string; tripType: "flight" | "hotel" | "car" | "package"; status: PublicMyTripStatus;
  providerName: string; providerConfirmationCode: string; origin: string | null; destination: string;
  departureDate: string; returnDate: string | null; travelerCount: number; currency: string;
  totalAmount: number | null; providerAction: { url: string; label: string; external: true } | null;
};

type MyTripRecord = {
  id: string; tripType: MyTripType; status: MyTripStatus; providerName: string;
  providerConfirmationCode: string; origin: string | null; destination: string; departureDate: Date;
  returnDate: Date | null; travelerCount: number; currency: string;
  totalAmount: { toString(): string } | number | string | null; providerManageUrl: string | null;
};

type MyTripClient = {
  myTrip: {
    findMany(args: unknown): Promise<MyTripRecord[]>; count(args: unknown): Promise<number>;
    upsert(args: unknown): Promise<MyTripRecord>;
  };
  $transaction<T extends readonly Promise<unknown>[]>(queries: T): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;
};

let clientForTesting: MyTripClient | null = null;
const statusToDb = { upcoming: "UPCOMING", past: "PAST", cancelled: "CANCELLED" } as const satisfies Record<PublicMyTripStatus, MyTripStatus>;
const statusToPublic = { UPCOMING: "upcoming", PAST: "past", CANCELLED: "cancelled" } as const satisfies Record<MyTripStatus, PublicMyTripStatus>;
const typeToPublic = { FLIGHT: "flight", HOTEL: "hotel", CAR: "car", PACKAGE: "package" } as const satisfies Record<MyTripType, PublicMyTrip["tripType"]>;
const select = { id: true, tripType: true, status: true, providerName: true, providerConfirmationCode: true, origin: true, destination: true, departureDate: true, returnDate: true, travelerCount: true, currency: true, totalAmount: true, providerManageUrl: true } as const;

export function isPublicMyTripStatus(value: string): value is PublicMyTripStatus {
  return publicMyTripStatuses.includes(value as PublicMyTripStatus);
}

export async function listUserMyTrips(userId: string, status?: PublicMyTripStatus) {
  const prisma = getClient();
  const where = { userId, ...(status ? { status: statusToDb[status] } : {}) };
  const [trips, upcoming, past, cancelled] = await prisma.$transaction([
    prisma.myTrip.findMany({ where, orderBy: { departureDate: status === "past" || status === "cancelled" ? "desc" : "asc" }, select }),
    prisma.myTrip.count({ where: { userId, status: "UPCOMING" } }),
    prisma.myTrip.count({ where: { userId, status: "PAST" } }),
    prisma.myTrip.count({ where: { userId, status: "CANCELLED" } }),
  ]) as [MyTripRecord[], number, number, number];
  return { trips: trips.map(serializeMyTrip), summary: { upcoming, past, cancelled, total: upcoming + past + cancelled } };
}

export type PartnerConfirmedMyTripInput = {
  userId: string; partnerConversionId: string; providerName: string; providerConfirmationCode: string;
  providerTripId?: string | null; providerManageUrl: string; tripType: MyTripType; status: MyTripStatus;
  source?: Exclude<MyTripSource, "MIGRATED_LEGACY">; origin?: string | null; destination: string;
  departureDate: Date; returnDate?: Date | null; travelerCount: number; currency: string; totalAmount?: number | null;
};

export async function upsertPartnerConfirmedMyTrip(input: PartnerConfirmedMyTripInput) {
  if (!input.userId || !input.partnerConversionId || !input.providerName || !input.providerConfirmationCode || !input.destination || input.travelerCount < 1) throw new Error("Trusted trip confirmation is incomplete.");
  const providerManageUrl = requireProviderUrl(input.providerManageUrl);
  const trip = await getClient().myTrip.upsert({
    where: { partnerConversionId: input.partnerConversionId },
    create: { ...input, source: input.source ?? "PARTNER_CONFIRMATION", providerManageUrl },
    update: { providerName: input.providerName, providerConfirmationCode: input.providerConfirmationCode, providerTripId: input.providerTripId, providerManageUrl, tripType: input.tripType, status: input.status, origin: input.origin, destination: input.destination, departureDate: input.departureDate, returnDate: input.returnDate, travelerCount: input.travelerCount, currency: input.currency, totalAmount: input.totalAmount },
    select,
  });
  return serializeMyTrip(trip);
}

function serializeMyTrip(trip: MyTripRecord): PublicMyTrip {
  const url = trip.providerManageUrl ? validateProviderUrl(trip.providerManageUrl) : null;
  return { id: trip.id, tripType: typeToPublic[trip.tripType], status: statusToPublic[trip.status], providerName: trip.providerName, providerConfirmationCode: trip.providerConfirmationCode, origin: trip.origin, destination: trip.destination, departureDate: trip.departureDate.toISOString(), returnDate: trip.returnDate?.toISOString() ?? null, travelerCount: trip.travelerCount, currency: trip.currency, totalAmount: trip.totalAmount === null ? null : Number(trip.totalAmount.toString()), providerAction: url ? { url, label: `Manage with ${trip.providerName}`, external: true } : null };
}

function getClient() { return clientForTesting ?? (getPrisma() as unknown as MyTripClient); }
export const __myTripServiceTest = { setPrismaClientForTesting(client: MyTripClient | null) { clientForTesting = client; } };
