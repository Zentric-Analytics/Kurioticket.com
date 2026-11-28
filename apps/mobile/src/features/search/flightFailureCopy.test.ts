import assert from "node:assert/strict";
import test from "node:test";
import { mobileLocales } from "../../localization/mobileLocalizationCatalog";
import { flightFailureBody } from "./flightFailureCopy";
import { resolveFlightFailureKind } from "./flightResultsStateModel";
test("all supported locales distinguish timeout, network and response failure with fixed safe copy", () => {
  for (const { code } of mobileLocales) {
    const messages = ["timeout", "network", "response"].map(kind => flightFailureBody(kind as "timeout" | "network" | "response", code, "fallback"));
    assert.equal(new Set(messages).size, 3); assert.ok(messages.every(message => message.length > 10 && message !== "fallback"));
    assert.equal(flightFailureBody("unavailable", code, "localized fallback"), "localized fallback");
  }
});
test("UI deadline and transport errors map to safe presentation without discarding distinct internal codes", () => {
  assert.equal(resolveFlightFailureKind("ui-deadline"), "timeout");
  assert.equal(resolveFlightFailureKind("timeout"), "timeout");
  assert.equal(resolveFlightFailureKind("network"), "network");
  for (const code of ["invalid-json", "invalid-schema", "invalid-response"]) assert.equal(resolveFlightFailureKind(code), "response");
  assert.equal(resolveFlightFailureKind("private provider text"), "unavailable");
});
