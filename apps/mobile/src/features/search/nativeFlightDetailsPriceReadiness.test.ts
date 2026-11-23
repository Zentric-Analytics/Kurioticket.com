import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/NativeFlightDetails.tsx", "utf8");

test("authoritative Flight Details does not wait for optional currency lookups", () => {
  const start = source.indexOf("const reload = useCallback");
  const end = source.indexOf("const selected = details?.fareChoices", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const lifecycle = source.slice(start, end);

  const currencyStart = lifecycle.indexOf("const currencyContext = Promise.all");
  const detailsStart = lifecycle.indexOf("travelApi.flightDetails(id");
  const loadedCommit = lifecycle.indexOf('setState("available")');
  const currencyContinuation = lifecycle.indexOf("currencyContext.then");

  assert.notEqual(currencyStart, -1);
  assert.notEqual(detailsStart, -1);
  assert.notEqual(loadedCommit, -1);
  assert.notEqual(currencyContinuation, -1);
  assert.ok(currencyStart < detailsStart, "currency work should still begin in parallel");
  assert.ok(loadedCommit < currencyContinuation, "authoritative Details must become available before optional currency work settles");
  assert.doesNotMatch(lifecycle, /await currencyContext/);
});

test("Pick your fare stays in a scoped loading state until display prices are ready", () => {
  assert.match(source, /const \[displayPricesReady,setDisplayPricesReady\]=useState\(false\)/);
  assert.match(source, /setDisplayPricesReady\(false\)/);
  assert.match(source, /setDisplayPricesReady\(true\)/);
  assert.match(source, /displayPricesReady\?<ScrollView accessibilityRole="radiogroup"/);
  assert.match(source, /testID="flight-details-fare-price-loading"/);
  assert.match(source, /accessibilityLabel="Loading fare prices"/);
  assert.match(source, /createFlightDetailFare\(choice\.offer\.price,choice\.offer\.currency,currency,exchange\)/);
  assert.doesNotMatch(source, />Total price<\/Text><Text[^>]*>—<\/Text>/);
});

test("price readiness keeps authoritative ID-only navigation and one shared FX resolution", () => {
  const navigation = readFileSync("src/features/search/flightDetailNavigation.ts", "utf8");
  assert.match(navigation, /id: result\.id/);
  assert.doesNotMatch(navigation, /displayFare|displayCurrencyContext|exchangeRates/);
  assert.equal((source.match(/travelApi\.currencyRates\(\)/g) ?? []).length, 1);
});
