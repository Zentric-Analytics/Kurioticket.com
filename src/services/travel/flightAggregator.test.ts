import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderResult } from "@/lib/types";
import { FLIGHT_SEARCH_DEADLINE_MS, runWithFlightSearchDeadline } from "./flightAggregator";
import { DUFFEL_SEARCH_HTTP_TIMEOUT_MS, DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS } from "./providers/duffelProvider";

const MOBILE_FLIGHT_TRANSPORT_TIMEOUT_MS = 14_000;
const MOBILE_FLIGHT_UI_DEADLINE_MS = 16_000;

test("flight timeout hierarchy leaves response margin for mobile", () => {
  assert.ok(DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS < DUFFEL_SEARCH_HTTP_TIMEOUT_MS);
  assert.ok(DUFFEL_SEARCH_HTTP_TIMEOUT_MS < FLIGHT_SEARCH_DEADLINE_MS);
  assert.ok(FLIGHT_SEARCH_DEADLINE_MS < MOBILE_FLIGHT_TRANSPORT_TIMEOUT_MS);
  assert.ok(MOBILE_FLIGHT_TRANSPORT_TIMEOUT_MS < MOBILE_FLIGHT_UI_DEADLINE_MS);
  assert.deepEqual(
    [
      DUFFEL_SEARCH_SUPPLIER_TIMEOUT_MS,
      DUFFEL_SEARCH_HTTP_TIMEOUT_MS,
      FLIGHT_SEARCH_DEADLINE_MS,
      MOBILE_FLIGHT_TRANSPORT_TIMEOUT_MS,
      MOBILE_FLIGHT_UI_DEADLINE_MS,
    ],
    [10_000, 11_000, 12_000, 14_000, 16_000],
  );
});

test("aggregate deadline bounds even a provider promise that never settles", async () => {
  let aborted = false;
  const result = await runWithFlightSearchDeadline(
    (signal) => {
      signal.addEventListener("abort", () => { aborted = true; });
      return new Promise<ProviderResult<never>>(() => undefined);
    },
    { deadlineMs: 10 },
  );
  assert.equal(aborted, true);
  assert.equal(result.status, "failed");
  assert.equal(result.errorReason, "provider_timeout");
  assert.ok(result.latencyMs < 200);
});

test("provider success wins without changing its results", async () => {
  const provider = { provider: "Other", results: [{ id: "offer" }], status: "success" as const, latencyMs: 1 };
  assert.deepEqual(await runWithFlightSearchDeadline(async () => provider, { deadlineMs: 50 }), provider);
});
