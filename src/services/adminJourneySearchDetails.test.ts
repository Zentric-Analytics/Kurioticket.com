import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { safeAdminJourneySearchDetails } from "./adminJourneySearchDetails";

test("Flight journey preserves actual submitted dates, party and cabin without raw query metadata", () => {
  const result = safeAdminJourneySearchDetails("FLIGHT", {
    tripType: "round-trip", departureDate: "2026-12-03", returnDate: "2026-12-11",
    adults: 2, children: 1, infants: 0, travelers: 3, cabinClass: "business",
    searchNetwork: { ipAddress: "127.0.0.1" }, operationalSessionId: "private",
  });
  assert.deepEqual(result, {
    product: "FLIGHT", tripType: "round-trip", departureDate: "2026-12-03", returnDate: "2026-12-11",
    adults: 2, children: 1, infants: 0, travelers: 3, cabinClass: "business",
  });
  assert.doesNotMatch(JSON.stringify(result), /127\.0\.0\.1|private|searchNetwork/);
});

test("Multi-city flight records only validated individual legs", () => {
  const result = safeAdminJourneySearchDetails("FLIGHT", {
    tripType: "multi-city",
    legs: [{ origin: "LHR", destination: "JFK", departureDate: "2026-12-03" },
      { origin: "JFK", destination: "LAX", departureDate: "2026-12-07" },
      { origin: "https://secret", destination: "LAX", departureDate: "2026-12-09" }],
  });
  assert.deepEqual(result?.product === "FLIGHT" ? result.legs : null, [
    { origin: "LHR", destination: "JFK", departureDate: "2026-12-03" },
    { origin: "JFK", destination: "LAX", departureDate: "2026-12-07" },
  ]);
});

test("Hotels expose dates, room and guest counts without leaking operational identity", () => {
  assert.deepEqual(safeAdminJourneySearchDetails("HOTEL", {
    checkIn: "2026-12-05", checkOut: "2026-12-10", rooms: 2,
    guests: 4, adults: 2, children: 2, visitorId: "secret",
  }), { product: "HOTEL", checkIn: "2026-12-05", checkOut: "2026-12-10",
    rooms: 2, guests: 4, adults: 2, children: 2 });
});

test("Cars expose pickup and return dates, times and driver age", () => {
  assert.deepEqual(safeAdminJourneySearchDetails("CAR", {
    pickupDate: "2026-12-01", pickupTime: "09:30", dropoffDate: "2026-12-05",
    dropoffTime: "17:45", driverAge: "35", providerToken: "secret",
  }), { product: "CAR", pickupDate: "2026-12-01", pickupTime: "09:30",
    dropoffDate: "2026-12-05", dropoffTime: "17:45", driverAge: "35" });
});

test("Old or malformed searches remain unknown instead of invented", () => {
  assert.equal(safeAdminJourneySearchDetails("FLIGHT", null), null);
  assert.equal(safeAdminJourneySearchDetails("PACKAGE", { departureDate: "2026-12-01" }), null);
  assert.deepEqual(safeAdminJourneySearchDetails("CAR", {
    pickupDate: "2026-02-31", pickupTime: "29:62", driverAge: "999", privateIp: "12.34.56.78",
  }), { product: "CAR" });
});

test("Admin journey reader never transports or renders raw SearchHistory.query", () => {
  const core = readFileSync("src/services/adminJourneyCore.ts", "utf8");
  const view = readFileSync("src/components/admin/JourneyEventHistory.tsx", "utf8");
  assert.match(core, /safeAdminJourneySearchDetails\(row\.searchProduct, row\.searchQuery\)/);
  assert.match(view, /searchCriteria\(event\.search\)/);
  assert.match(view, /Partial provider coverage \(results received\)/);
  assert.doesNotMatch(view, /JSON\.stringify\(event\.search\)/);
});
