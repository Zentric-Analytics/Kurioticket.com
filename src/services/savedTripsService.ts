import { z } from "zod";

import { getPrisma } from "@/lib/prisma";
import { parseSavedFlightSearchQuery } from "@/lib/saved-searches";
import type { RouteWatchStatus, SearchType as PrismaSearchType } from "@/generated/prisma/enums";
import { __routeWatchServiceTest, listRouteWatchSummariesForSavedSearches, validateSavedSearchForRouteWatch } from "@/services/routeWatchService";

export const savedItemTypes = ["trip", "flight", "hotel", "search"] as const;
export type SavedItemType = (typeof savedItemTypes)[number];

export type SavedItemsSummary = {
  trips: number;
  flights: number;
  hotels: number;
  searches: number;
  total: number;
};

export type PublicSavedTrip = {
  type: "trip";
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  destination: string | null;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  savedSearchId: string | null;
  detailedSearch: {
    origin: string;
    destination: string;
    tripType: string;
    departureDate: string;
    returnDate: string | null;
    adults: number;
    children: number;
    infants: number;
    travelers: number;
    cabinClass: string;
    currency: string | null;
    href: string;
  } | null;
  isWatching: boolean;
  routeWatchStatus: RouteWatchStatus | null;
  routeWatchId: string | null;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
  routeWatchUnavailableReason: "invalid" | "expired" | null;
};

export type PublicSavedFlight = {
  type: "flight";
  id: string;
  provider: string;
  airlineName: string;
  flightNumber: string | null;
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency: string;
  payload: unknown;
  createdAt: string;
};

export type PublicSavedHotel = {
  type: "hotel";
  id: string;
  provider: string;
  hotelName: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  currency: string;
  payload: unknown;
  createdAt: string;
};

export type PublicSavedSearch = {
  type: "search";
  id: string;
  searchType: "flight" | "hotel";
  label: string | null;
  origin: string | null;
  destination: string | null;
  checkIn: string | null;
  checkOut: string | null;
  query: unknown;
  createdAt: string;
  isWatching?: boolean;
  routeWatchStatus?: RouteWatchStatus;
  routeWatchId?: string;
  lastCheckedAt?: string | null;
  nextCheckAt?: string | null;
  routeWatchUnavailableReason?: "invalid" | "expired";
};

export type PublicSavedItem =
  | PublicSavedTrip
  | PublicSavedFlight
  | PublicSavedHotel
  | PublicSavedSearch;

export type ListSavedItemsOptions = {
  type?: SavedItemType;
};

export type ListSavedItemsResult = {
  items: PublicSavedItem[];
  summary: SavedItemsSummary;
};

export class DuplicateSavedItemError extends Error {
  constructor(message = "Saved item already exists.") {
    super(message);
    this.name = "DuplicateSavedItemError";
  }
}

export class SavedItemNotFoundError extends Error {
  constructor(message = "Saved item was not found.") {
    super(message);
    this.name = "SavedItemNotFoundError";
  }
}

const isoDateTimeSchema = z.string().datetime({ offset: true });
const nonEmptyStringSchema = z.string().trim().min(1).max(256);
const currencySchema = z.string().trim().min(3).max(3).transform((value) => value.toUpperCase());
const jsonObjectSchema = z.record(z.string(), z.unknown());


const flightSearchInputSchema = z
  .object({
    tripType: z.enum(["round-trip", "one-way"]),
    origin: z.string().trim().min(1).max(128),
    destination: z.string().trim().min(1).max(128),
    departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    adults: z.coerce.number().int().min(1).max(9),
    children: z.coerce.number().int().min(0).max(9).default(0),
    infants: z.coerce.number().int().min(0).max(9).default(0),
    travelers: z.coerce.number().int().min(1).max(27).optional(),
    cabinClass: z.enum(["economy", "business", "first"]),
    currency: currencySchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const travelers = value.adults + value.children + value.infants;
    if (value.travelers !== undefined && value.travelers !== travelers) {
      context.addIssue({ code: "custom", path: ["travelers"], message: "Traveler total must match passenger counts." });
    }
    if (value.tripType === "round-trip" && !value.returnDate) {
      context.addIssue({ code: "custom", path: ["returnDate"], message: "Return date is required for round trips." });
    }
    if (value.tripType === "one-way" && value.returnDate) {
      context.addIssue({ code: "custom", path: ["returnDate"], message: "One-way trips cannot include a return date." });
    }
  });

const savedTripInputSchema = z.object({
  type: z.literal("trip"),
  name: nonEmptyStringSchema,
  startsAt: isoDateTimeSchema.optional().nullable(),
  endsAt: isoDateTimeSchema.optional().nullable(),
  destination: z.string().trim().max(256).optional().nullable(),
  payload: jsonObjectSchema.default({}),
  flightSearch: flightSearchInputSchema.optional(),
});

const savedFlightInputSchema = z.object({
  type: z.literal("flight"),
  provider: nonEmptyStringSchema,
  airlineName: nonEmptyStringSchema,
  flightNumber: z.string().trim().max(64).optional().nullable(),
  originAirport: nonEmptyStringSchema.max(16),
  destinationAirport: nonEmptyStringSchema.max(16),
  departureTime: isoDateTimeSchema,
  arrivalTime: isoDateTimeSchema,
  price: z.coerce.number().finite().nonnegative(),
  currency: currencySchema.default("USD"),
  payload: jsonObjectSchema.default({}),
});

const savedHotelInputSchema = z.object({
  type: z.literal("hotel"),
  provider: nonEmptyStringSchema,
  hotelName: nonEmptyStringSchema,
  destination: nonEmptyStringSchema,
  checkIn: isoDateTimeSchema,
  checkOut: isoDateTimeSchema,
  totalPrice: z.coerce.number().finite().nonnegative(),
  currency: currencySchema.default("USD"),
  payload: jsonObjectSchema.default({}),
});

const savedSearchInputSchema = z.object({
  type: z.literal("search"),
  searchType: z.enum(["flight", "hotel"]),
  label: z.string().trim().max(256).optional().nullable(),
  origin: z.string().trim().max(128).optional().nullable(),
  destination: z.string().trim().max(256).optional().nullable(),
  checkIn: isoDateTimeSchema.optional().nullable(),
  checkOut: isoDateTimeSchema.optional().nullable(),
  query: jsonObjectSchema,
});

export const createSavedItemInputSchema = z.discriminatedUnion("type", [
  savedTripInputSchema,
  savedFlightInputSchema,
  savedHotelInputSchema,
  savedSearchInputSchema,
]);

export const deleteSavedItemInputSchema = z.object({
  type: z.enum(savedItemTypes),
  id: z.string().trim().min(1).max(128),
});

export type CreateSavedItemInput = z.infer<typeof createSavedItemInputSchema>;
export type DeleteSavedItemInput = z.infer<typeof deleteSavedItemInputSchema>;

type SavedTripRecord = {
  id: string;
  name: string;
  startsAt: Date | null;
  endsAt: Date | null;
  destination: string | null;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
  savedSearch?: (SavedSearchRecord & { routeWatchState?: { id: string; status: RouteWatchStatus; lastCheckedAt: Date | null; nextCheckAt: Date | null } | null }) | null;
};

type SavedFlightRecord = {
  id: string;
  provider: string;
  airlineName: string;
  flightNumber: string | null;
  originAirport: string;
  destinationAirport: string;
  departureTime: Date;
  arrivalTime: Date;
  price: { toString(): string } | number | string;
  currency: string;
  payload: unknown;
  createdAt: Date;
};

type SavedHotelRecord = {
  id: string;
  provider: string;
  hotelName: string;
  destination: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: { toString(): string } | number | string;
  currency: string;
  payload: unknown;
  createdAt: Date;
};

type SavedSearchRecord = {
  id: string;
  type: PrismaSearchType;
  label: string | null;
  origin: string | null;
  destination: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  query: unknown;
  createdAt: Date;
  savedTripId?: string | null;
};

type SavedTripsPrismaClient = {
  savedTrip: {
    findMany(args: unknown): Promise<SavedTripRecord[]>;
    findFirst(args: unknown): Promise<SavedTripRecord | null>;
    create(args: unknown): Promise<SavedTripRecord>;
    deleteMany(args: unknown): Promise<{ count: number }>;
    count(args: unknown): Promise<number>;
  };
  savedFlight: {
    findMany(args: unknown): Promise<SavedFlightRecord[]>;
    findFirst(args: unknown): Promise<SavedFlightRecord | null>;
    create(args: unknown): Promise<SavedFlightRecord>;
    deleteMany(args: unknown): Promise<{ count: number }>;
    count(args: unknown): Promise<number>;
  };
  savedHotel: {
    findMany(args: unknown): Promise<SavedHotelRecord[]>;
    findFirst(args: unknown): Promise<SavedHotelRecord | null>;
    create(args: unknown): Promise<SavedHotelRecord>;
    deleteMany(args: unknown): Promise<{ count: number }>;
    count(args: unknown): Promise<number>;
  };
  savedSearch: {
    findMany(args: unknown): Promise<SavedSearchRecord[]>;
    findFirst(args: unknown): Promise<SavedSearchRecord | null>;
    create(args: unknown): Promise<SavedSearchRecord>;
    update?(args: unknown): Promise<SavedSearchRecord>;
    deleteMany(args: unknown): Promise<{ count: number }>;
    count(args: unknown): Promise<number>;
  };
  routeWatchState?: {
    findMany(args: unknown): Promise<[]>;
  };
  $transaction<T extends readonly Promise<unknown>[]>(
    queries: T,
  ): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;
  $transaction<T>(fn: (tx: SavedTripsPrismaClient) => Promise<T>): Promise<T>;
};

let prismaClientForTesting: SavedTripsPrismaClient | null = null;

const savedTripSelect = {
  id: true,
  name: true,
  startsAt: true,
  endsAt: true,
  destination: true,
  payload: true,
  createdAt: true,
  updatedAt: true,
  savedSearch: {
    select: {
      id: true, type: true, label: true, origin: true, destination: true, checkIn: true, checkOut: true, query: true, createdAt: true,
      routeWatchState: { select: { id: true, status: true, lastCheckedAt: true, nextCheckAt: true } },
    },
  },
} as const;

const savedFlightSelect = {
  id: true,
  provider: true,
  airlineName: true,
  flightNumber: true,
  originAirport: true,
  destinationAirport: true,
  departureTime: true,
  arrivalTime: true,
  price: true,
  currency: true,
  payload: true,
  createdAt: true,
} as const;

const savedHotelSelect = {
  id: true,
  provider: true,
  hotelName: true,
  destination: true,
  checkIn: true,
  checkOut: true,
  totalPrice: true,
  currency: true,
  payload: true,
  createdAt: true,
} as const;

const savedSearchSelect = {
  id: true,
  type: true,
  label: true,
  origin: true,
  destination: true,
  checkIn: true,
  checkOut: true,
  query: true,
  createdAt: true,
  savedTripId: true,
} as const;

const searchTypeToPrisma = {
  flight: "FLIGHT",
  hotel: "HOTEL",
} as const satisfies Record<"flight" | "hotel", PrismaSearchType>;

const prismaSearchTypeToPublic = {
  FLIGHT: "flight",
  HOTEL: "hotel",
} as const satisfies Record<PrismaSearchType, PublicSavedSearch["searchType"]>;

export function isSavedItemType(value: string): value is SavedItemType {
  return savedItemTypes.includes(value as SavedItemType);
}

export async function listUserSavedItems(
  userId: string,
  options: ListSavedItemsOptions = {},
): Promise<ListSavedItemsResult> {
  const prisma = getSavedTripsPrisma();
  const includeType = (type: SavedItemType) => !options.type || options.type === type;

  const [tripCount, flightCount, hotelCount, searchCount] =
    await prisma.$transaction([
      prisma.savedTrip.count({ where: { userId } }),
      prisma.savedFlight.count({ where: { userId } }),
      prisma.savedHotel.count({ where: { userId } }),
      prisma.savedSearch.count({ where: { userId } }),
    ]) as [number, number, number, number];

  const trips = includeType("trip")
    ? await prisma.savedTrip.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: savedTripSelect })
    : [];
  const flights = includeType("flight")
    ? await prisma.savedFlight.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: savedFlightSelect })
    : [];
  const hotels = includeType("hotel")
    ? await prisma.savedHotel.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: savedHotelSelect })
    : [];
  const searches = includeType("search")
    ? (await prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: savedSearchSelect })).filter((search) => !search.savedTripId)
    : [];

  let watchSummaries = new Map();
  if (searches.length) {
    if (prismaClientForTesting && !prismaClientForTesting.routeWatchState) {
      watchSummaries = new Map();
    } else {
      watchSummaries = await listRouteWatchSummariesForSavedSearches(userId, searches.map((search) => search.id));
    }
  }

  const items = [
    ...trips.map(serializeSavedTrip),
    ...flights.map(serializeSavedFlight),
    ...hotels.map(serializeSavedHotel),
    ...searches.map((search) => serializeSavedSearch(search, watchSummaries.get(search.id))),
  ].sort((left, right) => getSavedItemCreatedAt(right).localeCompare(getSavedItemCreatedAt(left)));

  return {
    items,
    summary: {
      trips: tripCount,
      flights: flightCount,
      hotels: hotelCount,
      searches: searchCount,
      total: tripCount + flightCount + hotelCount + searchCount,
    },
  };
}

export async function createUserSavedItem(
  userId: string,
  input: CreateSavedItemInput,
): Promise<PublicSavedItem> {
  switch (input.type) {
    case "trip":
      return createUserSavedTrip(userId, input);
    case "flight":
      return createUserSavedFlight(userId, input);
    case "hotel":
      return createUserSavedHotel(userId, input);
    case "search":
      return createUserSavedSearch(userId, input);
  }
}

export async function deleteUserSavedItem(
  userId: string,
  input: DeleteSavedItemInput,
): Promise<void> {
  const prisma = getSavedTripsPrisma();
  const result = await getDeleteDelegate(prisma, input.type).deleteMany({
    where: { id: input.id, userId },
  });

  if (result.count === 0) {
    throw new SavedItemNotFoundError();
  }
}

async function createUserSavedTrip(
  userId: string,
  input: Extract<CreateSavedItemInput, { type: "trip" }>,
) {
  const prisma = getSavedTripsPrisma();
  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  const destination = input.destination || null;

  if (!input.flightSearch) {
    const existing = await prisma.savedTrip.findFirst({
      where: { userId, name: input.name, startsAt, endsAt, destination },
      select: { id: true },
    });

    if (existing) throw new DuplicateSavedItemError();

    const savedTrip = await prisma.savedTrip.create({
      data: { userId, name: input.name, startsAt, endsAt, destination, payload: input.payload },
      select: savedTripSelect,
    });

    return serializeSavedTrip(savedTrip);
  }

  const travelers = input.flightSearch.adults + input.flightSearch.children + input.flightSearch.infants;
  const canonicalQuery = {
    tripType: input.flightSearch.tripType,
    origin: input.flightSearch.origin,
    destination: input.flightSearch.destination,
    departureDate: input.flightSearch.departureDate,
    ...(input.flightSearch.returnDate ? { returnDate: input.flightSearch.returnDate } : {}),
    adults: input.flightSearch.adults,
    children: input.flightSearch.children,
    infants: input.flightSearch.infants,
    travelers,
    cabinClass: input.flightSearch.cabinClass,
    ...(input.flightSearch.currency ? { currency: input.flightSearch.currency } : {}),
  };
  const parsed = parseSavedFlightSearchQuery(canonicalQuery);
  if (!parsed) throw new Error("Invalid canonical flight search.");

  return prisma.$transaction(async (tx) => {
    let savedSearch = await tx.savedSearch.findFirst({
      where: { userId, type: "FLIGHT", origin: parsed.origin, destination: parsed.destination, checkIn: new Date(`${parsed.departureDate}T00:00:00.000Z`), checkOut: parsed.returnDate ? new Date(`${parsed.returnDate}T00:00:00.000Z`) : null, query: { equals: canonicalQuery } },
      select: { id: true, savedTripId: true },
    }) as (SavedSearchRecord & { savedTripId?: string | null }) | null;

    let savedTrip = savedSearch?.savedTripId ? await tx.savedTrip.findFirst({ where: { id: savedSearch.savedTripId, userId }, select: savedTripSelect }) : null;

    if (!savedTrip) {
      savedTrip = await tx.savedTrip.findFirst({
        where: { userId, name: input.name, startsAt, endsAt, destination },
        select: savedTripSelect,
      });
    }

    if (!savedTrip) {
      savedTrip = await tx.savedTrip.create({
        data: { userId, name: input.name, startsAt, endsAt, destination, payload: input.payload },
        select: savedTripSelect,
      });
    }

    if (!savedSearch) {
      savedSearch = await tx.savedSearch.create({
        data: {
          userId, type: "FLIGHT", label: input.name, origin: parsed.origin, destination: parsed.destination,
          checkIn: new Date(`${parsed.departureDate}T00:00:00.000Z`),
          checkOut: parsed.returnDate ? new Date(`${parsed.returnDate}T00:00:00.000Z`) : null,
          query: canonicalQuery, savedTripId: savedTrip.id,
        },
        select: savedSearchSelect,
      }) as SavedSearchRecord;
    } else if (!savedSearch.savedTripId) {
      if (!tx.savedSearch.update) throw new Error("Saved search update unavailable.");
      savedSearch = await tx.savedSearch.update({ where: { id: savedSearch.id, userId }, data: { savedTripId: savedTrip.id }, select: savedSearchSelect }) as SavedSearchRecord;
    }

    const linkedTrip = await tx.savedTrip.findFirst({ where: { id: savedTrip.id, userId }, select: savedTripSelect });
    return serializeSavedTrip(linkedTrip ?? savedTrip);
  });
}

async function createUserSavedFlight(
  userId: string,
  input: Extract<CreateSavedItemInput, { type: "flight" }>,
) {
  const prisma = getSavedTripsPrisma();
  const departureTime = new Date(input.departureTime);
  const arrivalTime = new Date(input.arrivalTime);
  const flightNumber = input.flightNumber || null;

  const existing = await prisma.savedFlight.findFirst({
    where: {
      userId,
      provider: input.provider,
      airlineName: input.airlineName,
      flightNumber,
      originAirport: input.originAirport,
      destinationAirport: input.destinationAirport,
      departureTime,
    },
    select: { id: true },
  });

  if (existing) throw new DuplicateSavedItemError();

  const savedFlight = await prisma.savedFlight.create({
    data: {
      userId,
      provider: input.provider,
      airlineName: input.airlineName,
      flightNumber,
      originAirport: input.originAirport,
      destinationAirport: input.destinationAirport,
      departureTime,
      arrivalTime,
      price: input.price,
      currency: input.currency,
      payload: input.payload,
    },
    select: savedFlightSelect,
  });

  return serializeSavedFlight(savedFlight);
}

async function createUserSavedHotel(
  userId: string,
  input: Extract<CreateSavedItemInput, { type: "hotel" }>,
) {
  const prisma = getSavedTripsPrisma();
  const checkIn = new Date(input.checkIn);
  const checkOut = new Date(input.checkOut);

  const existing = await prisma.savedHotel.findFirst({
    where: {
      userId,
      provider: input.provider,
      hotelName: input.hotelName,
      destination: input.destination,
      checkIn,
      checkOut,
    },
    select: { id: true },
  });

  if (existing) throw new DuplicateSavedItemError();

  const savedHotel = await prisma.savedHotel.create({
    data: {
      userId,
      provider: input.provider,
      hotelName: input.hotelName,
      destination: input.destination,
      checkIn,
      checkOut,
      totalPrice: input.totalPrice,
      currency: input.currency,
      payload: input.payload,
    },
    select: savedHotelSelect,
  });

  return serializeSavedHotel(savedHotel);
}

async function createUserSavedSearch(
  userId: string,
  input: Extract<CreateSavedItemInput, { type: "search" }>,
) {
  const prisma = getSavedTripsPrisma();
  const type = searchTypeToPrisma[input.searchType];
  const checkIn = input.checkIn ? new Date(input.checkIn) : null;
  const checkOut = input.checkOut ? new Date(input.checkOut) : null;
  const label = input.label || null;
  const origin = input.origin || null;
  const destination = input.destination || null;

  const existing = await prisma.savedSearch.findFirst({
    where: { userId, type, label, origin, destination, checkIn, checkOut, query: { equals: input.query } },
    select: { id: true },
  });

  if (existing) throw new DuplicateSavedItemError();

  const savedSearch = await prisma.savedSearch.create({
    data: {
      userId,
      type,
      label,
      origin,
      destination,
      checkIn,
      checkOut,
      query: input.query,
    },
    select: savedSearchSelect,
  });

  return serializeSavedSearch(savedSearch);
}

function getDeleteDelegate(prisma: SavedTripsPrismaClient, type: SavedItemType) {
  switch (type) {
    case "trip":
      return prisma.savedTrip;
    case "flight":
      return prisma.savedFlight;
    case "hotel":
      return prisma.savedHotel;
    case "search":
      return prisma.savedSearch;
  }
}

function getSavedTripsPrisma(): SavedTripsPrismaClient {
  return prismaClientForTesting ?? (getPrisma() as unknown as SavedTripsPrismaClient);
}

function serializeSavedTrip(trip: SavedTripRecord): PublicSavedTrip {
  return {
    type: "trip",
    id: trip.id,
    name: trip.name,
    startsAt: trip.startsAt?.toISOString() ?? null,
    endsAt: trip.endsAt?.toISOString() ?? null,
    destination: trip.destination,
    payload: trip.payload,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    ...serializeLinkedSavedSearch(trip.savedSearch ?? null),
  };
}

function emptyLinkedSavedSearchFields() {
  return { savedSearchId: null, detailedSearch: null, isWatching: false, routeWatchStatus: null, routeWatchId: null, lastCheckedAt: null, nextCheckAt: null, routeWatchUnavailableReason: null } as const;
}

function serializeLinkedSavedSearch(search: SavedTripRecord["savedSearch"]) {
  if (!search || search.type !== "FLIGHT") return emptyLinkedSavedSearchFields();
  const parsed = parseSavedFlightSearchQuery(search.query);
  if (!parsed || !search.origin || !search.destination) {
    return { ...emptyLinkedSavedSearchFields(), savedSearchId: search.id, routeWatchUnavailableReason: "invalid" as const };
  }
  const watch = search.routeWatchState ?? null;
  const fields = {
    savedSearchId: search.id,
    detailedSearch: { origin: parsed.origin, destination: parsed.destination, tripType: parsed.tripType, departureDate: parsed.departureDate, returnDate: parsed.returnDate ?? null, adults: parsed.adults, children: parsed.children, infants: parsed.infants, travelers: parsed.travelers, cabinClass: parsed.cabinClass, currency: parsed.currency ?? null, href: parsed.href },
    isWatching: watch?.status === "ACTIVE", routeWatchStatus: watch?.status ?? null, routeWatchId: watch?.id ?? null, lastCheckedAt: watch?.lastCheckedAt?.toISOString() ?? null, nextCheckAt: watch?.nextCheckAt?.toISOString() ?? null, routeWatchUnavailableReason: null as "invalid" | "expired" | null,
  };
  try { validateSavedSearchForRouteWatch({ ...search, userId: "" }); } catch (error) { fields.routeWatchUnavailableReason = error instanceof Error && error.message === "This departure date has passed." ? "expired" : "invalid"; }
  return fields;
}

function serializeSavedFlight(flight: SavedFlightRecord): PublicSavedFlight {
  return {
    type: "flight",
    id: flight.id,
    provider: flight.provider,
    airlineName: flight.airlineName,
    flightNumber: flight.flightNumber,
    originAirport: flight.originAirport,
    destinationAirport: flight.destinationAirport,
    departureTime: flight.departureTime.toISOString(),
    arrivalTime: flight.arrivalTime.toISOString(),
    price: Number(flight.price.toString()),
    currency: flight.currency,
    payload: flight.payload,
    createdAt: flight.createdAt.toISOString(),
  };
}

function serializeSavedHotel(hotel: SavedHotelRecord): PublicSavedHotel {
  return {
    type: "hotel",
    id: hotel.id,
    provider: hotel.provider,
    hotelName: hotel.hotelName,
    destination: hotel.destination,
    checkIn: hotel.checkIn.toISOString(),
    checkOut: hotel.checkOut.toISOString(),
    totalPrice: Number(hotel.totalPrice.toString()),
    currency: hotel.currency,
    payload: hotel.payload,
    createdAt: hotel.createdAt.toISOString(),
  };
}

function serializeSavedSearch(search: SavedSearchRecord, watch?: { id: string; status: RouteWatchStatus; isWatching: boolean; lastCheckedAt: string | null; nextCheckAt: string | null }): PublicSavedSearch {
  const item: PublicSavedSearch = {
    type: "search",
    id: search.id,
    searchType: prismaSearchTypeToPublic[search.type],
    label: search.label,
    origin: search.origin,
    destination: search.destination,
    checkIn: search.checkIn?.toISOString() ?? null,
    checkOut: search.checkOut?.toISOString() ?? null,
    query: search.query,
    createdAt: search.createdAt.toISOString(),
  };

  if (search.type === "FLIGHT") {
    try {
      validateSavedSearchForRouteWatch({ ...search, userId: "" });
      item.isWatching = watch?.isWatching ?? false;
      item.routeWatchStatus = watch?.status;
      item.routeWatchId = watch?.id;
      item.lastCheckedAt = watch?.lastCheckedAt ?? null;
      item.nextCheckAt = watch?.nextCheckAt ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      item.routeWatchUnavailableReason = message === "This departure date has passed." ? "expired" : "invalid";
    }
  }

  return item;
}

function getSavedItemCreatedAt(item: PublicSavedItem) {
  return item.createdAt;
}

export const __savedTripsServiceTest = {
  setPrismaClientForTesting(prisma: SavedTripsPrismaClient | null) {
    prismaClientForTesting = prisma;
    __routeWatchServiceTest.setPrismaClientForTesting(prisma && prisma.routeWatchState ? prisma as never : null);
  },
};
