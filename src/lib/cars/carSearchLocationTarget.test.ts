import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCarLocationTarget,
  serializeCarLocationTarget,
} from "./carSearchLocationTarget";
import type { SearchLocation } from "@/lib/locations/searchTarget";

const target: SearchLocation = {
  id: "airport:LHR",
  kind: "airport",
  primaryLabel: "London Heathrow Airport",
  supportingLabel: "London, United Kingdom",
  submittedValue: "London Heathrow Airport (LHR)",
  country: { code: "GB" },
  codes: { iata: "LHR" },
  providerBindings: [],
  verification: "verified",
  selectionToken: "a".repeat(64),
};

test("Cars location target round-trips through the results/details URL contract", () => {
  const serialized = serializeCarLocationTarget(target);
  assert.ok(serialized);
  assert.deepEqual(parseCarLocationTarget(serialized), target);
});

test("Cars location target parser fails closed for malformed or incomplete values", () => {
  assert.equal(parseCarLocationTarget(""), undefined);
  assert.equal(parseCarLocationTarget("not-json"), undefined);
  assert.equal(parseCarLocationTarget(JSON.stringify({ id: "only-an-id" })), undefined);
});

test("Cars location target parser strips fields outside the public search contract", () => {
  const parsed = parseCarLocationTarget(
    JSON.stringify({ ...target, rawProviderSecret: "must-not-survive" }),
  );
  assert.deepEqual(parsed, target);
  assert.equal("rawProviderSecret" in (parsed as Record<string, unknown>), false);
});
