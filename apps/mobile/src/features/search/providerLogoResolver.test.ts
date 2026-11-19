import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { resolveTravelProviderLogo } from "./providerLogoResolver";

test("uses valid remote HTTPS metadata without provider-specific mappings", () => {
  assert.equal(
    resolveTravelProviderLogo("https://cdn.example/airline-a.svg"),
    "https://cdn.example/airline-a.svg",
  );
  assert.equal(
    resolveTravelProviderLogo("  https://cdn.example/provider-b.png  "),
    "https://cdn.example/provider-b.png",
  );
});

test("tries existing metadata in order and rejects unsafe or missing URLs", () => {
  assert.equal(
    resolveTravelProviderLogo("http://cdn.example/logo.png", "https://cdn.example/logo.svg"),
    "https://cdn.example/logo.svg",
  );
  assert.equal(resolveTravelProviderLogo(undefined, null, "", "data:image/png;base64,bad"), null);
});

test("providers retain the initial only as the shared image component's final fallback", () => {
  const providerLogo = readFileSync(resolve("src/features/search/ProviderLogo.tsx"), "utf8");
  assert.match(providerLogo, /fallbackCharacters=\{1\}/);
  assert.match(providerLogo, /logoUrl=\{logoUrl\}/);
});

test("flight Compare deals provider logos have mobile-web 64x28 and narrow 48x28 variants", () => {
  const providerLogo = readFileSync(resolve("src/features/search/ProviderLogo.tsx"), "utf8");
  const airlineLogo = readFileSync(resolve("src/features/search/AirlineLogo.tsx"), "utf8");

  assert.match(providerLogo, /"deal-card" \| "deal-card-compact"/);
  assert.match(providerLogo, /variant === "deal-card" \? "provider-deal" : variant === "deal-card-compact" \? "provider-deal-compact"/);
  assert.match(airlineLogo, /providerDeal:\s*\{[\s\S]*width: 64,[\s\S]*height: 28/);
  assert.match(airlineLogo, /providerDealCompact:\s*\{[\s\S]*width: 48,[\s\S]*height: 28/);
});

test("provider logos reuse the remote-image failure fallback used by flight results", () => {
  const providerLogo = readFileSync(resolve("src/features/search/ProviderLogo.tsx"), "utf8");
  const airlineLogo = readFileSync(resolve("src/features/search/AirlineLogo.tsx"), "utf8");
  const results = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");

  assert.match(providerLogo, /<AirlineLogo/);
  assert.equal(airlineLogo.match(/onError=\{\(\) => setFailedUrl\(visibleUrl\)\}/g)?.length, 2);
  assert.match(airlineLogo, /if \(!visibleUrl \|\| failed \|\| \(isSvgUrl\(visibleUrl\) && !allowRemoteSvg\)\)/);
  assert.match(airlineLogo, /resolveTravelProviderLogo\(logoUrl\)/);
  assert.match(results, /<AirlineLogo[\s\S]*logoUrl=\{result\.airlineLogo\}/);
});
