import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { createFlightStatusUpdateHandler } from "./route";

const secret = "this-is-a-test-only-flight-status-webhook-secret";
const now = Date.parse("2026-10-22T16:00:00.000Z");

test("flight status updates require a configured and valid provider signature", async () => {
  let recorded = false;
  const POST = createFlightStatusUpdateHandler({ secret: () => secret, now: () => now, record: async () => { recorded = true; return { applied: true }; } });
  const response = await POST(new Request("https://kurioticket.test/api/internal/flight-status/updates", {
    method: "POST",
    headers: { "x-kt-flight-status-timestamp": String(Math.floor(now / 1_000)), "x-kt-flight-status-signature": `sha256=${"0".repeat(64)}` },
    body: "not-json",
  }));
  assert.equal(response.status, 401);
  assert.equal(recorded, false);
});

test("a signed update acknowledges only whether the status was applied", async () => {
  let received: unknown;
  const POST = createFlightStatusUpdateHandler({ secret: () => secret, now: () => now, record: async input => { received = input; return { applied: true }; } });
  const rawBody = JSON.stringify(payload());
  const response = await POST(request(rawBody));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accepted: true, applied: true });
  assert.deepEqual(received, {
    providerName: "Example Provider", partnerConversionId: "conversion-123", observedAt: new Date("2026-10-22T15:59:00.000Z"),
    status: "DELAYED", flightNumber: "123", carrierCode: "AA", originAirport: "LOS", destinationAirport: "LHR",
    scheduledDepartureAt: new Date("2026-11-01T09:00:00.000Z"), scheduledArrivalAt: null, estimatedDepartureAt: null,
    actualDepartureAt: null, estimatedArrivalAt: null, actualArrivalAt: null,
  });
});

function request(rawBody: string) {
  const timestamp = String(Math.floor(now / 1_000));
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return new Request("https://kurioticket.test/api/internal/flight-status/updates", {
    method: "POST",
    headers: {
      "x-kt-flight-status-timestamp": timestamp,
      "x-kt-flight-status-signature": `sha256=${signature}`,
    },
    body: rawBody,
  });
}

function payload() {
  return {
    providerName: "Example Provider", partnerConversionId: "conversion-123", occurredAt: "2026-10-22T15:59:00.000Z",
    status: "delayed", flightNumber: "123", carrierCode: "AA", originAirport: "LOS", destinationAirport: "LHR",
    scheduledDepartureAt: "2026-11-01T09:00:00.000Z", scheduledArrivalAt: null, estimatedDepartureAt: null,
    actualDepartureAt: null, estimatedArrivalAt: null, actualArrivalAt: null,
  };
}
