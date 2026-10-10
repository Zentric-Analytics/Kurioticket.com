import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("optional date comparisons wait for main inventory and never repeat selected date", () => {
  const source = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
  const effect = source.slice(source.indexOf("const generation = nearbyFareGenerationRef.current + 1"), source.indexOf("}, [body, currencyRates.rates, guidedMode, providerResults"));
  assert.match(effect, /if \(loading \|\| backgroundRefreshing\) return;/);
  assert.match(effect, /date !== body.departureDate &&/);
  assert.match(source, /const nearbyFareRequestConcurrency = 1;/);
  assert.ok(effect.indexOf("if (loading || backgroundRefreshing)") < effect.indexOf('fetch("/api/flights/search"'));
  assert.match(effect, /activeRequests.forEach\(\(request\) => request.controller.abort\(\)\)/);
});
