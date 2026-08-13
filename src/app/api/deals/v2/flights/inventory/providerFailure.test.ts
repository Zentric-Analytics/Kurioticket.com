import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { ProviderErrorCategory, ProviderResult } from "@/lib/types";
import {
  classifyDealsInventoryProviderFailure,
  logDealsInventoryProviderFailure,
} from "./providerFailure";

const failure = (
  errorCategory: ProviderErrorCategory,
  status: "failed" | "skipped" = "failed",
): ProviderResult<never> => ({
  provider: "Duffel",
  results: [],
  status,
  latencyMs: 123,
  error: `secret internal provider body off_sensitive ref_sensitive ${["duffel", "test", "secret"].join("_")}`,
  errorCategory,
  errorReason:
    errorCategory === "no_inventory"
      ? "provider_no_inventory"
      : errorCategory === "route_unavailable"
        ? "provider_route_unavailable"
        : errorCategory === "skipped"
          ? "provider_skipped"
          : "provider_failed",
});

test("inventory and route failures become truthful empty inventory", () => {
  for (const category of ["no_inventory", "route_unavailable"] as const) {
    assert.deepEqual(classifyDealsInventoryProviderFailure(failure(category)), {
      statusCode: 200,
      body: { status: "empty", code: "NO_INVENTORY", outboundChoices: [] },
    });
  }
});

test("infrastructure and skipped failures remain provider unavailable", () => {
  for (const category of [
    "timeout",
    "auth",
    "network",
    "server",
    "invalid_response",
    "failed",
  ] as const) {
    const response = classifyDealsInventoryProviderFailure(failure(category));
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.code, "PROVIDER_TEMPORARILY_UNAVAILABLE");
  }
  assert.equal(
    classifyDealsInventoryProviderFailure(failure("skipped", "skipped")).body
      .code,
    "PROVIDER_TEMPORARILY_UNAVAILABLE",
  );
});

test("browser failure contracts never leak provider diagnostics", () => {
  for (const result of [failure("timeout"), failure("skipped", "skipped")]) {
    const serialized = JSON.stringify(
      classifyDealsInventoryProviderFailure(result).body,
    );
    assert.doesNotMatch(
      serialized,
      /secret|off_sensitive|ref_sensitive|duffel_test|provider_failed|provider_skipped/,
    );
  }
});

test("server diagnostics include classifications but omit failed provider bodies", () => {
  const warning = mock.method(console, "warn", () => undefined);
  const result = failure("timeout");
  logDealsInventoryProviderFailure(result);
  assert.equal(warning.mock.callCount(), 1);
  const serialized = JSON.stringify(warning.mock.calls[0].arguments);
  assert.match(serialized, /Duffel|timeout|123/);
  assert.doesNotMatch(
    serialized,
    /secret internal provider body|off_sensitive/,
  );
  warning.mock.restore();
});
