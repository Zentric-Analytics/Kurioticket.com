import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { rememberHotels } from "@/lib/searchCache";
import { buildStaticHotelResults } from "@/services/travel/staticHotelResults";
import { POST, previewAllowsKayakSandboxHandoff } from "./route";
import type { NormalizedFlightResult, NormalizedHotelResult } from "@/lib/types";

const originalUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalUrl;
});

test("staging blocks provider checkout before resolving a live target", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  const response = await POST(new Request("https://staging.kurioticket.com/api/redirect", { method: "POST" }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Provider checkout is disabled in Preview." });
});

test("staging blocks encoded and nested redirect attempts", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  const response = await POST(new Request("https://staging.kurioticket.com/api/redirect", {
    method: "POST",
    body: JSON.stringify({ id: encodeURIComponent("https://provider.invalid/book"), type: "flight", redirect: { url: "https://provider.invalid/book" } }),
    headers: { "Content-Type": "application/json" },
  }));
  assert.equal(response.status, 403);
});

test("a spoofed Host header cannot enable the staging-only branch in Production", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  const response = await POST(new Request("https://kurioticket.com/api/redirect", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json", host: "staging.kurioticket.com" },
  }));
  assert.equal(response.status, 400);
});

test("Production retains the existing redirect request validation", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  const response = await POST(new Request("https://kurioticket.com/api/redirect", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json" },
  }));
  assert.equal(response.status, 400);
});

test("Preview permits only a server-owned KAYAK sandbox offer at the final flight action", () => {
  const flight = { id:"kayak-sandbox:final", provider:"KAYAK sandbox", providerOfferId:"final", airlineName:"Test Airline", originAirport:"BOS", destinationAirport:"JFK", departureTime:"2027-02-10T10:00:00Z", arrivalTime:"2027-02-10T11:00:00Z", duration:"1h", durationMinutes:60, stops:0, layovers:[], legs:[], cabinClass:"Economy", baggageInfo:"Not supplied", refundInfo:"Not supplied", price:100, currency:"USD", bookingUrl:"", partnerRedirectUrl:"https://affiliates.kayak.com/sandbox-clickout", valueScore:0,riskScore:0,comfortScore:0,travelConfidenceScore:0,travelEffortScore:0,recommendationReasons:[],badges:[] } satisfies NormalizedFlightResult;
  assert.equal(previewAllowsKayakSandboxHandoff({id:flight.id,type:"flight"},flight),true);
  assert.equal(previewAllowsKayakSandboxHandoff({id:flight.id,type:"flight"},{...flight,provider:"Duffel"}),false);
  assert.equal(previewAllowsKayakSandboxHandoff({id:"hotel",type:"hotel"}),false);
});

test("Preview permits a server-owned KAYAK sandbox hotel only at the final action", () => {
  const hotel = { id: "kayak-sandbox:hotel", provider: "KAYAK sandbox" } satisfies Pick<NormalizedHotelResult, "id" | "provider">;
  assert.equal(previewAllowsKayakSandboxHandoff({ id: hotel.id, type: "hotel" }, hotel as NormalizedHotelResult), true);
  assert.equal(previewAllowsKayakSandboxHandoff({ id: hotel.id, type: "hotel" }, { ...hotel, provider: "Other provider" } as NormalizedHotelResult), false);
});

test("historical cached catalogue offers cannot redirect to checkout", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  const hotel = buildStaticHotelResults({ destination: "London, United Kingdom", checkIn: "2027-06-01", checkOut: "2027-06-04", guests: 2, rooms: 1 })[0];
  assert.ok(hotel);
  rememberHotels([{ ...hotel, dataSource: "live" }]);
  const response = await POST(new Request("http://localhost:3000/api/redirect", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: hotel.id, type: "hotel" }),
  }));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "This hotel result does not include a supported external provider link." });
});
