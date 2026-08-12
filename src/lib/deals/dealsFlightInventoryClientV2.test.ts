import assert from "node:assert/strict";
import test from "node:test";
import {
  createFlightInventory,
  DealsFlightInventoryClientError,
  getFlightFareBrandOptions,
  getFlightFareChoices,
  getFlightReturnChoices,
  revalidateFlightOfferV2,
} from "./dealsFlightInventoryClientV2";
import { inbound, offer, outbound } from "./dealsTripPlanV2.test";

const originalFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
});
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("posts create inventory body with no-store and forwards AbortSignal", async () => {
  const controller = new AbortController();
  let init: RequestInit | undefined;
  globalThis.fetch = async (_input, value) => {
    init = value;
    return response({
      status: "success",
      inventoryToken: "token_12345678901234567890123456789012",
      sourceSearchKey: "key",
      inventoryExpiresAt: "2027-01-01T00:00:00Z",
      outboundChoices: [outbound],
    });
  };
  const request = {
    tripType: "one-way" as const,
    origin: "LOS",
    destination: "JFK",
    departureDate: "2027-01-01",
    travelers: 1,
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "economy" as const,
    currency: "USD",
  };
  await createFlightInventory(request, controller.signal);
  assert.deepEqual(JSON.parse(String(init?.body)), request);
  assert.equal(init?.method, "POST");
  assert.equal(init?.cache, "no-store");
  assert.equal(init?.signal, controller.signal);
});

test("posts exact return and fare selection bodies", async () => {
  const bodies: unknown[] = [];
  globalThis.fetch = async (input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return String(input).endsWith("/returns")
      ? response({ status: "success", returnChoices: [inbound] })
      : response({
          status: "success",
          fares: [
            {
              fareKey: "flight-fare-v3:safe",
              cabinClass: "economy",
              sourcePrice: 100,
              sourceCurrency: "USD",
            },
          ],
        });
  };
  const base = {
    inventoryToken: "token_12345678901234567890123456789012",
    sourceSearchKey: "key",
    outboundItineraryKey: "out",
  };
  await getFlightReturnChoices(base);
  await getFlightFareChoices({ ...base, returnItineraryKey: "ret" });
  assert.deepEqual(bodies, [base, { ...base, returnItineraryKey: "ret" }]);
});

test("accepts a customer-safe fare Brand without a projected cabin", async () => {
  const option = {
    brandOptionKey: "flight-brand-v1:without-cabin",
    fareBrandName: "Example Brand",
    ownerNames: ["Example Air"],
  };
  globalThis.fetch = async () =>
    response({ status: "success", fareBrandOptions: [option] });
  assert.deepEqual(
    await getFlightFareBrandOptions({
      inventoryToken: "token_12345678901234567890123456789012",
      sourceSearchKey: "key",
      outboundItineraryKey: "out",
    }),
    [option],
  );
});

test("normalizes API errors and malformed JSON", async () => {
  globalThis.fetch = async () =>
    response({ status: "error", code: "RATE_LIMITED" }, 429);
  await assert.rejects(
    () =>
      getFlightReturnChoices({
        inventoryToken: "x",
        sourceSearchKey: "x",
        outboundItineraryKey: "x",
      }),
    (error: unknown) =>
      error instanceof DealsFlightInventoryClientError &&
      error.code === "RATE_LIMITED" &&
      error.retryable,
  );
  globalThis.fetch = async () => new Response("not json");
  await assert.rejects(
    () =>
      getFlightReturnChoices({
        inventoryToken: "x",
        sourceSearchKey: "x",
        outboundItineraryKey: "x",
      }),
    (error: unknown) =>
      error instanceof DealsFlightInventoryClientError &&
      error.code === "MALFORMED_RESPONSE",
  );
});

test("revalidation posts exact one-way and round-trip bodies with fetch controls", async () => {
  const calls: Array<{ body: unknown; init: RequestInit }> = [];
  globalThis.fetch = async (_input, init = {}) => {
    calls.push({ body: JSON.parse(String(init.body)), init });
    return response({ status: "expired" });
  };
  const controller = new AbortController();
  const base = {
    inventoryToken: "token_12345678901234567890123456789012",
    sourceSearchKey: "search",
    outboundItineraryKey: "out-1",
    fareKey: "fare-1",
  };
  await revalidateFlightOfferV2(base, controller.signal);
  await revalidateFlightOfferV2({ ...base, returnItineraryKey: "ret-1" });
  assert.deepEqual(
    calls.map((call) => call.body),
    [base, { ...base, returnItineraryKey: "ret-1" }],
  );
  assert.equal(calls[0]?.init.method, "POST");
  assert.equal(calls[0]?.init.cache, "no-store");
  assert.equal(calls[0]?.init.signal, controller.signal);
});

test("revalidation parses every semantic status including invalid-selection 422", async () => {
  const statuses = ["expired", "unavailable", "temporary-failure"] as const;
  for (const status of statuses) {
    globalThis.fetch = async () => response({ status });
    assert.deepEqual(
      await revalidateFlightOfferV2({
        inventoryToken: "token",
        sourceSearchKey: "search",
        outboundItineraryKey: "out-1",
        fareKey: "fare-1",
      }),
      { status },
    );
  }
  globalThis.fetch = async () => response({ status: "invalid-selection" }, 422);
  assert.deepEqual(
    await revalidateFlightOfferV2({
      inventoryToken: "token",
      sourceSearchKey: "search",
      outboundItineraryKey: "out-1",
      fareKey: "fare-1",
    }),
    { status: "invalid-selection" },
  );
});

test("confirmed and changed offers are canonicalized and provider secrets are stripped", async () => {
  for (const status of ["confirmed", "changed"] as const) {
    globalThis.fetch = async () =>
      response({
        status,
        offer: {
          ...offer,
          providerOfferId: "off_secret_123",
          rawProviderReference: "duffel-off_secret_123",
          normalizedResultId: "provider-derived-id",
        },
      });
    const result = await revalidateFlightOfferV2({
      inventoryToken: "token",
      sourceSearchKey: "search",
      outboundItineraryKey: "out-1",
      returnItineraryKey: "ret-1",
      fareKey: "fare-1",
    });
    assert.equal(result.status, status);
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(
      serialized,
      /providerOfferId|rawProviderReference|normalizedResultId|off_secret_123|duffel-off_secret_123/,
    );
  }
});

test("revalidation keeps inventory errors distinct and rejects malformed offers", async () => {
  globalThis.fetch = async () =>
    response({ status: "error", code: "STALE_SEARCH" }, 409);
  await assert.rejects(
    () =>
      revalidateFlightOfferV2({
        inventoryToken: "x",
        sourceSearchKey: "x",
        outboundItineraryKey: "x",
        fareKey: "x",
      }),
    (error: unknown) =>
      error instanceof DealsFlightInventoryClientError &&
      error.code === "STALE_SEARCH",
  );
  globalThis.fetch = async () =>
    response({ status: "confirmed", offer: { provider: "Duffel" } });
  await assert.rejects(
    () =>
      revalidateFlightOfferV2({
        inventoryToken: "x",
        sourceSearchKey: "x",
        outboundItineraryKey: "x",
        fareKey: "x",
      }),
    (error: unknown) =>
      error instanceof DealsFlightInventoryClientError &&
      error.code === "MALFORMED_RESPONSE",
  );
  globalThis.fetch = async () => new Response("not json");
  await assert.rejects(
    () =>
      revalidateFlightOfferV2({
        inventoryToken: "x",
        sourceSearchKey: "x",
        outboundItineraryKey: "x",
        fareKey: "x",
      }),
    (error: unknown) =>
      error instanceof DealsFlightInventoryClientError &&
      error.code === "MALFORMED_RESPONSE",
  );
});
