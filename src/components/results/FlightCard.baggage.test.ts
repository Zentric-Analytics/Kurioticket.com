import assert from "node:assert/strict";
import test from "node:test";

import { formatBaggageValue } from "./flightCardBaggage";

const t = (key: string) =>
  ({
    carryOnIncluded: "Carry-on included",
    checkProvider: "Check provider",
  })[key] ?? key;

test("desktop baggage fallback uses compact result-card copy", () => {
  assert.equal(
    formatBaggageValue("Baggage details not supplied by the provider", t),
    "Not supplied by provider",
  );
  assert.equal(
    formatBaggageValue("  BAGGAGE DETAILS NOT SUPPLIED BY THE PROVIDER  ", t),
    "Not supplied by provider",
  );
});

test("desktop baggage formatter preserves real allowances and existing fallbacks", () => {
  assert.equal(formatBaggageValue("1 checked bag up to 23 kg", t), "1 checked bag up to 23 kg");
  assert.equal(formatBaggageValue("Carry-on included", t), "Carry-on included");
  assert.equal(formatBaggageValue("Rules reviewed on the external provider", t), "Check provider");
});
