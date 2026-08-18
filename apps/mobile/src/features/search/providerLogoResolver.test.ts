import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { providerMatchesCarrier, resolveProviderLogo } from "./providerLogoResolver";

test("Duffel has no hardcoded provider asset", () => {
  assert.equal(resolveProviderLogo("Duffel"), null);
});

test("provider identity matching accepts carrier-branded suffixes", () => {
  assert.equal(providerMatchesCarrier("Duffel", "Duffel Airways"), true);
  assert.equal(providerMatchesCarrier(" duffel ", "DUFFEL AIRLINES"), true);
  assert.equal(providerMatchesCarrier("Duffel", "British Airways"), false);
});

test("unknown providers retain the initial fallback path", () => {
  assert.equal(resolveProviderLogo("Unknown Booking Partner"), null);

  const providerLogo = readFileSync(resolve("src/features/search/ProviderLogo.tsx"), "utf8");
  assert.match(providerLogo, /fallbackCharacters=\{1\}/);
  assert.match(providerLogo, /logoUrl=\{logoUrl \?\? resolveProviderLogo\(provider\)\}/);
});

test("provider logos reuse the remote-image failure fallback used by flight results", () => {
  const providerLogo = readFileSync(resolve("src/features/search/ProviderLogo.tsx"), "utf8");
  const airlineLogo = readFileSync(resolve("src/features/search/AirlineLogo.tsx"), "utf8");
  const results = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");

  assert.match(providerLogo, /<AirlineLogo/);
  assert.equal(airlineLogo.match(/onError=\{\(\) => setFailedUrl\(visibleUrl\)\}/g)?.length, 2);
  assert.match(airlineLogo, /if \(!visibleUrl \|\| failed\)/);
  assert.match(results, /<AirlineLogo[\s\S]*logoUrl=\{result\.airlineLogo\}/);
});
