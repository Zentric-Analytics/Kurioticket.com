import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../../../next.config";
import {
  buildDealsModifyUrl,
  buildDealsResultsUrl,
  createDefaultDealsSearch,
} from "@/lib/deals/dealsSearchParams";
import {
  buildDealsJourneyUrl,
  getFirstDealsJourneyStage,
  validateDealsJourneyUrl,
} from "@/lib/deals/dealsJourneyRoutes";

test("Packages routes are canonical and legacy Deals routes redirect with nested paths", async () => {
  const redirects = await nextConfig.redirects!();
  assert.deepEqual(redirects, [
    {
      source: "/deals/:path*",
      destination: "/packages/:path*",
      permanent: true,
    },
  ]);
});

test("public route builders retain every serialized search parameter on Packages URLs", () => {
  const search = createDefaultDealsSearch();
  search.hotelDestination = "New York & Queens";
  search.flightOriginCode = "LHR";
  search.flightDestinationCode = "JFK";

  for (const href of [
    buildDealsModifyUrl(search),
    buildDealsResultsUrl(search),
    buildDealsJourneyUrl(getFirstDealsJourneyStage(search.mode), search),
  ]) {
    const url = new URL(href, "https://www.kurioticket.com");
    assert.match(url.pathname, /^\/packages(?:\/results|\/journey\/[^/]+)?$/);
    assert.equal(url.searchParams.get("hotelDestination"), "New York & Queens");
    assert.equal(url.searchParams.get("flightOriginCode"), "LHR");
    assert.equal(url.searchParams.get("flightDestinationCode"), "JFK");
  }
});

test("saved legacy journey links remain valid and normalize to Packages", () => {
  const query = "?mode=hotel-flight&hotelDestination=Paris&journeyId=saved-123";
  assert.equal(
    validateDealsJourneyUrl(`/deals/journey/hotel-results${query}`),
    `/packages/journey/hotel-results${query}`,
  );
});
