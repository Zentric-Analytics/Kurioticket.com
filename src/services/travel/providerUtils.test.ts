import assert from "node:assert/strict";
import test from "node:test";
import { ProviderResponseError, runProvider } from "./providerUtils";

test("typed response errors retain only sanitized diagnostics", async () => {
  const result = await runProvider("Duffel", async () => {
    throw new ProviderResponseError({
      code: "duffel_inventory_pruned_empty",
      counts: { graphOfferCount: 3, usableOfferCount: 1 },
    });
  });
  assert.equal(result.status, "failed");
  assert.equal(result.errorCategory, "invalid_response");
  assert.equal(result.errorReason, "provider_invalid_response");
  assert.deepEqual(result.diagnostic, {
    code: "duffel_inventory_pruned_empty",
    counts: { graphOfferCount: 3, usableOfferCount: 1 },
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /offer request|provider response/i,
  );
});
