import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import {
  ADMIN_CONFIRMED_TRIPS_PAGE_SIZE,
  decodeAdminTripCursor,
  encodeAdminTripCursor,
  isValidAdminTripId,
  tripConfirmationWindow,
  tripNeedsStatusReview,
  type AdminTripFilters,
} from "@/lib/adminConfirmedTripsDirectory";
import { escapePrismaContainsQuery } from "@/lib/adminIdentityDirectory";

const sourceWhere: Prisma.MyTripWhereInput = {
  source: "PARTNER_CONFIRMATION",
  partnerConfirmationOccurredAt: { not: null },
};

function tripWhere(filters: AdminTripFilters): Prisma.MyTripWhereInput {
  const q = escapePrismaContainsQuery(filters.q);
  return {
    ...sourceWhere,
    ...(filters.product !== "all" ? { tripType: filters.product } : {}),
    ...(filters.status !== "all" ? { status: filters.status } : {}),
    ...(filters.provider ? { providerName: { contains: escapePrismaContainsQuery(filters.provider), mode: "insensitive" } } : {}),
    ...(filters.from || filters.to ? { partnerConfirmationOccurredAt: tripConfirmationWindow(filters) } : {}),
    ...(q ? {
      OR: [
        { providerConfirmationCode: { contains: q, mode: "insensitive" } },
        { providerName: { contains: q, mode: "insensitive" } },
        { destination: { contains: q, mode: "insensitive" } },
        { origin: { contains: q, mode: "insensitive" } },
        { userId: { contains: q, mode: "insensitive" } },
        { user: { is: { email: { contains: q, mode: "insensitive" } } } },
      ],
    } : {}),
  };
}

const select = {
  id: true,
  userId: true,
  user: { select: { email: true } },
  tripType: true,
  status: true,
  providerName: true,
  providerConfirmationCode: true,
  providerTripId: true,
  origin: true,
  destination: true,
  departureDate: true,
  returnDate: true,
  travelerCount: true,
  partnerConfirmationOccurredAt: true,
  createdAt: true,
  updatedAt: true,
  currency: true,
  totalAmount: true,
  providerManageUrl: true,
} as const satisfies Prisma.MyTripSelect;

type TripRow = Prisma.MyTripGetPayload<{ select: typeof select }>;
function serialize(row: TripRow, now: Date) {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.user.email,
    tripType: row.tripType,
    status: row.status,
    providerName: row.providerName,
    providerConfirmationCode: row.providerConfirmationCode,
    providerTripId: row.providerTripId,
    origin: row.origin,
    destination: row.destination,
    departureDate: row.departureDate.toISOString(),
    returnDate: row.returnDate?.toISOString() ?? null,
    travelerCount: row.travelerCount,
    confirmedAt: row.partnerConfirmationOccurredAt!.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    currency: row.currency,
    totalAmount: row.totalAmount?.toString() ?? null,
    needsStatusReview: tripNeedsStatusReview(row, now),
  };
}

export type AdminConfirmedTripRow = ReturnType<typeof serialize>;
export type AdminConfirmedTripDirectoryResult =
  | { status: "ok"; rows: AdminConfirmedTripRow[]; nextCursor: string | null; totalMatching: number }
  | { status: "invalid_cursor" }
  | { status: "unavailable" };

export async function listAdminConfirmedTrips(
  filters: AdminTripFilters,
  rawCursor?: string,
): Promise<AdminConfirmedTripDirectoryResult> {
  const environment = getPublicEnvironment();
  const cursor = decodeAdminTripCursor(rawCursor, filters, environment);
  if (cursor === null) return { status: "invalid_cursor" };
  const db = getOptionalPrisma();
  if (!db) return { status: "unavailable" };
  const where = tripWhere(filters);
  const seek: Prisma.MyTripWhereInput | undefined = cursor
    ? { OR: [
      { partnerConfirmationOccurredAt: { lt: new Date(cursor.confirmedAt) } },
      { partnerConfirmationOccurredAt: new Date(cursor.confirmedAt), id: { lt: cursor.id } },
    ] }
    : undefined;
  try {
    const [count, page] = await db.$transaction([
      db.myTrip.count({ where }),
      db.myTrip.findMany({
        where: seek ? { AND: [where, seek] } : where,
        orderBy: [{ partnerConfirmationOccurredAt: "desc" }, { id: "desc" }],
        take: ADMIN_CONFIRMED_TRIPS_PAGE_SIZE + 1,
        select,
      }),
    ], { isolationLevel: "RepeatableRead" });
    const rows = page.slice(0, ADMIN_CONFIRMED_TRIPS_PAGE_SIZE);
    const last = rows.at(-1);
    const nextCursor = page.length > ADMIN_CONFIRMED_TRIPS_PAGE_SIZE && last
      ? encodeAdminTripCursor({ id: last.id, confirmedAt: last.partnerConfirmationOccurredAt!.toISOString() }, filters, environment)
      : null;
    const now = new Date();
    return { status: "ok", rows: rows.map(row => serialize(row, now)), nextCursor, totalMatching: count };
  } catch (error) {
    console.error("[admin:confirmed-trip-directory]", error);
    return { status: "unavailable" };
  }
}

export type AdminConfirmedTripDetailsResult =
  | { status: "ok"; trip: AdminConfirmedTripRow }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function getAdminConfirmedTripDetails(id: string): Promise<AdminConfirmedTripDetailsResult> {
  if (!isValidAdminTripId(id)) return { status: "not_found" };
  const db = getOptionalPrisma();
  if (!db) return { status: "unavailable" };
  try {
    const row = await db.myTrip.findFirst({ where: { ...sourceWhere, id }, select });
    return row ? { status: "ok", trip: serialize(row, new Date()) } : { status: "not_found" };
  } catch (error) {
    console.error("[admin:confirmed-trip-details]", error);
    return { status: "unavailable" };
  }
}
