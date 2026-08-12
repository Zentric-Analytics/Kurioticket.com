import assert from "node:assert/strict";
import test from "node:test";
import type { FlightSearchParams, NormalizedFlightResult } from "@/lib/types";
import type { DuffelItineraryInventoryGraph } from "./providers/duffelItineraryView";
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
const graph: DuffelItineraryInventoryGraph = {
  offerRequestId: "orq_same",
  slices: [
    {
      index: 0,
      origin: "LHR",
      destination: "JFK",
      itineraries: [
        {
          itineraryKey: "duffel-itinerary-v1:not-the-browser-key",
          segments: [
            {
              origin: "LHR",
              destination: "JFK",
              departure: "2027-01-01T10:00:00Z",
              arrival: "2027-01-01T18:00:00Z",
              marketingCarrier: {
                referenceId: "arl_1",
                name: "Air",
                iataCode: "ZZ",
              },
              operatingCarrier: {
                referenceId: "arl_1",
                name: "Air",
                iataCode: "ZZ",
              },
              flightNumber: "1",
            },
          ],
          brands: [
            {
              serverBrandIdentity: "brand_1",
              fareBrandName: "Basic",
              compatibleSingleTicketOffers: [
                {
                  providerOfferId: "off_secret_123",
                  owner: { referenceId: "arl_1", name: "Air", iataCode: "ZZ" },
                  amount: "100.00",
                  currency: "USD",
                },
              ],
              indicativeFrom: { amount: "100.00", currency: "USD" },
            },
          ],
        },
      ],
    },
  ],
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
  ).create(search, [offer(now + 3_600_000)], graph);
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
  assert.equal(row.schemaVersion, 2);
  assert.equal(loaded.offers[0].providerOfferId, "off_secret_123");
  assert.equal(loaded.itineraryGraph?.offerRequestId, "orq_same");
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

test("schema-v2 sessions enforce exact/graph membership, provider, slice, and route integrity", async () => {
  const now = 3_000_000;
  async function corrupted(change: (row: DealsFlightInventoryRow) => void) {
    const store = new FakeStore();
    const service = new DealsFlightInventorySessionService(store, () => now);
    const created = await service.create(search, [offer(now + 60_000)], graph);
    assert.ok(created);
    const row = [...store.rows.values()][0];
    change(row);
    await assert.rejects(
      () => service.load(created.inventoryToken, created.sourceSearchKey),
      (error) =>
        error instanceof DealsFlightInventoryError &&
        error.code === "malformed-inventory",
    );
  }
  await corrupted((row) => {
    const payload = row.inventoryPayload as {
      exactOffers: NormalizedFlightResult[];
    };
    payload.exactOffers[0].providerOfferId = "off_not_in_graph";
  });
  await corrupted((row) => {
    const payload = row.inventoryPayload as {
      itineraryGraph: DuffelItineraryInventoryGraph;
    };
    payload.itineraryGraph.slices[0].itineraries[0].brands[0].compatibleSingleTicketOffers.push(
      {
        providerOfferId: "off_extra",
        owner: { referenceId: "arl_1", name: "Air" },
        amount: "200.00",
        currency: "USD",
      },
    );
  });
  await corrupted((row) => {
    const payload = row.inventoryPayload as {
      exactOffers: NormalizedFlightResult[];
    };
    payload.exactOffers[0].provider = "Other";
  });
  await corrupted((row) => {
    const payload = row.inventoryPayload as {
      itineraryGraph: DuffelItineraryInventoryGraph;
    };
    payload.itineraryGraph.slices.push(
      structuredClone(payload.itineraryGraph.slices[0]),
    );
  });
  await corrupted((row) => {
    const payload = row.inventoryPayload as {
      itineraryGraph: DuffelItineraryInventoryGraph;
    };
    payload.itineraryGraph.slices[0].origin = "SFO";
  });
});
