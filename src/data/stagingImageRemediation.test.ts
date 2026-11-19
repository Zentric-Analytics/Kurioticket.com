import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { homeDiscoveryByRegion } from "./homeDiscovery";
import { popularDestinationsByMarket } from "./marketHomeContent";
import { imageRegistry } from "./images/imageRegistry";

const broken = /1675264671526-7fb10698431b|\/161902\/|1665039400840-b6b2a5786fef|\/7536261\//;
test("published route/destination content cannot emit the four retired image URLs", () => {
  for (const item of [...Object.values(homeDiscoveryByRegion).flat(), ...Object.values(popularDestinationsByMarket).flat()]) {
    assert.doesNotMatch(item.image, broken, item.id);
    assert.ok(item.imageAlt.trim(), item.id);
  }
  assert.doesNotMatch(readFileSync("src/components/results/FlightResultsClient.tsx", "utf8"), broken);
});
test("replacement destination assets are local valid WebP with recorded provenance", () => {
  for (const name of ["phoenix", "puerto-vallarta", "honolulu", "dallas", "dubai", "lisbon", "mombasa", "accra", "madrid", "istanbul", "bangkok", "san-jose"]) {
    const url = `/images/staging-remediation/${name}.webp`;
    const bytes = readFileSync(`public${url}`);
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    assert.ok(bytes.length > 1000);
    const registration = imageRegistry.find(row => row.url === url);
    assert.equal(registration?.source, "pexels");
    assert.equal(registration?.license, "Pexels License");
    assert.match(registration?.sourcePage ?? "", /^https:\/\/www\.pexels\.com\/photo\//);
    assert.equal(registration?.dimensions, "1200 x 800");
  }
});
