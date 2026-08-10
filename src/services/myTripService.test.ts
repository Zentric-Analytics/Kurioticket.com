import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  __myTripServiceTest,
  listUserMyTrips,
  MyTripIngestionOwnershipError,
  upsertPartnerConfirmedMyTrip,
} from "./myTripService";

type TripRecord = ReturnType<typeof record>;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  __myTripServiceTest.setPrismaClientForTesting(null);
  process.env.NODE_ENV = originalNodeEnv;
});

test("listing is user-scoped, status-filtered, and serializes only safe provider actions", async () => {
  const db = memoryClient([
    record({ id: "a-safe", userId: "user-a", status: "UPCOMING", providerManageUrl: "https://provider-a.test/manage" }),
    record({ id: "a-legacy", userId: "user-a", status: "PAST", providerManageUrl: null }),
    record({ id: "b-private", userId: "user-b", status: "UPCOMING", providerManageUrl: "https://provider-b.test/manage" }),
  ]);
  __myTripServiceTest.setPrismaClientForTesting(db.client);

  const upcoming = await listUserMyTrips("user-a", "upcoming");
  const past = await listUserMyTrips("user-a", "past");
  assert.deepEqual(upcoming.trips.map((trip) => trip.id), ["a-safe"]);
  assert.equal(upcoming.trips[0].providerAction?.external, true);
  assert.equal(upcoming.trips[0].providerAction?.url, "https://provider-a.test/manage");
  assert.deepEqual(past.trips.map((trip) => trip.id), ["a-legacy"]);
  assert.equal(past.trips[0].providerAction, null);
  assert.equal([...upcoming.trips, ...past.trips].some((trip) => trip.id === "b-private"), false);
});

test("trusted ingestion creates and retries idempotently for the same provider, conversion, and user", async () => {
  const db = memoryClient([]); __myTripServiceTest.setPrismaClientForTesting(db.client);
  const input = confirmation({ userId: "user-a", providerName: "Provider A", partnerConversionId: "conversion-x" });
  const first = await upsertPartnerConfirmedMyTrip(input);
  const retry = await upsertPartnerConfirmedMyTrip({ ...input, destination: "SFO" });
  assert.equal(first.id, retry.id);
  assert.equal(db.records.length, 1);
  assert.equal(retry.destination, "SFO");
});

test("the same conversion identifier is independent across providers", async () => {
  const db = memoryClient([]); __myTripServiceTest.setPrismaClientForTesting(db.client);
  await upsertPartnerConfirmedMyTrip(confirmation({ providerName: "Provider A", partnerConversionId: "shared" }));
  await upsertPartnerConfirmedMyTrip(confirmation({ providerName: "Provider B", partnerConversionId: "shared", providerConfirmationCode: "B123" }));
  assert.equal(db.records.length, 2);
});

test("trusted ingestion fails closed on a cross-user provider conversion mismatch", async () => {
  const db = memoryClient([]); __myTripServiceTest.setPrismaClientForTesting(db.client);
  await upsertPartnerConfirmedMyTrip(confirmation({ userId: "user-a" }));
  await assert.rejects(upsertPartnerConfirmedMyTrip(confirmation({ userId: "user-b" })), MyTripIngestionOwnershipError);
  assert.equal(db.records[0].userId, "user-a");
});

test("trusted ingestion rejects unsafe external destinations", async () => {
  const db = memoryClient([]); __myTripServiceTest.setPrismaClientForTesting(db.client);
  process.env.NODE_ENV = "production";
  for (const providerManageUrl of ["/dashboard/trips", "javascript:alert(1)", "data:text/html,no", "http://provider.test/manage", "https://kurioticket.com/dashboard/trips", "not a url"]) {
    await assert.rejects(upsertPartnerConfirmedMyTrip(confirmation({ providerManageUrl, partnerConversionId: providerManageUrl })));
  }
  assert.equal(db.records.length, 0);
});

test("there is no public MyTrip creation route", () => {
  const dashboardRoute = readFileSync("src/app/api/dashboard/trips/route.ts", "utf8");
  const mobileRoute = readFileSync("src/app/api/mobile/v1/trips/route.ts", "utf8");
  assert.doesNotMatch(dashboardRoute, /export async function (POST|PATCH|DELETE)/);
  assert.doesNotMatch(mobileRoute, /export async function (POST|PATCH|DELETE)/);
});

function confirmation(overrides: Record<string, unknown> = {}) {
  return { userId: "user-a", partnerConversionId: "conversion-x", providerName: "Provider A", providerConfirmationCode: "ABC123", providerManageUrl: "https://provider-a.test/manage", tripType: "FLIGHT" as const, status: "UPCOMING" as const, origin: "LAX", destination: "JFK", departureDate: new Date("2026-09-01T00:00:00Z"), returnDate: null, travelerCount: 1, currency: "USD", totalAmount: 250, ...overrides };
}

function record(overrides: Record<string, unknown> = {}) {
  return { id: "trip-1", userId: "user-a", tripType: "FLIGHT" as const, status: "UPCOMING" as const, providerName: "Provider A", providerConfirmationCode: "ABC123", partnerConversionId: null as string | null, origin: "LAX", destination: "JFK", departureDate: new Date("2026-09-01T00:00:00Z"), returnDate: null, travelerCount: 1, currency: "USD", totalAmount: 250, providerManageUrl: null as string | null, ...overrides };
}

function memoryClient(seed: TripRecord[]) {
  /* eslint-disable @typescript-eslint/no-explicit-any -- deliberately small Prisma test double */
  const records = [...seed];
  const matches = (item: TripRecord, where: any = {}) => Object.entries(where).every(([key, value]) => key === "providerName_partnerConversionId" ? item.providerName === (value as any).providerName && item.partnerConversionId === (value as any).partnerConversionId : item[key as keyof TripRecord] === value);
  const client = {
    myTrip: {
      async findMany({ where, orderBy }: any) { return records.filter((item) => matches(item, where)).sort((a, b) => (a.departureDate.getTime() - b.departureDate.getTime()) * (orderBy.departureDate === "desc" ? -1 : 1)); },
      async count({ where }: any) { return records.filter((item) => matches(item, where)).length; },
      async findUnique({ where }: any) { return records.find((item) => matches(item, where)) ?? null; },
      async upsert({ where, create, update }: any) {
        const existing = records.find((item) => matches(item, where));
        if (existing) { Object.assign(existing, update); return existing; }
        const created = record({ ...create, id: `trip-${records.length + 1}` }); records.push(created); return created;
      },
    },
    async $transaction(queries: Promise<unknown>[]) { return Promise.all(queries); },
  };
  return { client: client as any, records };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
