import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  __savedTripsServiceTest,
  createSavedItemInputSchema,
  createUserSavedItem,
  deleteUserSavedItem,
  DuplicateSavedItemError,
  listUserSavedItems,
  SavedItemNotFoundError,
} from "@/services/savedTripsService";

type SavedTripRecord = {
  id: string;
  userId: string;
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
  userId: string;
  provider: string;
  airlineName: string;
  flightNumber: string | null;
  originAirport: string;
  destinationAirport: string;
  departureTime: Date;
  arrivalTime: Date;
  price: { toString(): string };
  currency: string;
  payload: unknown;
  createdAt: Date;
};

type SavedHotelRecord = {
  id: string;
  userId: string;
  provider: string;
  hotelName: string;
  destination: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: { toString(): string };
  currency: string;
  payload: unknown;
  createdAt: Date;
};

type SavedSearchRecord = {
  id: string;
  userId: string;
  type: "FLIGHT" | "HOTEL";
  label: string | null;
  origin: string | null;
  destination: string | null;
  checkIn: Date | null;
  checkOut: Date | null;
  query: unknown;
  createdAt: Date;
};

type SavedRecord = SavedTripRecord | SavedFlightRecord | SavedHotelRecord | SavedSearchRecord;
type QueryArgs = { where?: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc">; data?: Record<string, unknown> };

afterEach(() => {
  __savedTripsServiceTest.setPrismaClientForTesting(null);
});

test("listUserSavedItems scopes records by user and returns summary counts", async () => {
  const prisma = createSavedTripsPrisma({
    trips: [savedTrip({ id: "trip-1" }), savedTrip({ id: "other-trip", userId: "user-2" })],
    flights: [savedFlight({ id: "flight-1" })],
    hotels: [savedHotel({ id: "hotel-1" })],
    searches: [savedSearch({ id: "search-1" }), savedSearch({ id: "other-search", userId: "user-2" })],
  });
  __savedTripsServiceTest.setPrismaClientForTesting(prisma.client);

  const result = await listUserSavedItems("user-1");

  assert.deepEqual(result.items.map((item) => item.id).sort(), ["flight-1", "hotel-1", "search-1", "trip-1"]);
  assert.deepEqual(result.summary, {
    trips: 1,
    flights: 1,
    hotels: 1,
    searches: 1,
    total: 4,
  });
  assert.equal(result.items.some((item) => item.id === "other-trip" || item.id === "other-search"), false);
  assert.equal("userId" in result.items[0], false);
});

test("listUserSavedItems supports type filters while keeping full summary counts", async () => {
  const prisma = createSavedTripsPrisma({
    trips: [savedTrip({ id: "trip-1" })],
    flights: [savedFlight({ id: "flight-1" })],
    hotels: [savedHotel({ id: "hotel-1" })],
    searches: [savedSearch({ id: "search-1" })],
  });
  __savedTripsServiceTest.setPrismaClientForTesting(prisma.client);

  const result = await listUserSavedItems("user-1", { type: "trip" });

  assert.deepEqual(result.items.map((item) => item.id), ["trip-1"]);
  assert.deepEqual(result.summary, {
    trips: 1,
    flights: 1,
    hotels: 1,
    searches: 1,
    total: 4,
  });
});

test("createUserSavedItem validates and creates user-owned saved trips without accepting userId", async () => {
  const prisma = createSavedTripsPrisma({ trips: [] });
  __savedTripsServiceTest.setPrismaClientForTesting(prisma.client);

  const parsed = createSavedItemInputSchema.parse({
    type: "trip",
    userId: "attacker-user",
    name: "Summer in Lisbon",
    startsAt: "2026-08-01T00:00:00.000Z",
    endsAt: "2026-08-10T00:00:00.000Z",
    destination: "Lisbon",
    payload: { routeId: "lisbon" },
  });
  const item = await createUserSavedItem("user-1", parsed);

  assert.equal(item.type, "trip");
  assert.equal(item.id, "created-trip-1");
  assert.deepEqual(prisma.createCalls[0].data, {
    userId: "user-1",
    name: "Summer in Lisbon",
    startsAt: new Date("2026-08-01T00:00:00.000Z"),
    endsAt: new Date("2026-08-10T00:00:00.000Z"),
    destination: "Lisbon",
    payload: { routeId: "lisbon" },
  });
});

test("createUserSavedItem rejects duplicate saved trips for the same user", async () => {
  const prisma = createSavedTripsPrisma({
    trips: [savedTrip({ name: "Summer in Lisbon", destination: "Lisbon" })],
  });
  __savedTripsServiceTest.setPrismaClientForTesting(prisma.client);

  await assert.rejects(
    () => createUserSavedItem("user-1", {
      type: "trip",
      name: "Summer in Lisbon",
      destination: "Lisbon",
      payload: {},
    }),
    DuplicateSavedItemError,
  );
  assert.equal(prisma.createCalls.length, 0);
});

test("deleteUserSavedItem deletes only records owned by the authenticated user", async () => {
  const prisma = createSavedTripsPrisma({
    trips: [savedTrip({ id: "owned", userId: "user-1" }), savedTrip({ id: "other", userId: "user-2" })],
  });
  __savedTripsServiceTest.setPrismaClientForTesting(prisma.client);

  await deleteUserSavedItem("user-1", { type: "trip", id: "owned" });
  await assert.rejects(
    () => deleteUserSavedItem("user-1", { type: "trip", id: "other" }),
    SavedItemNotFoundError,
  );

  assert.deepEqual(prisma.deleteManyCalls.map((call) => call.where), [
    { id: "owned", userId: "user-1" },
    { id: "other", userId: "user-1" },
  ]);
});

function createSavedTripsPrisma(data: {
  trips?: SavedTripRecord[];
  flights?: SavedFlightRecord[];
  hotels?: SavedHotelRecord[];
  searches?: SavedSearchRecord[];
}) {
  const trips = [...(data.trips ?? [])];
  const flights = [...(data.flights ?? [])];
  const hotels = [...(data.hotels ?? [])];
  const searches = [...(data.searches ?? [])];
  const createCalls: QueryArgs[] = [];
  const deleteManyCalls: QueryArgs[] = [];

  const client = {
    savedTrip: delegate(trips, "created-trip-1", createSavedTripRecord),
    savedFlight: delegate(flights, "created-flight-1", createSavedFlightRecord),
    savedHotel: delegate(hotels, "created-hotel-1", createSavedHotelRecord),
    savedSearch: delegate(searches, "created-search-1", createSavedSearchRecord),
    async $transaction<T extends readonly Promise<unknown>[]>(
      queries: T,
    ): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
      return Promise.all(queries) as Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;
    },
  };

  function delegate<TRecord extends SavedRecord>(
    records: TRecord[],
    createdId: string,
    buildRecord: (data: Record<string, unknown>, id: string) => TRecord,
  ) {
    return {
      async findMany(args: QueryArgs) {
        return records.filter((record) => matchesWhere(record, args.where)).sort(byCreatedAtDesc);
      },
      async count(args: QueryArgs) {
        return records.filter((record) => matchesWhere(record, args.where)).length;
      },
      async findFirst(args: QueryArgs) {
        return records.find((record) => matchesWhere(record, args.where)) ?? null;
      },
      async create(args: QueryArgs) {
        createCalls.push(args);
        const record = buildRecord(args.data ?? {}, createdId);
        records.push(record);
        return record;
      },
      async deleteMany(args: QueryArgs) {
        deleteManyCalls.push(args);
        const index = records.findIndex((record) => matchesWhere(record, args.where));
        if (index === -1) return { count: 0 };
        records.splice(index, 1);
        return { count: 1 };
      },
    };
  }

  return { client, createCalls, deleteManyCalls };
}

function matchesWhere(record: SavedRecord, where: Record<string, unknown> = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && "equals" in value) {
      return JSON.stringify(record[key as keyof SavedRecord]) === JSON.stringify(value.equals);
    }

    const recordValue = record[key as keyof SavedRecord];
    if (recordValue instanceof Date && value instanceof Date) {
      return recordValue.getTime() === value.getTime();
    }

    return recordValue === value;
  });
}

function byCreatedAtDesc(left: SavedRecord, right: SavedRecord) {
  return right.createdAt.getTime() - left.createdAt.getTime();
}

function savedTrip(overrides: Partial<SavedTripRecord> = {}): SavedTripRecord {
  return {
    id: "trip-1",
    userId: "user-1",
    name: "Saved trip",
    startsAt: null,
    endsAt: null,
    destination: null,
    payload: {},
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides,
  };
}

function savedFlight(overrides: Partial<SavedFlightRecord> = {}): SavedFlightRecord {
  return {
    id: "flight-1",
    userId: "user-1",
    provider: "provider",
    airlineName: "Airline",
    flightNumber: "KT1",
    originAirport: "JFK",
    destinationAirport: "LHR",
    departureTime: new Date("2026-07-01T00:00:00.000Z"),
    arrivalTime: new Date("2026-07-01T08:00:00.000Z"),
    price: decimal("499.99"),
    currency: "USD",
    payload: {},
    createdAt: new Date("2026-06-02T00:00:00.000Z"),
    ...overrides,
  };
}

function savedHotel(overrides: Partial<SavedHotelRecord> = {}): SavedHotelRecord {
  return {
    id: "hotel-1",
    userId: "user-1",
    provider: "provider",
    hotelName: "Hotel",
    destination: "London",
    checkIn: new Date("2026-07-01T00:00:00.000Z"),
    checkOut: new Date("2026-07-05T00:00:00.000Z"),
    totalPrice: decimal("899.99"),
    currency: "USD",
    payload: {},
    createdAt: new Date("2026-06-03T00:00:00.000Z"),
    ...overrides,
  };
}

function savedSearch(overrides: Partial<SavedSearchRecord> = {}): SavedSearchRecord {
  return {
    id: "search-1",
    userId: "user-1",
    type: "FLIGHT",
    label: "JFK to LHR",
    origin: "JFK",
    destination: "LHR",
    checkIn: null,
    checkOut: null,
    query: { origin: "JFK", destination: "LHR" },
    createdAt: new Date("2026-06-04T00:00:00.000Z"),
    ...overrides,
  };
}

function createSavedTripRecord(data: Record<string, unknown>, id: string): SavedTripRecord {
  return savedTrip({ id, ...data });
}

function createSavedFlightRecord(data: Record<string, unknown>, id: string): SavedFlightRecord {
  return savedFlight({ id, ...data, price: decimal(String(data.price ?? "0")) });
}

function createSavedHotelRecord(data: Record<string, unknown>, id: string): SavedHotelRecord {
  return savedHotel({ id, ...data, totalPrice: decimal(String(data.totalPrice ?? "0")) });
}

function createSavedSearchRecord(data: Record<string, unknown>, id: string): SavedSearchRecord {
  return savedSearch({ id, ...data });
}

function decimal(value: string) {
  return {
    toString() {
      return value;
    },
  };
}
