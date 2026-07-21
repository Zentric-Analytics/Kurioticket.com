import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  __tripBookingServiceTest,
  findUserTripBookingByReference,
  listUserTripBookings,
} from "@/services/tripBookingService";
import type { PublicTripBooking } from "@/services/tripBookingService";

type TripBookingRecord = {
  id: string;
  userId: string;
  bookingReference: string;
  provider: string;
  tripType: "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";
  status: "UPCOMING" | "PAST" | "CANCELLED";
  origin: string | null;
  destination: string;
  departureDate: Date;
  returnDate: Date | null;
  passengerCount: number;
  currency: string;
  totalAmount: { toString(): string } | null;
  externalBookingId: string | null;
  rawPayload?: unknown;
};

type QueryArgs = {
  where?: {
    userId?: string;
    status?: TripBookingRecord["status"];
    bookingReference?: string;
  };
  orderBy?: {
    departureDate?: "asc" | "desc";
  };
};

afterEach(() => {
  __tripBookingServiceTest.setPrismaClientForTesting(null);
});

test("listUserTripBookings serializes trip bookings for public API responses", async () => {
  const prisma = createTripBookingPrisma([
    tripBooking({
      id: "flight-trip",
      tripType: "FLIGHT",
      status: "UPCOMING",
      departureDate: new Date("2026-08-01T10:15:30.000Z"),
      returnDate: new Date("2026-08-10T20:45:00.000Z"),
      totalAmount: decimal("123.45"),
      rawPayload: { providerSecret: "do-not-expose" },
    }),
    tripBooking({
      id: "hotel-trip",
      tripType: "HOTEL",
      status: "PAST",
      departureDate: new Date("2026-05-01T09:00:00.000Z"),
      returnDate: null,
      totalAmount: null,
    }),
    tripBooking({
      id: "car-trip",
      tripType: "CAR",
      status: "CANCELLED",
      departureDate: new Date("2026-04-01T09:00:00.000Z"),
    }),
    tripBooking({
      id: "package-trip",
      tripType: "PACKAGE",
      status: "UPCOMING",
      departureDate: new Date("2026-09-01T09:00:00.000Z"),
    }),
  ]);
  __tripBookingServiceTest.setPrismaClientForTesting(prisma.client);

  const result = await listUserTripBookings("user-1");

  const tripsById = new Map(result.trips.map((trip: PublicTripBooking) => [trip.id, trip]));

  assert.equal(tripsById.get("flight-trip")?.tripType, "flight");
  assert.equal(tripsById.get("hotel-trip")?.tripType, "hotel");
  assert.equal(tripsById.get("car-trip")?.tripType, "car");
  assert.equal(tripsById.get("package-trip")?.tripType, "package");
  assert.equal(tripsById.get("flight-trip")?.status, "upcoming");
  assert.equal(tripsById.get("hotel-trip")?.status, "past");
  assert.equal(tripsById.get("car-trip")?.status, "cancelled");
  assert.equal(tripsById.get("flight-trip")?.departureDate, "2026-08-01T10:15:30.000Z");
  assert.equal(tripsById.get("flight-trip")?.returnDate, "2026-08-10T20:45:00.000Z");
  assert.equal(tripsById.get("hotel-trip")?.returnDate, null);
  assert.equal(tripsById.get("flight-trip")?.totalAmount, 123.45);
  assert.equal(tripsById.get("hotel-trip")?.totalAmount, null);
  assert.equal("rawPayload" in result.trips[0], false);
});

test("listUserTripBookings scopes queries by user, filters status, orders trips, and scopes summary counts", async () => {
  const prisma = createTripBookingPrisma([
    tripBooking({
      id: "user-upcoming-late",
      userId: "user-1",
      status: "UPCOMING",
      departureDate: new Date("2026-09-15T00:00:00.000Z"),
    }),
    tripBooking({
      id: "user-upcoming-soon",
      userId: "user-1",
      status: "UPCOMING",
      departureDate: new Date("2026-08-15T00:00:00.000Z"),
    }),
    tripBooking({
      id: "user-past-newer",
      userId: "user-1",
      status: "PAST",
      departureDate: new Date("2026-05-15T00:00:00.000Z"),
    }),
    tripBooking({
      id: "user-past-older",
      userId: "user-1",
      status: "PAST",
      departureDate: new Date("2026-04-15T00:00:00.000Z"),
    }),
    tripBooking({
      id: "user-cancelled-newer",
      userId: "user-1",
      status: "CANCELLED",
      departureDate: new Date("2026-07-15T00:00:00.000Z"),
    }),
    tripBooking({
      id: "user-cancelled-older",
      userId: "user-1",
      status: "CANCELLED",
      departureDate: new Date("2026-06-15T00:00:00.000Z"),
    }),
    tripBooking({
      id: "other-user-trip",
      userId: "user-2",
      status: "UPCOMING",
      departureDate: new Date("2026-01-01T00:00:00.000Z"),
    }),
  ]);
  __tripBookingServiceTest.setPrismaClientForTesting(prisma.client);

  const upcoming = await listUserTripBookings("user-1", "upcoming");
  const past = await listUserTripBookings("user-1", "past");
  const cancelled = await listUserTripBookings("user-1", "cancelled");

  assert.deepEqual(
    upcoming.trips.map((trip: PublicTripBooking) => trip.id),
    ["user-upcoming-soon", "user-upcoming-late"],
  );
  assert.deepEqual(
    past.trips.map((trip: PublicTripBooking) => trip.id),
    ["user-past-newer", "user-past-older"],
  );
  assert.deepEqual(
    cancelled.trips.map((trip: PublicTripBooking) => trip.id),
    ["user-cancelled-newer", "user-cancelled-older"],
  );
  assert.deepEqual(upcoming.summary, {
    upcoming: 2,
    past: 2,
    cancelled: 2,
    total: 6,
  });
  assert.equal(upcoming.trips.some((trip: PublicTripBooking) => trip.id === "other-user-trip"), false);
  assert.deepEqual(prisma.findManyCalls[0].where, { userId: "user-1", status: "UPCOMING" });
  assert.deepEqual(prisma.findManyCalls[0].orderBy, { departureDate: "asc" });
  assert.deepEqual(prisma.findManyCalls[1].where, { userId: "user-1", status: "PAST" });
  assert.deepEqual(prisma.findManyCalls[1].orderBy, { departureDate: "desc" });
  assert.deepEqual(prisma.findManyCalls[2].where, { userId: "user-1", status: "CANCELLED" });
  assert.deepEqual(prisma.findManyCalls[2].orderBy, { departureDate: "desc" });
  assert.deepEqual(
    prisma.countCalls.slice(0, 3).map((call) => call.where),
    [
      { userId: "user-1", status: "UPCOMING" },
      { userId: "user-1", status: "PAST" },
      { userId: "user-1", status: "CANCELLED" },
    ],
  );
});

test("findUserTripBookingByReference reads by authenticated user and reference without mutating records", async () => {
  const prisma = createTripBookingPrisma([
    tripBooking({
      id: "owned-trip",
      userId: "user-1",
      bookingReference: "SAME123",
    }),
    tripBooking({
      id: "other-user-trip",
      userId: "user-2",
      bookingReference: "SAME123",
    }),
  ]);
  __tripBookingServiceTest.setPrismaClientForTesting(prisma.client);

  const found = await findUserTripBookingByReference("user-1", "SAME123");
  const missing = await findUserTripBookingByReference("user-1", "MISSING123");

  assert.equal(found?.id, "owned-trip");
  assert.equal(missing, null);
  assert.deepEqual(prisma.findFirstCalls, [
    { where: { userId: "user-1", bookingReference: "SAME123" }, select: prisma.expectedSelect },
    { where: { userId: "user-1", bookingReference: "MISSING123" }, select: prisma.expectedSelect },
  ]);
  assert.equal(prisma.mutationCalls, 0);
});

function createTripBookingPrisma(records: TripBookingRecord[]) {
  const findManyCalls: QueryArgs[] = [];
  const countCalls: QueryArgs[] = [];
  const findFirstCalls: QueryArgs[] = [];
  let mutationCalls = 0;

  const client = {
    tripBooking: {
      async findMany(args: QueryArgs) {
        findManyCalls.push(args);
        const results = records
          .filter((record) => matchesWhere(record, args.where))
          .sort((left, right) => {
            const direction = args.orderBy?.departureDate ?? "asc";
            const diff = left.departureDate.getTime() - right.departureDate.getTime();
            return direction === "asc" ? diff : -diff;
          });

        return results;
      },
      async count(args: QueryArgs) {
        countCalls.push(args);
        return records.filter((record) => matchesWhere(record, args.where)).length;
      },
      async findFirst(args: QueryArgs) {
        findFirstCalls.push(args);
        return records.find((record) => matchesWhere(record, args.where)) ?? null;
      },
      async create() {
        mutationCalls += 1;
      },
      async update() {
        mutationCalls += 1;
      },
      async upsert() {
        mutationCalls += 1;
      },
    },
    async $transaction<T extends readonly Promise<unknown>[]>(
      queries: T,
    ): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
      return Promise.all(queries) as Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;
    },
  };

  return {
    client,
    findManyCalls,
    countCalls,
    findFirstCalls,
    expectedSelect: {
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
    },
    get mutationCalls() {
      return mutationCalls;
    },
  };
}

function matchesWhere(record: TripBookingRecord, where: QueryArgs["where"] = {}) {
  return Object.entries(where).every(([key, value]) => record[key as keyof TripBookingRecord] === value);
}

function tripBooking(overrides: Partial<TripBookingRecord> = {}): TripBookingRecord {
  return {
    id: "trip-1",
    userId: "user-1",
    bookingReference: "BOOK123",
    provider: "kurioticket",
    tripType: "FLIGHT",
    status: "UPCOMING",
    origin: "JFK",
    destination: "LHR",
    departureDate: new Date("2026-08-01T00:00:00.000Z"),
    returnDate: new Date("2026-08-10T00:00:00.000Z"),
    passengerCount: 1,
    currency: "USD",
    totalAmount: decimal("499.99"),
    externalBookingId: "external-1",
    ...overrides,
  };
}

function decimal(value: string) {
  return {
    toString() {
      return value;
    },
  };
}
