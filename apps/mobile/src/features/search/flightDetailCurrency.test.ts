import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailScreen = readFileSync(
  new URL("./ApprovedDetailScreen.tsx", import.meta.url).pathname,
  "utf8",
);

test("flight details resolves one shared display fare for every visible total", () => {
  assert.match(detailScreen, /resolveDisplayCurrencyContext\(\{/);
  assert.match(detailScreen, /travelApi\.currencyRates\(\)/);
  assert.match(
    detailScreen,
    /displayPrice\(result\.price, result\.currency, resolution\.resolvedCurrency, rates\)/,
  );

  const flightDetail = detailScreen.slice(
    detailScreen.indexOf("function FlightDetail"),
    detailScreen.indexOf("function HotelDetail"),
  );
  assert.equal(
    flightDetail.match(/\{formattedFare\}/g)?.length,
    3,
    "fare summary, provider card, and sticky total must share the same formatted fare",
  );
  assert.doesNotMatch(flightDetail, /money\(result\.currency, result\.price\)/);
});

test("flight results passes its numeric display fare into details", () => {
  const resultsScreen = readFileSync(
    new URL("./ApprovedResultsScreen.tsx", import.meta.url).pathname,
    "utf8",
  );
  assert.match(resultsScreen, /displayFare: JSON\.stringify\(fare\)/);
  assert.match(detailScreen, /passedFare\.providerAmount === result\.price/);
  assert.match(detailScreen, /passedFare\.providerCurrency === result\.currency\.toUpperCase\(\)/);
});
