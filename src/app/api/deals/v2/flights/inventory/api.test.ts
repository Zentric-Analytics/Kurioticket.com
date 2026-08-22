import assert from "node:assert/strict";
import test from "node:test";
import { DealsFlightInventoryError } from "@/services/travel/dealsFlightInventorySession";
import { inventoryFailure } from "./api";

test("invalid legacy inventory selection uses the typed HTTP 422 response", async () => {
  const response = inventoryFailure(
    new DealsFlightInventoryError("invalid-selection"),
  );
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    status: "error",
    code: "INVALID_SELECTION",
  });
});
