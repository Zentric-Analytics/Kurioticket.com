import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { test } from "node:test";
import { presentSearchResults } from "./searchFailurePresentation";

const diagnosis = "KAYAK HTTP 403: synthetic provider authentication failure";

test("legacy diagnostic text never displaces valid flight, hotel or car results", () => {
  for (const product of ["flight", "hotel", "car"] as const) {
    const response = { status: "partial", warnings: [diagnosis] };
    assert.deepEqual(presentSearchResults(product, 1, response), { status: "ready", message: "" });
  }
  const olderHotel = { status: "unavailable", warningCategory: "provider_unavailable", warnings: [diagnosis] };
  assert.deepEqual(presentSearchResults("hotel", 1, olderHotel), { status: "ready", message: "" });
});

test("unavailable, unsupported and no-results outcomes stay distinct without displaying provider text", () => {
  const response = { status: "unavailable", warnings: [diagnosis] };
  for (const [product, label] of [["flight", "Flight"], ["hotel", "Hotel"], ["car", "Car"]] as const) {
    assert.deepEqual(presentSearchResults(product, 0, response), {
      status: "error", message: `${label} search is temporarily unavailable. Please try again.`,
    });
    assert.deepEqual(presentSearchResults(product, 0, { status: "empty" }), { status: "empty", message: "" });
  }
  assert.match(presentSearchResults("hotel", 0, { warningCategory: "unsupported_search" }).message, /change your search/);
});

test("native search screens use the safe presentation boundary, not API-supplied messages", () => {
  for (const file of ["ApprovedResultsScreen.tsx", "ApprovedCarResultsScreen.tsx"]) {
    const screen = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.match(screen, /setMessage\(presentation\.message\)/);
    assert.doesNotMatch(screen, /FlightProviderWarning|response\.warnings|setMessage\(error\.message/);
  }
});
