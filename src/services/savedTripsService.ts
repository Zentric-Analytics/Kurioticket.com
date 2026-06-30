import { z } from "zod";

import { getPrisma } from "@/lib/prisma";
import type { SearchType as PrismaSearchType } from "@/generated/prisma/enums";

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

const savedTripInputSchema = z.object({
  type: z.literal("trip"),
  name: nonEmptyStringSchema,
  startsAt: isoDateTimeSchema.optional().nullable(),
  endsAt: isoDateTimeSchema.optional().nullable(),
  destination: z.string().trim().max(256).optional().nullable(),
  payload: jsonObjectSchema.default({}),
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
    deleteMany(args: unknown): Promise<{ count: number }>;
    count(args: unknown): Promise<number>;
  };
  $transaction<T extends readonly Promise<unknown>[]>(
    queries: T,
  ): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;
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

  const [trips, flights, hotels, searches, tripCount, flightCount, hotelCount, searchCount] =
    await prisma.$transaction([
      includeType("trip")
        ? prisma.savedTrip.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: savedTripSelect })
        : Promise.resolve([]),
      includeType("flight")
        ? prisma.savedFlight.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: savedFlightSelect })
        : Promise.resolve([]),
      includeType("hotel")
        ? prisma.savedHotel.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: savedHotelSelect })
        : Promise.resolve([]),
      includeType("search")
        ? prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: savedSearchSelect })
        : Promise.resolve([]),
      prisma.savedTrip.count({ where: { userId } }),
      prisma.savedFlight.count({ where: { userId } }),
      prisma.savedHotel.count({ where: { userId } }),
      prisma.savedSearch.count({ where: { userId } }),
    ]) as [SavedTripRecord[], SavedFlightRecord[], SavedHotelRecord[], SavedSearchRecord[], number, number, number, number];

  const items = [
    ...trips.map(serializeSavedTrip),
    ...flights.map(serializeSavedFlight),
    ...hotels.map(serializeSavedHotel),
    ...searches.map(serializeSavedSearch),
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

  const existing = await prisma.savedTrip.findFirst({
    where: { userId, name: input.name, startsAt, endsAt, destination },
    select: { id: true },
  });

  if (existing) throw new DuplicateSavedItemError();

  const savedTrip = await prisma.savedTrip.create({
    data: {
      userId,
      name: input.name,
      startsAt,
      endsAt,
      destination,
      payload: input.payload,
    },
    select: savedTripSelect,
  });

  return serializeSavedTrip(savedTrip);
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
  };
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

function serializeSavedSearch(search: SavedSearchRecord): PublicSavedSearch {
  return {
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
}

function getSavedItemCreatedAt(item: PublicSavedItem) {
  return item.createdAt;
}

export const __savedTripsServiceTest = {
  setPrismaClientForTesting(prisma: SavedTripsPrismaClient | null) {
    prismaClientForTesting = prisma;
  },
};
