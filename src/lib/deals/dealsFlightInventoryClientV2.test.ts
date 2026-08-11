import assert from "node:assert/strict";
import test from "node:test";
import {
  createFlightInventory,
  DealsFlightInventoryClientError,
  getFlightFareChoices,
  getFlightReturnChoices,
} from "./dealsFlightInventoryClientV2";
import { inbound, outbound } from "./dealsTripPlanV2.test";

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
