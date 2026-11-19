import assert from "node:assert/strict";
import test from "node:test";

import { adminHandoffRoutePreview } from "./adminHandoffRoutePreview";

test("Provider Handoffs route/property previews display ten characters and an ellipsis", () => {
  assert.equal(adminHandoffRoutePreview("10 Canal Park, Cambridge"), "10 Canal P…");
  assert.equal(adminHandoffRoutePreview("Amsterdam, Netherlands"), "Amsterdam,…");
  assert.equal(adminHandoffRoutePreview("JFK → LAX"), "JFK → LAX");
  assert.equal(adminHandoffRoutePreview("Dubai"), "Dubai");
  assert.equal(adminHandoffRoutePreview(""), "—");
  assert.equal(adminHandoffRoutePreview(null), "—");
});

test("Provider Handoffs previews count complete Unicode characters", () => {
  assert.equal(adminHandoffRoutePreview("✈Amsterdam, Netherlands"), "✈Amsterdam…");
});
