import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { buildFlightDetailParams } from "./flightDetailNavigation";

const result = { id: "opaque-kurioticket-result", bookingUrl: "https://provider.invalid/private", partnerRedirectUrl: "https://provider.invalid/redirect" } as FlightResult;

test("Flight Results hands Details only the opaque authoritative identity", () => {
  const params = buildFlightDetailParams({ searchParams: { departureDate: "2026-09-01", travelers: "1", result: JSON.stringify({ id: "stale" }), displayFare: "stale" }, result });
  assert.deepEqual(params, { departureDate: "2026-09-01", travelers: "1", id: "opaque-kurioticket-result" });
  assert.equal(JSON.stringify(params).includes("provider.invalid"), false);
});

test("multi-city handoff retains every structured edit-search leg without an offer snapshot", () => {
  const params = buildFlightDetailParams({ searchParams: { tripType: "multi-city", legCount: "3", origin1: "LOS", destination1: "LHR", departureDate1: "2026-10-01", origin2: "LHR", destination2: "JFK", departureDate2: "2026-10-03", origin3: "JFK", destination3: "LAX", departureDate3: "2026-10-05" }, result });
  assert.equal(params.legCount, "3"); assert.equal(params.destination3, "LAX"); assert.equal(params.departureDate3, "2026-10-05"); assert.equal("result" in params, false);
});
