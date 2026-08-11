import assert from "node:assert/strict";
import test from "node:test";
import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import {
  DealsFlightInventoryError,
  DealsFlightInventorySessionService,
  hashInventoryToken,
} from "./dealsFlightInventorySession";
import type {
  DealsFlightInventoryRow,
  DealsFlightInventoryStore,
} from "./dealsFlightInventorySessionStore";

class FakeStore implements DealsFlightInventoryStore {
  rows = new Map<string, DealsFlightInventoryRow>();
  async create(row: DealsFlightInventoryRow) {
    this.rows.set(row.tokenHash, structuredClone(row));
  }
  async find(hash: string) {
    return this.rows.get(hash) ?? null;
  }
  async delete(hash: string) {
    this.rows.delete(hash);
  }
  async deleteExpired(before: Date, limit: number) {
    const expired = [...this.rows]
      .filter(([, r]) => r.expiresAt <= before)
      .slice(0, limit);
    expired.forEach(([k]) => this.rows.delete(k));
    return expired.length;
  }
}
const search: FlightSearchParams = {
  tripType: "one-way",
  origin: "LHR",
  destination: "JFK",
  departureDate: "2027-01-01",
  adults: 1,
  children: 0,
  infants: 0,
  travelers: 1,
  cabinClass: "economy",
};
const offer = (expiry: number): NormalizedFlightResult => ({
  id: "duffel-off_secret_123",
  provider: "Duffel",
  providerOfferId: "off_secret_123",
  providerExpiresAt: expiry,
  rawProviderReference: { secret: true },
  airlineName: "Air",
  originAirport: "LHR",
  destinationAirport: "JFK",
  departureTime: "2027-01-01T10:00:00Z",
  arrivalTime: "2027-01-01T18:00:00Z",
  duration: "8h",
  durationMinutes: 480,
  stops: 0,
  layovers: [],
  legs: [
    {
      direction: "outbound",
      originAirport: "LHR",
      destinationAirport: "JFK",
      departureTime: "2027-01-01T10:00:00Z",
      arrivalTime: "2027-01-01T18:00:00Z",
      duration: "8h",
      durationMinutes: 480,
      stops: 0,
      layovers: [],
      segments: [],
    },
  ],
  cabinClass: "economy",
  baggageInfo: "bag",
  refundInfo: "rules",
  price: 100,
  currency: "USD",
  bookingUrl: "",
  partnerRedirectUrl: "",
  valueScore: 1,
  riskScore: 1,
  comfortScore: 1,
  travelConfidenceScore: 1,
  travelEffortScore: 1,
  recommendationReasons: [],
  badges: [],
});

test("persists only a high-entropy token hash and canonical inventory across service instances", async () => {
  const store = new FakeStore(),
    now = 1_000_000;
  const created = await new DealsFlightInventorySessionService(
    store,
    () => now,
  ).create(search, [offer(now + 3_600_000)]);
  assert.ok(created);
  assert.ok(created.inventoryToken.length >= 43);
  const [row] = [...store.rows.values()];
  assert.equal(row.tokenHash, hashInventoryToken(created.inventoryToken));
  assert.equal(JSON.stringify(row).includes(created.inventoryToken), false);
  assert.equal(
    JSON.stringify(row.inventoryPayload).includes("rawProviderReference"),
    false,
  );
  assert.equal(row.expiresAt.getTime(), now + 30 * 60_000);
  const loaded = await new DealsFlightInventorySessionService(
    store,
    () => now,
  ).load(created.inventoryToken, created.sourceSearchKey);
  assert.equal(loaded.offers[0].providerOfferId, "off_secret_123");
  await assert.rejects(
    () =>
      new DealsFlightInventorySessionService(store, () => now).load(
        created.inventoryToken,
        "forged",
      ),
    (e) => e instanceof DealsFlightInventoryError && e.code === "stale-search",
  );
});

test("malformed, unknown, and expired sessions fail closed and expired rows are deleted", async () => {
  const store = new FakeStore(),
    now = 2_000_000,
    service = new DealsFlightInventorySessionService(store, () => now);
  await assert.rejects(
    () => service.load("x".repeat(43), "key"),
    (e) =>
      e instanceof DealsFlightInventoryError && e.code === "unknown-inventory",
  );
  store.rows.set(hashInventoryToken("expired"), {
    tokenHash: hashInventoryToken("expired"),
    schemaVersion: 1,
    sourceSearchKey: "key",
    searchPayload: search,
    inventoryPayload: [],
    createdAt: new Date(0),
    expiresAt: new Date(now),
  });
  await assert.rejects(
    () => service.load("expired", "key"),
    (e) =>
      e instanceof DealsFlightInventoryError && e.code === "inventory-expired",
  );
  assert.equal(store.rows.size, 0);
});
