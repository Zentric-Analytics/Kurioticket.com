import assert from "node:assert/strict";
import test from "node:test";
import { searchDetailDuration, searchDetailHeadline, searchDetailIdentityLabel, searchDetailOutcomeLabel } from "./adminSearchDetailPresentation";

test("search detail titles reflect product and available locations", () => {
  assert.equal(searchDetailHeadline({ product: "FLIGHT", origin: "LOS", destination: "LHR" }), "LOS → LHR");
  assert.equal(searchDetailHeadline({ product: "HOTEL", origin: null, destination: "London" }), "Hotels in London");
  assert.equal(searchDetailHeadline({ product: "CAR", origin: "Ibadan", destination: null }), "Cars in Ibadan");
  assert.equal(searchDetailHeadline({ product: "PACKAGE", origin: null, destination: null }), "Package search");
});

test("search outcomes, duration and identity are displayed without changing underlying records", () => {
  assert.equal(searchDetailOutcomeLabel("ZERO_RESULTS"), "No results");
  assert.equal(searchDetailOutcomeLabel("SUCCESS"), "Complete");
  assert.equal(searchDetailDuration(2450), "2.5s");
  assert.equal(searchDetailDuration(null), "—");
  assert.equal(searchDetailIdentityLabel("unattributed"), "Unattributed");
});
