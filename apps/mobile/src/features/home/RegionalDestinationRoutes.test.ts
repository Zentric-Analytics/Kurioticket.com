import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  regionalDestinationRoutes,
  regionalDestinationWebsiteContract,
} from "./RegionalDestinationRoutesData";

const homeSource = readFileSync(
  `${import.meta.dirname}/../flow/HomeFlowScreen.tsx`,
  "utf8",
);
const sectionSource = readFileSync(
  `${import.meta.dirname}/RegionalDestinationRoutes.tsx`,
  "utf8",
);

test("regional destination adapter identifies the website source and data contract", () => {
  assert.deepEqual(regionalDestinationWebsiteContract, {
    sourceFile: "src/app/page.tsx",
    componentName: "RegionalRouteCard",
    dataFile: "src/data/homeDiscovery.ts",
    selectorName: "getHomepageRegionalRouteCards",
    fallbackMarket: "NG",
    collapsible: false,
  });
});

test("complete website-defined NG fallback routes render in selector order", () => {
  assert.equal(regionalDestinationRoutes.length, 10);
  assert.deepEqual(
    regionalDestinationRoutes.map((route) => route.id),
    [
      "ng-los-kig",
      "ng-abv-cai",
      "ng-los-add",
      "ng-abv-fco",
      "ng-los-nrt",
      "ng-abv-mad",
      "ng-los-cpt",
      "ng-abv-rob",
      "fallback-nyc-lis",
      "fallback-lhr-ist",
    ],
  );
  assert.ok(regionalDestinationRoutes.every((route) => route.originCity && route.destinationCity && route.image.uri));
  assert.match(sectionSource, /regionalDestinationRoutes\.map/);
  assert.match(sectionSource, /Discover destinations from your region/);
});

test("shared Android and iOS homepage places the section after promos and before its navigation inset", () => {
  const promoIndex = homeSource.indexOf("<HomepageDealPromos />");
  const regionalIndex = homeSource.indexOf("<RegionalDestinationRoutes />");
  const scrollEndIndex = homeSource.indexOf("</ScrollView>", regionalIndex);

  assert.ok(promoIndex >= 0);
  assert.ok(regionalIndex > promoIndex);
  assert.ok(scrollEndIndex > regionalIndex);
  assert.match(homeSource, /content: \{ paddingHorizontal: 14, paddingBottom: 120, gap: 14 \}/);
  assert.doesNotMatch(homeSource, /Platform\.OS/);
});

test("route actions use the existing flight-results navigation without requests or location APIs", () => {
  assert.match(sectionSource, /discoverAdventureNavigation\(route\)/);
  assert.doesNotMatch(sectionSource, /\bfetch\s*\(|axios|mobileApi|travelApi/);
  assert.doesNotMatch(sectionSource, /Geolocation|Location|requestPermissions|GPS/);
});

test("the non-collapsible section exposes accessible actions and theme-aware fallback colors", () => {
  assert.match(sectionSource, /accessibilityRole="header"/);
  assert.match(sectionSource, /accessibilityRole="button"/);
  assert.match(sectionSource, /ft\.colors\.neutralImage/);
  assert.match(sectionSource, /ft\.colors\.textPrimary/);
  assert.doesNotMatch(sectionSource, /aria-expanded|accessibilityState=\{\{ expanded/);
});
