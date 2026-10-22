import assert from "node:assert/strict";
import { Prisma } from "@/generated/prisma/client";
import test from "node:test";

import {
  PartnerFlightStatusPayloadError,
  createFlightStatusService,
  parsePartnerFlightStatus,
} from "./flightStatusService";

const now = new Date("2026-10-22T16:00:00.000Z");

test("partner flight statuses parse into a safe primary-flight snapshot", () => {
  const parsed = parsePartnerFlightStatus(payload());
  assert.deepEqual(parsed, {
    providerName: "Example Provider",
    partnerConversionId: "conversion-123",
    observedAt: new Date("2026-10-22T15:59:00.000Z"),
    status: "DELAYED",
    flightNumber: "123",
    carrierCode: "AA",
    originAirport: "LOS",
    destinationAirport: "LHR",
    scheduledDepartureAt: new Date("2026-11-01T09:00:00.000Z"),
    scheduledArrivalAt: new Date("2026-11-01T15:00:00.000Z"),
    estimatedDepartureAt: new Date("2026-11-01T09:45:00.000Z"),
    actualDepartureAt: null,
    estimatedArrivalAt: new Date("2026-11-01T15:45:00.000Z"),
    actualArrivalAt: null,
  });
});

test("flight status parsing rejects impossible times and unsafe identifiers", () => {
  for (const invalid of [
    { ...payload(), occurredAt: "2026-02-30T09:00:00.000Z" },
    { ...payload(), scheduledDepartureAt: "2026-11-01T24:00:00.000Z" },
    { ...payload(), originAirport: "LHR", destinationAirport: "lhr" },
    { ...payload(), carrierCode: "A!" },
    { ...payload(), actualDepartureAt: "2026-11-01T12:00:00.000Z", actualArrivalAt: "2026-11-01T11:00:00.000Z" },
  ]) {
    assert.throws(() => parsePartnerFlightStatus(invalid), PartnerFlightStatusPayloadError);
  }
});

test("newer provider status events replace a snapshot while stale events cannot", async () => {
  const database = memoryDatabase();
  const service = createFlightStatusService(() => database.client, () => now);
  const first = parsePartnerFlightStatus(payload());
  assert.deepEqual(await service.recordPartnerFlightStatus(first), { applied: true });
  assert.equal(database.snapshot?.status, "DELAYED");

  const arrived = { ...first, status: "ARRIVED" as const, observedAt: new Date("2026-10-22T16:00:00.000Z"), actualArrivalAt: new Date("2026-11-01T15:38:00.000Z") };
  assert.deepEqual(await service.recordPartnerFlightStatus(arrived), { applied: true });
  assert.equal(database.snapshot?.status, "ARRIVED");

  const stale = { ...first, status: "SCHEDULED" as const, observedAt: new Date("2026-10-22T15:58:00.000Z") };
  assert.deepEqual(await service.recordPartnerFlightStatus(stale), { applied: false });
  assert.equal(database.snapshot?.status, "ARRIVED");
});

test("flight status reads are trip-owner scoped and expose no status until an approved feed updates it", async () => {
  const database = memoryDatabase();
  const service = createFlightStatusService(() => database.client, () => now);
  assert.deepEqual(await service.getUserFlightStatus("user-a", "trip-1"), { dataAvailable: false, providerName: "Example Provider" });
  await service.recordPartnerFlightStatus(parsePartnerFlightStatus(payload()));
  const owner = await service.getUserFlightStatus("user-a", "trip-1");
  assert.equal(owner?.dataAvailable, true);
  if (owner?.dataAvailable) {
    assert.equal(owner.status, "delayed");
    assert.equal(owner.freshness, "current");
    assert.deepEqual(owner.flight, {
      flightNumber: "123", carrierCode: "AA", originAirport: "LOS", destinationAirport: "LHR",
      scheduledDepartureAt: "2026-11-01T09:00:00.000Z", scheduledArrivalAt: "2026-11-01T15:00:00.000Z",
    });
  }
  assert.equal(await service.getUserFlightStatus("user-b", "trip-1"), null);
});


test("future status events cannot poison ordering or appear current", async () => {
  const database = memoryDatabase();
  const service = createFlightStatusService(() => database.client, () => now);
  const future = {
    ...parsePartnerFlightStatus(payload(), now),
    observedAt: new Date("2026-10-22T16:06:00.000Z"),
  };
  assert.deepEqual(await service.recordPartnerFlightStatus(future), { applied: false });
  assert.equal(database.snapshot, null);

  await service.recordPartnerFlightStatus(parsePartnerFlightStatus(payload(), now));
  if (database.snapshot) database.snapshot.observedAt = new Date("2026-10-22T16:01:00.000Z");
  const owner = await service.getUserFlightStatus("user-a", "trip-1");
  assert.equal(owner?.dataAvailable, true);
  if (owner?.dataAvailable) assert.equal(owner.freshness, "stale");
});

function payload() {
  return {
    providerName: "Example Provider",
    partnerConversionId: "conversion-123",
    occurredAt: "2026-10-22T15:59:00.000Z",
    status: "delayed",
    flightNumber: "123",
    carrierCode: "aa",
    originAirport: "los",
    destinationAirport: "lhr",
    scheduledDepartureAt: "2026-11-01T09:00:00.000Z",
    scheduledArrivalAt: "2026-11-01T15:00:00.000Z",
    estimatedDepartureAt: "2026-11-01T09:45:00.000Z",
    actualDepartureAt: null,
    estimatedArrivalAt: "2026-11-01T15:45:00.000Z",
    actualArrivalAt: null,
  };
}

function memoryDatabase() {
  /* eslint-disable @typescript-eslint/no-explicit-any -- deliberately small Prisma test double */
  let snapshot: any = null;
  const trip = { id: "trip-1", userId: "user-a", tripType: "FLIGHT", providerName: "Example Provider", partnerConversionId: "conversion-123" };
  const client = {
    myTrip: {
      async findUnique({ where }: any) {
        const identity = where.providerName_partnerConversionId;
        return identity?.providerName === trip.providerName && identity?.partnerConversionId === trip.partnerConversionId
          ? { id: trip.id, tripType: trip.tripType }
          : null;
      },
      async findFirst({ where }: any) {
        if (where.id !== trip.id || where.userId !== trip.userId || where.tripType !== "FLIGHT") return null;
        return { id: trip.id, providerName: trip.providerName, flightStatusSnapshot: snapshot };
      },
    },
    flightStatusSnapshot: {
      async create({ data }: any) {
        if (snapshot) throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test", meta: { target: ["myTripId"] } });
        snapshot = { ...data }; return snapshot;
      },
      async findUnique({ where }: any) { return where.myTripId === trip.id ? snapshot : null; },
      async updateMany({ where, data }: any) {
        if (!snapshot || where.myTripId !== trip.id || !(snapshot.observedAt < where.observedAt.lt)) return { count: 0 };
        snapshot = { ...snapshot, ...data }; return { count: 1 };
      },
    },
  };
  return { client: client as any, get snapshot() { return snapshot; } };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
