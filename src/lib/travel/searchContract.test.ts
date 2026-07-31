import assert from "node:assert/strict";
import test from "node:test";
import { classifyCars, classifyFlights, classifyHotels } from "@/lib/travel/searchContract";
import type { NormalizedCarResult } from "@/lib/cars/types";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";

test("Duffel inventory receives the website detail action without requiring a raw provider URL", () => {
  const flight = { id: "duffel-offer", provider: "Duffel" } as PublicFlightResult;
  const response = classifyFlights([flight], false, [], "request-1");
  assert.equal(response.status, "available");
  assert.equal(response.mode, "live");
  assert.deepEqual(response.results[0].searchPolicy.action, { kind: "internal-detail", href: "/flights/details/duffel-offer", enabled: true });
});

test("bookable and discovery hotels preserve distinct server-owned policy", () => {
  const live = { id: "live", provider: "Hotelbeds", inventoryKind: "bookable" } as PublicHotelResult;
  const discovery = { id: "discovery", provider: "Google Places", inventoryKind: "discovery" } as PublicHotelResult;
  const response = classifyHotels([live, discovery], false, [], "request-2");
  assert.equal(response.status, "partial");
  assert.equal(response.results[0].searchPolicy.bookable, true);
  assert.equal(response.results[1].searchPolicy.mode, "discovery");
  assert.equal(response.results[1].searchPolicy.bookable, false);
});

test("demo Cars remain available but never receive a provider checkout action", () => {
  const car = { id: "demo-car", isDemo: true, offers: [] } as unknown as NormalizedCarResult;
  const search = { pickupLocation: "LAX", dropoffLocation: "LAX", pickupDate: "2026-08-10", pickupTime: "10:00", dropoffDate: "2026-08-12", dropoffTime: "10:00", driverAge: "30" };
  const response = classifyCars([car], "demo", "available", "Kurioticket Demo Catalogue", search, "request-3");
  assert.equal(response.status, "available");
  assert.equal(response.results[0].searchPolicy.bookable, false);
  assert.equal(response.results[0].searchPolicy.action.kind, "internal-detail");
  assert.match(response.warnings[0], /Sample car listings/);
});

test("live Cars mode without an adapter remains unavailable", () => {
  const search = { pickupLocation: "LAX", dropoffLocation: "LAX", pickupDate: "2026-08-10", pickupTime: "10:00", dropoffDate: "2026-08-12", dropoffTime: "10:00", driverAge: "30" };
  assert.equal(classifyCars([], "live", "unavailable", "", search, "request-4").status, "unavailable");
});


test("demo hotel catalogue remains previewable but is not bookable", () => {
  const demo = { id: "demo", provider: "Catalogue", inventoryKind: "bookable", dataSource: "demo" } as PublicHotelResult;
  const response = classifyHotels([demo], true, [], "request-demo");
  assert.equal(response.mode, "demo");
  assert.equal(response.results[0].searchPolicy.mode, "demo");
  assert.equal(response.results[0].searchPolicy.bookable, false);
  assert.deepEqual(response.results[0].searchPolicy.action, { kind: "internal-detail", href: "/hotels/details/demo", enabled: true });
});
