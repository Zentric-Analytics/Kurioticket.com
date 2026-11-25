import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCarDirectionsUrl,
  buildGoogleCarMapEmbedUrl,
  buildGoogleCarStreetViewEmbedUrl,
  carPickupMapQuery,
} from "./carMap";

test("LHR map and directions use owned airport geography, never an ambiguous code or rental-desk coordinate",()=>{
 const query=carPickupMapQuery("LHR");assert(query);assert.match(query,/Heathrow/i);assert.match(query,/London/i);assert.match(query,/United Kingdom/i);
 assert.equal(new URL(buildCarDirectionsUrl("LHR")!).searchParams.get("destination"),query);
 assert.equal(carPickupMapQuery("QQQ"),null);
 assert.equal(carPickupMapQuery("Completely Different Place (LHR)"),"Completely Different Place (LHR)");
});

test("Google Cars map embeds the normalized pickup destination", () => {
  const value = buildGoogleCarMapEmbedUrl({
    pickupLocation: "  New   York, United States ",
    googleMapsEmbedApiKey: "maps-key",
  });
  assert.ok(value);
  const url = new URL(value);
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/embed/v1/place");
  assert.equal(url.searchParams.get("q"), "New York, United States");
  assert.equal(url.searchParams.get("key"), "maps-key");
  assert.equal(url.searchParams.get("zoom"), "13");
});

test("Google Cars map fails closed without configuration or a pickup destination", () => {
  assert.equal(buildGoogleCarMapEmbedUrl({ pickupLocation: "New York" }), null);
  assert.equal(buildGoogleCarMapEmbedUrl({ pickupLocation: " ", googleMapsEmbedApiKey: "key" }), null);
});

test("Google Cars Street View uses only validated coordinates and outdoor nearby imagery", () => {
  const value = buildGoogleCarStreetViewEmbedUrl({
    latitude: 48.85341,
    longitude: 2.3488,
    googleMapsEmbedApiKey: "maps-key",
  });
  assert.ok(value);
  const url = new URL(value);
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/embed/v1/streetview");
  assert.equal(url.searchParams.get("location"), "48.85341,2.3488");
  assert.equal(url.searchParams.get("key"), "maps-key");
  assert.equal(url.searchParams.get("pitch"), "0");
  assert.equal(url.searchParams.get("fov"), "80");
  assert.equal(url.searchParams.get("radius"), "250");
  assert.equal(url.searchParams.get("source"), "outdoor");
});

test("Google Cars Street View fails closed without a key or valid coordinates", () => {
  assert.equal(buildGoogleCarStreetViewEmbedUrl({ latitude: 48.8, longitude: 2.3 }), null);
  assert.equal(buildGoogleCarStreetViewEmbedUrl({ latitude: 91, longitude: 2.3, googleMapsEmbedApiKey: "key" }), null);
  assert.equal(buildGoogleCarStreetViewEmbedUrl({ latitude: 48.8, longitude: 181, googleMapsEmbedApiKey: "key" }), null);
});

test("Cars directions use the same normalized pickup destination", () => {
  const value = buildCarDirectionsUrl("  New   York, United States ");
  assert.ok(value);
  const url = new URL(value);
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/dir/");
  assert.equal(url.searchParams.get("destination"), "New York, United States");
});
