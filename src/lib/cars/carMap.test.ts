import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCarDirectionsUrl,
  buildGoogleCarMapEmbedUrl,
} from "./carMap.ts";

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

test("Cars directions use the same normalized pickup destination", () => {
  const value = buildCarDirectionsUrl("  New   York, United States ");
  assert.ok(value);
  const url = new URL(value);
  assert.equal(url.origin + url.pathname, "https://www.google.com/maps/dir/");
  assert.equal(url.searchParams.get("destination"), "New York, United States");
});
