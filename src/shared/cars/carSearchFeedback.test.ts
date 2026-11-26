import assert from "node:assert/strict";
import test from "node:test";
import { CAR_SANDBOX_AGE_NOTICE, carUnsupportedCategory, carUnsupportedSearchMessage } from "./carSearchFeedback";

test("car error categories distinguish unsupported locations and rental options", () => {
  assert.equal(carUnsupportedCategory(["unsupported_location"]), "unsupported_location");
  assert.equal(carUnsupportedCategory(["unsupported_search"]), "unsupported_search");
  assert.equal(carUnsupportedCategory(["unsupported_search", "unsupported_location"]), "unsupported_search");
  assert.equal(carUnsupportedCategory([]), "unsupported_search");
  assert.equal(carUnsupportedCategory(["private upstream diagnostic"]), "unsupported_search");
  assert.equal(carUnsupportedCategory(["unsupported_location", "private upstream diagnostic"]), "unsupported_search");
  assert.equal(carUnsupportedCategory(["unsupported_location", undefined]), "unsupported_search");
});
test("only allowlisted location failures blame locations; arbitrary messages are never exposed", () => {
  assert.match(carUnsupportedSearchMessage("unsupported_location"), /rental locations/);
  for (const value of ["unsupported_search", undefined, null, "secret upstream error", { category: "unsupported_location" }]) {
    assert.match(carUnsupportedSearchMessage(value), /rental options/);
    assert.doesNotMatch(carUnsupportedSearchMessage(value), /secret|locations/);
  }
});
test("sandbox disclosure makes no age-specific eligibility or price claim", () => {
  assert.match(CAR_SANDBOX_AGE_NOTICE, /do not verify driver age, rental eligibility or age-related fees/);
});
