import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/dashboard/trips/TripsManagementPage.tsx", "utf8");
const english = readFileSync("src/lib/i18n/en.ts", "utf8");

test("web My Trips uses the locale provider for every read-only itinerary surface", () => {
  assert.match(source, /useLocale\(\)/);
  for (const key of ["eyebrow", "description", "tabsAriaLabel", "loading", "error", "retry", "empty.title", "empty.body", "provider", "providerConfirmation", "providerConfirmed", "confirmedAt", "flightStatus", "flightStatusUnavailable", "flightStatusStale", "flightStatusUpdated", "estimatedDeparture", "estimatedArrival", "actualDeparture", "actualArrival", "travelers", "priceSnapshot", "priceUnavailable", "disclaimer", "manageWith", "noProviderUrl", "externalAriaLabel"]) {
    assert.match(source, new RegExp(`accountDashboard\\.trips\\.metasearch\\.${key.replace(".", "\\.")}`), key);
    assert.match(english, new RegExp(`accountDashboard\\.trips\\.metasearch\\.${key.replace(".", "\\.")}`), key);
  }
});

test("web My Trips has truthful external provider actions and no internal management flow", () => {
  assert.match(source, /target="_blank"/);
  assert.match(source, /rel="noopener noreferrer external"/);
  assert.match(source, /providerAction\.url/);
  assert.match(source, /providerConfirmationCode/);
  assert.doesNotMatch(source, /Find a reservation|dashboard\/trips\/lookup|View details|disabled/);
});


test("web My Trips surfaces verified partner confirmation and provider flight status without inventing availability", () => {
  assert.match(source, /trip\.providerConfirmed/);
  assert.match(source, /providerConfirmedAt/);
  assert.match(source, /\/api\/dashboard\/trips\/\$\{encodeURIComponent\(tripId\)\}\/flight-status/);
  assert.match(source, /!status\.dataAvailable/);
  assert.match(source, /status\.freshness === "stale"/);
  assert.match(source, /window\.setInterval\(refreshIfVisible, 60_000\)/);
  assert.match(source, /document\.visibilityState === "visible"/);
  assert.match(source, /visibilitychange/);
  assert.match(source, /trip\.tripType === "flight" && trip\.status === "upcoming"/);
  assert.doesNotMatch(source, /On time/);
});
