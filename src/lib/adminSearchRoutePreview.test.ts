import assert from "node:assert/strict";
import test from "node:test";

import { searchRoutePreview } from "./adminSearchRoutePreview";

test("Search Records displays only the first five characters plus an ellipsis for longer route labels", () => {
  assert.equal(searchRoutePreview("Amsterdam, Netherlands"), "Amste…");
  assert.equal(searchRoutePreview("YEG → PVR"), "YEG →…");
  assert.equal(searchRoutePreview("Seattle"), "Seatt…");
  assert.equal(searchRoutePreview("Paris"), "Paris");
  assert.equal(searchRoutePreview("LAX"), "LAX");
  assert.equal(searchRoutePreview(""), "");
});

test("Search Records preview preserves complete Unicode characters", () => {
  assert.equal(searchRoutePreview("✈Amsterdam"), "✈Amst…");
});
